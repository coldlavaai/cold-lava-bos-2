import { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyApiKey } from '@/lib/auth/api-key'

/**
 * Sets the tenant_id session variable for RLS policies
 * This must be called before any queries that rely on current_tenant_id()
 */
export async function setTenantContext(
  supabase: SupabaseClient,
  tenantId: string
): Promise<void> {
  // Use PostgreSQL's set_config to set the session variable
  const { error } = await supabase.rpc('exec_sql', {
    sql: `SELECT set_config('app.tenant_id', '${tenantId}', false)`,
  })

  if (error) {
    console.error('Error setting tenant context:', error)
    throw error
  }
}

/**
 * Gets the tenant_id from headers (API key) or cookies (session)
 * Session 63 - Phase API-3: Added API key support
 */
export async function getTenantIdFromHeaders(headers: Headers): Promise<string | null> {
  // Check for API key first (X-API-Key header)
  const apiKey = headers.get('x-api-key')
  if (apiKey) {
    const result = await verifyApiKey(apiKey)
    if (result) {
      return result.tenantId
    }
    // Invalid API key - return null, will fail auth check
    return null
  }

  // Fall back to cookie-based session auth
  const cookieStore = await cookies()
  return cookieStore.get('sb-tenant-id')?.value ?? null
}

/**
 * Gets the user_id from cookies (set by middleware)
 */
export async function getUserIdFromHeaders(_headers: Headers): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('sb-user-id')?.value ?? null
}

/**
 * Gets the user role from cookies (set by middleware)
 */
export async function getUserRoleFromHeaders(_headers: Headers): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('sb-user-role')?.value ?? null
}
