import { createClient } from '@/lib/supabase/server'
import { createHmac, randomBytes } from 'crypto'

/**
 * Webhook utilities for Phase API-3
 * Session 63 - API Keys and Webhooks
 *
 * Stores webhooks in tenants.settings.webhooks (no schema changes)
 */

export type Webhook = {
  id: string
  url: string
  events: string[] // e.g., ['lead.created', 'job.created']
  secret: string // For HMAC signing
  is_active: boolean
  description?: string
  created_at: string
  last_triggered_at?: string | null
  created_by?: string | null
}

export type WebhookEvent = {
  id: string
  event: string
  timestamp: string
  data: Record<string, unknown>
}

/**
 * Generate webhook secret
 */
export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(32).toString('hex')}`
}

/**
 * Sign webhook payload with HMAC-SHA256
 */
export function signWebhookPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = signWebhookPayload(payload, secret)
  return signature === expectedSignature
}

/**
 * Get webhooks for tenant
 */
export async function getTenantWebhooks(tenantId: string): Promise<Webhook[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single()

  if (error || !data) {
    return []
  }

  return (data.settings as { webhooks?: Webhook[] })?.webhooks || []
}

/**
 * Add webhook to tenant settings
 */
export async function addTenantWebhook(
  tenantId: string,
  url: string,
  events: string[],
  description?: string,
  createdBy?: string | null
): Promise<Webhook> {
  const newWebhook: Webhook = {
    id: randomBytes(16).toString('hex'),
    url,
    events,
    secret: generateWebhookSecret(),
    is_active: true,
    description,
    created_at: new Date().toISOString(),
    last_triggered_at: null,
    created_by: createdBy
  }

  const supabase = await createClient()

  const { data: tenant, error: fetchError } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single()

  if (fetchError || !tenant) {
    throw new Error('Failed to fetch tenant settings')
  }

  const currentWebhooks = (tenant.settings as { webhooks?: Webhook[] })?.webhooks || []
  const updatedWebhooks = [...currentWebhooks, newWebhook]

  const { error: updateError } = await supabase
    .from('tenants')
    .update({
      settings: {
        ...(tenant.settings as object),
        webhooks: updatedWebhooks
      }
    })
    .eq('id', tenantId)

  if (updateError) {
    throw new Error('Failed to add webhook')
  }

  return newWebhook
}

/**
 * Update webhook in tenant settings
 */
export async function updateTenantWebhook(
  tenantId: string,
  webhookId: string,
  updates: Partial<Pick<Webhook, 'url' | 'events' | 'is_active' | 'description'>>
): Promise<void> {
  const supabase = await createClient()

  const { data: tenant, error: fetchError } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single()

  if (fetchError || !tenant) {
    throw new Error('Failed to fetch tenant settings')
  }

  const currentWebhooks = (tenant.settings as { webhooks?: Webhook[] })?.webhooks || []
  const updatedWebhooks = currentWebhooks.map(w =>
    w.id === webhookId ? { ...w, ...updates } : w
  )

  const { error: updateError } = await supabase
    .from('tenants')
    .update({
      settings: {
        ...(tenant.settings as object),
        webhooks: updatedWebhooks
      }
    })
    .eq('id', tenantId)

  if (updateError) {
    throw new Error('Failed to update webhook')
  }
}

/**
 * Delete webhook from tenant settings
 */
export async function deleteTenantWebhook(tenantId: string, webhookId: string): Promise<void> {
  const supabase = await createClient()

  const { data: tenant, error: fetchError } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single()

  if (fetchError || !tenant) {
    throw new Error('Failed to fetch tenant settings')
  }

  const currentWebhooks = (tenant.settings as { webhooks?: Webhook[] })?.webhooks || []
  const updatedWebhooks = currentWebhooks.filter(w => w.id !== webhookId)

  const { error: updateError } = await supabase
    .from('tenants')
    .update({
      settings: {
        ...(tenant.settings as object),
        webhooks: updatedWebhooks
      }
    })
    .eq('id', tenantId)

  if (updateError) {
    throw new Error('Failed to delete webhook')
  }
}

/**
 * Trigger webhooks for an event
 */
export async function triggerWebhooks(
  tenantId: string,
  eventType: string,
  eventData: Record<string, unknown>
): Promise<void> {
  const webhooks = await getTenantWebhooks(tenantId)
  const activeWebhooks = webhooks.filter(w => w.is_active && w.events.includes(eventType))

  if (activeWebhooks.length === 0) {
    return
  }

  const event: WebhookEvent = {
    id: randomBytes(16).toString('hex'),
    event: eventType,
    timestamp: new Date().toISOString(),
    data: eventData
  }

  const payload = JSON.stringify(event)

  // Trigger all webhooks (in parallel, fire-and-forget)
  const promises = activeWebhooks.map(async (webhook) => {
    try {
      const signature = signWebhookPayload(payload, webhook.secret)

      await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': eventType,
          'X-Webhook-ID': event.id
        },
        body: payload
      })

      // Update last_triggered_at
      const supabase = await createClient()
      const { data: tenant } = await supabase
        .from('tenants')
        .select('settings')
        .eq('id', tenantId)
        .single()

      if (tenant) {
        const webhooks = (tenant.settings as { webhooks?: Webhook[] })?.webhooks || []
        const updatedWebhooks = webhooks.map(w =>
          w.id === webhook.id ? { ...w, last_triggered_at: new Date().toISOString() } : w
        )

        await supabase
          .from('tenants')
          .update({
            settings: {
              ...(tenant.settings as object),
              webhooks: updatedWebhooks
            }
          })
          .eq('id', tenantId)
      }
    } catch (error) {
      console.error(`[triggerWebhooks] Failed to send webhook ${webhook.id}:`, error)
      // Continue with other webhooks
    }
  })

  // Fire and forget
  await Promise.allSettled(promises)
}
