import { createClient } from '@/lib/supabase/server'
import { createHash, randomBytes } from 'crypto'

/**
 * API Key utilities for Phase API-3
 * Session 63 - API Keys and Webhooks
 *
 * Stores API keys in tenants.settings.api_keys (no schema changes)
 */

export type ApiKey = {
  id: string
  name: string
  key_prefix: string // First 8 chars for identification
  key_hash: string // SHA-256 hash of full key
  created_at: string
  last_used_at: string | null
  created_by: string | null
}

/**
 * Generate a new API key
 * Format: bos_live_[32 random hex chars]
 */
export function generateApiKey(): { key: string; keyPrefix: string; keyHash: string } {
  const randomPart = randomBytes(16).toString('hex') // 32 hex chars
  const key = `bos_live_${randomPart}`
  const keyPrefix = key.substring(0, 16) // bos_live_XXXXXXXX
  const keyHash = hashApiKey(key)

  return { key, keyPrefix, keyHash }
}

/**
 * Hash an API key using SHA-256
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

/**
 * Validate API key format
 */
export function isValidApiKeyFormat(key: string): boolean {
  return /^bos_live_[a-f0-9]{32}$/.test(key)
}

/**
 * Verify API key against tenant settings
 * Returns tenant_id if valid, null otherwise
 */
export async function verifyApiKey(apiKey: string): Promise<{ tenantId: string; apiKeyId: string } | null> {
  if (!isValidApiKeyFormat(apiKey)) {
    return null
  }

  const keyHash = hashApiKey(apiKey)
  const supabase = await createClient()

  // Query all tenants to find matching API key
  // Note: Using service role would be better, but we'll use current client
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('id, settings')

  if (error || !tenants) {
    console.error('[verifyApiKey] Error fetching tenants:', error)
    return null
  }

  // Search for matching API key in tenant settings
  for (const tenant of tenants) {
    const apiKeys = (tenant.settings as { api_keys?: ApiKey[] })?.api_keys || []

    const matchingKey = apiKeys.find(k => k.key_hash === keyHash)
    if (matchingKey) {
      // Update last_used_at
      const updatedKeys = apiKeys.map(k =>
        k.id === matchingKey.id
          ? { ...k, last_used_at: new Date().toISOString() }
          : k
      )

      // Update tenant settings
      await supabase
        .from('tenants')
        .update({
          settings: {
            ...(tenant.settings as object),
            api_keys: updatedKeys
          }
        })
        .eq('id', tenant.id)

      return {
        tenantId: tenant.id,
        apiKeyId: matchingKey.id
      }
    }
  }

  return null
}

/**
 * Get API keys for a tenant
 */
export async function getTenantApiKeys(tenantId: string): Promise<ApiKey[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single()

  if (error || !data) {
    return []
  }

  return (data.settings as { api_keys?: ApiKey[] })?.api_keys || []
}

/**
 * Add API key to tenant settings
 */
export async function addTenantApiKey(
  tenantId: string,
  name: string,
  createdBy: string | null
): Promise<{ key: string; apiKey: ApiKey }> {
  const { key, keyPrefix, keyHash } = generateApiKey()

  const newApiKey: ApiKey = {
    id: randomBytes(16).toString('hex'),
    name,
    key_prefix: keyPrefix,
    key_hash: keyHash,
    created_at: new Date().toISOString(),
    last_used_at: null,
    created_by: createdBy
  }

  const supabase = await createClient()

  // Get current settings
  const { data: tenant, error: fetchError } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single()

  if (fetchError || !tenant) {
    throw new Error('Failed to fetch tenant settings')
  }

  const currentApiKeys = (tenant.settings as { api_keys?: ApiKey[] })?.api_keys || []
  const updatedApiKeys = [...currentApiKeys, newApiKey]

  // Update settings
  const { error: updateError } = await supabase
    .from('tenants')
    .update({
      settings: {
        ...(tenant.settings as object),
        api_keys: updatedApiKeys
      }
    })
    .eq('id', tenantId)

  if (updateError) {
    throw new Error('Failed to add API key')
  }

  return { key, apiKey: newApiKey }
}

/**
 * Delete API key from tenant settings
 */
export async function deleteTenantApiKey(tenantId: string, apiKeyId: string): Promise<void> {
  const supabase = await createClient()

  // Get current settings
  const { data: tenant, error: fetchError } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single()

  if (fetchError || !tenant) {
    throw new Error('Failed to fetch tenant settings')
  }

  const currentApiKeys = (tenant.settings as { api_keys?: ApiKey[] })?.api_keys || []
  const updatedApiKeys = currentApiKeys.filter(k => k.id !== apiKeyId)

  // Update settings
  const { error: updateError } = await supabase
    .from('tenants')
    .update({
      settings: {
        ...(tenant.settings as object),
        api_keys: updatedApiKeys
      }
    })
    .eq('id', tenantId)

  if (updateError) {
    throw new Error('Failed to delete API key')
  }
}
