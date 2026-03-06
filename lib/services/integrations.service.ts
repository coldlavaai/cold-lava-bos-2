import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { IntegrationConnection } from '@/lib/api/types'
import {
  encryptCredentialsSafe,
  decryptCredentials,
} from '@/lib/security/credentials-encryption'

/**
 * Service for managing integration connections
 * Handles CRUD operations for tenant-specific integrations
 *
 * Session 91: Added credential encryption for new writes.
 * Encryption is applied automatically when INTEGRATION_CREDENTIALS_ENCRYPTION_KEY
 * is set in environment. All resolvers support both encrypted and plaintext formats
 * for backwards compatibility.
 */

/**
 * Get an active integration connection for a tenant
 */
export async function getIntegrationConnection(
  tenantId: string,
  integrationType: string
): Promise<IntegrationConnection | null> {
  // Use admin client to bypass RLS — this is always server-side and never exposed to clients
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('integration_connections')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('integration_type', integrationType)
    .eq('is_active', true)
    .single()

  if (error) {
    // Not finding a record is expected (no integration configured)
    if (error.code === 'PGRST116') {
      return null
    }
    console.error(`Error fetching integration ${integrationType}:`, error)
    return null
  }

  return data as IntegrationConnection
}

/**
 * Upsert an integration connection
 * Session 91: Automatically encrypts credentials if encryption is enabled
 */
export async function upsertIntegrationConnection(
  tenantId: string,
  integrationType: string,
  credentials: Record<string, unknown>,
  userId?: string
): Promise<IntegrationConnection | null> {
  const supabase = await createClient()

  // Check if an integration already exists
  const { data: existing } = await supabase
    .from('integration_connections')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('integration_type', integrationType)
    .single()

  // Session 91: Encrypt credentials before storing (if encryption enabled)
  const encryptedCredentials = encryptCredentialsSafe(credentials)

  const now = new Date().toISOString()
  const integrationData = {
    tenant_id: tenantId,
    integration_type: integrationType,
    credentials: encryptedCredentials,
    is_active: true,
    updated_at: now,
    updated_by: userId || null,
  }

  if (existing) {
    // Update existing integration
    const { data, error } = await supabase
      .from('integration_connections')
      .update(integrationData)
      .eq('id', existing.id)
      .select()
      .single()

    if (error) {
      console.error(`Error updating integration ${integrationType}:`, error)
      return null
    }

    return data as IntegrationConnection
  } else {
    // Insert new integration
    const { data, error } = await supabase
      .from('integration_connections')
      .insert({
        ...integrationData,
        created_at: now,
        created_by: userId || null,
      })
      .select()
      .single()

    if (error) {
      console.error(`Error creating integration ${integrationType}:`, error)
      return null
    }

    return data as IntegrationConnection
  }
}

/**
 * Resolve email credentials for a tenant
 * Priority: integration_connections > environment variables
 * Session 91: Supports both encrypted and plaintext credentials
 */
export async function resolveEmailCredentials(tenantId: string): Promise<{
  apiKey: string
  fromEmail: string
  fromName?: string
} | null> {
  // Try to get from integration_connections first
  const integration = await getIntegrationConnection(tenantId, 'sendgrid')

  if (integration && integration.credentials) {
    // Session 91: Decrypt credentials if encrypted
    const decrypted = decryptCredentials(
      integration.credentials as Record<string, unknown>
    )

    const creds = decrypted as {
      api_key?: string
      from_email?: string
      from_name?: string
    }

    if (creds.api_key && creds.from_email) {
      return {
        apiKey: creds.api_key,
        fromEmail: creds.from_email,
        fromName: creds.from_name,
      }
    }
  }

  // Fall back to environment variables
  const apiKey = process.env.SENDGRID_API_KEY
  const fromEmail = process.env.EMAIL_FROM_ADDRESS || process.env.SENDGRID_FROM_EMAIL

  if (apiKey && fromEmail) {
    return {
      apiKey,
      fromEmail,
      fromName: process.env.EMAIL_FROM_NAME,
    }
  }

  return null
}

/**
 * Resolve SMS credentials for a tenant
 * Priority: integration_connections > environment variables
 * Session 110: Env var fallback re-added as safety net for decryption failures
 */
export async function resolveSmsCredentials(tenantId: string): Promise<{
  accountSid: string
  authToken: string
  phoneNumber: string
  whatsappNumber?: string
} | null> {
  // Try integration_connections first
  const integration = await getIntegrationConnection(tenantId, 'twilio')

  if (integration && integration.credentials) {
    // Decrypt credentials if encrypted (returns {} on decryption failure)
    const decrypted = decryptCredentials(
      integration.credentials as Record<string, unknown>
    )

    const creds = decrypted as {
      account_sid?: string
      auth_token?: string
      phone_number?: string
      whatsapp_number?: string
    }

    if (creds.account_sid && creds.auth_token && creds.phone_number) {
      console.log('[SMS Credentials] Using credentials from integration_connections')
      return {
        accountSid: creds.account_sid,
        authToken: creds.auth_token,
        phoneNumber: creds.phone_number,
        whatsappNumber: creds.whatsapp_number,
      }
    }
  }

  // Fall back to environment variables (covers decryption failures and unconfigured tenants)
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim()
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim()
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER?.trim()
  const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER?.trim()

  if (accountSid && authToken && phoneNumber) {
    console.log('[SMS Credentials] Falling back to environment variables for tenant:', tenantId)
    return {
      accountSid,
      authToken,
      phoneNumber,
      whatsappNumber,
    }
  }

  return null
}

/**
 * Resolve OpenSolar credentials for a tenant
 * Priority: integration_connections > environment variables
 * Session 90: Added for OpenSolar integration
 * Session 91: Supports both encrypted and plaintext credentials
 */
export async function resolveOpenSolarCredentials(tenantId: string): Promise<{
  username?: string
  password?: string
  apiKey?: string
  organizationId?: string
  defaultProjectId?: string
} | null> {
  // Try to get from integration_connections first
  console.log('[OpenSolar Credentials] Looking up integration for tenant:', tenantId)
  const integration = await getIntegrationConnection(tenantId, 'opensolar')
  
  console.log('[OpenSolar Credentials] Integration found:', {
    found: !!integration,
    hasCredentials: !!integration?.credentials,
    isActive: integration?.is_active,
  })

  if (integration && integration.credentials) {
    // Session 91: Decrypt credentials if encrypted
    console.log('[OpenSolar Credentials] Raw credentials type:', typeof integration.credentials)
    console.log('[OpenSolar Credentials] Raw credentials keys:', Object.keys(integration.credentials as object))
    
    const decrypted = decryptCredentials(
      integration.credentials as Record<string, unknown>
    )
    
    console.log('[OpenSolar Credentials] Decrypted credentials keys:', Object.keys(decrypted as object || {}))

    const creds = decrypted as {
      username?: string
      password?: string
      api_key?: string
      organization_id?: string
      default_project_id?: string
    }
    
    console.log('[OpenSolar Credentials] Parsed creds:', {
      hasUsername: !!creds.username,
      hasPassword: !!creds.password,
      hasApiKey: !!creds.api_key,
      hasOrgId: !!creds.organization_id,
      orgId: creds.organization_id,
    })

    // Return if we have either username/password or api_key
    if (creds.username || creds.api_key) {
      return {
        username: creds.username,
        password: creds.password,
        apiKey: creds.api_key,
        organizationId: creds.organization_id,
        defaultProjectId: creds.default_project_id,
      }
    }
    
    console.log('[OpenSolar Credentials] No username or api_key found in decrypted credentials')
  }

  // Fall back to environment variables
  const username = process.env.OPENSOLAR_USERNAME
  const password = process.env.OPENSOLAR_PASSWORD
  const apiKey = process.env.OPENSOLAR_API_KEY
  const organizationId = process.env.OPENSOLAR_ORGANIZATION_ID
  const defaultProjectId = process.env.OPENSOLAR_DEFAULT_PROJECT_ID

  if (username || apiKey) {
    return {
      username,
      password,
      apiKey,
      organizationId,
      defaultProjectId,
    }
  }

  return null
}

/**
 * Resolve Stripe credentials for a tenant
 * Priority: integration_connections > environment variables
 * Session 90: Added for Stripe integration (stub)
 * Session 91: Supports both encrypted and plaintext credentials
 */
export async function resolveStripeCredentials(tenantId: string): Promise<{
  publishableKey: string
  secretKey: string
  webhookSecret?: string
} | null> {
  // Try to get from integration_connections first
  const integration = await getIntegrationConnection(tenantId, 'stripe')

  if (integration && integration.credentials) {
    // Session 91: Decrypt credentials if encrypted
    const decrypted = decryptCredentials(
      integration.credentials as Record<string, unknown>
    )

    const creds = decrypted as {
      publishable_key?: string
      secret_key?: string
      webhook_secret?: string
    }

    if (creds.publishable_key && creds.secret_key) {
      return {
        publishableKey: creds.publishable_key,
        secretKey: creds.secret_key,
        webhookSecret: creds.webhook_secret,
      }
    }
  }

  // Fall back to environment variables
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY
  const secretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (publishableKey && secretKey) {
    return {
      publishableKey,
      secretKey,
      webhookSecret,
    }
  }

  return null
}

/**
 * Resolve Google Calendar credentials for a tenant
 * Priority: integration_connections only (no env fallback)
 * Session 91: Added for Google Calendar OAuth integration
 */
export async function resolveGoogleCalendarCredentials(tenantId: string): Promise<{
  accessToken: string
  refreshToken?: string
  expiresAt: string
  scopes: string
} | null> {
  // Get from integration_connections
  const integration = await getIntegrationConnection(tenantId, 'google_calendar')

  if (integration && integration.credentials) {
    // Session 91: Decrypt credentials if encrypted
    const decrypted = decryptCredentials(
      integration.credentials as Record<string, unknown>
    )

    const creds = decrypted as {
      access_token?: string
      refresh_token?: string
      expires_at?: string
      scopes?: string
    }

    if (creds.access_token && creds.expires_at) {
      return {
        accessToken: creds.access_token,
        refreshToken: creds.refresh_token,
        expiresAt: creds.expires_at,
        scopes: creds.scopes || '',
      }
    }
  }

  return null
}

/**
 * Refresh Google Calendar access token if expired
 * Session 91: Token refresh for Google Calendar
 */
export async function refreshGoogleCalendarToken(
  tenantId: string,
  userId?: string
): Promise<boolean> {
  const integration = await getIntegrationConnection(tenantId, 'google_calendar')

  if (!integration || !integration.credentials) {
    return false
  }

  // Decrypt existing credentials
  const decrypted = decryptCredentials(
    integration.credentials as Record<string, unknown>
  )

  const creds = decrypted as {
    access_token?: string
    refresh_token?: string
    expires_at?: string
    scopes?: string
  }

  if (!creds.refresh_token) {
    console.error('[Google Calendar] No refresh token available')
    return false
  }

  // Exchange refresh token for new access token
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error('[Google Calendar] OAuth not configured')
    return false
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: creds.refresh_token,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      console.error('[Google Calendar] Token refresh failed:', error)
      return false
    }

    const tokens = await response.json() as {
      access_token: string
      expires_in: number
      scope: string
      token_type: string
    }

    // Update credentials with new access token
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    const updatedCredentials = {
      access_token: tokens.access_token,
      refresh_token: creds.refresh_token, // Keep existing refresh token
      expires_at: expiresAt,
      scopes: tokens.scope,
      token_type: tokens.token_type,
    }

    await upsertIntegrationConnection(
      tenantId,
      'google_calendar',
      updatedCredentials,
      userId
    )

    return true
  } catch (error) {
    console.error('[Google Calendar] Token refresh error:', error)
    return false
  }
}

/**
 * Delete an integration connection (disconnect)
 * Session 90: Allows tenants to disconnect integrations
 */
export async function deleteIntegrationConnection(
  tenantId: string,
  integrationType: string
): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('integration_connections')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('integration_type', integrationType)

  if (error) {
    console.error(`Error deleting integration ${integrationType}:`, error)
    return false
  }

  return true
}

/**
 * Resolve Otter.ai OAuth credentials for a tenant
 * Automatically refreshes access token if expired
 * Session 94: Otter OAuth integration
 */
export async function resolveOtterCredentials(tenantId: string): Promise<{
  accessToken: string
  otterUserId?: string
  otterEmail?: string
} | null> {
  const integration = await getIntegrationConnection(tenantId, 'otter')

  if (!integration) {
    return null
  }

  // Check if we have OAuth access token
  if (!integration.oauth_access_token || !integration.oauth_refresh_token) {
    // Check if we have it in credentials (legacy)
    const decrypted = decryptCredentials(integration.credentials as Record<string, unknown>)
    const creds = decrypted as {
      access_token?: string
      refresh_token?: string
      otter_user_id?: string
      otter_email?: string
    }

    if (creds.access_token) {
      return {
        accessToken: creds.access_token,
        otterUserId: creds.otter_user_id,
        otterEmail: creds.otter_email,
      }
    }

    return null
  }

  // Check if token is expired or about to expire (within 5 minutes)
  const now = Date.now()
  const expiresAt = integration.oauth_expires_at ? new Date(integration.oauth_expires_at).getTime() : 0
  const needsRefresh = expiresAt - now < 5 * 60 * 1000 // 5 minutes buffer

  if (needsRefresh && integration.oauth_refresh_token) {
    // Refresh the token
    try {
      const { refreshOtterAccessToken } = await import('./otter-api.service')
      const tokens = await refreshOtterAccessToken(integration.oauth_refresh_token)

      // Update tokens in database
      const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      const supabase = await createClient()

      await supabase
        .from('integration_connections')
        .update({
          oauth_access_token: tokens.access_token,
          oauth_refresh_token: tokens.refresh_token,
          oauth_expires_at: newExpiresAt,
          last_verified_at: new Date().toISOString(),
          last_error: null,
        })
        .eq('id', integration.id)

      console.log('[Otter] Successfully refreshed access token for tenant:', tenantId)

      // Get user info from credentials
      const decrypted = decryptCredentials(integration.credentials as Record<string, unknown>)
      const creds = decrypted as {
        otter_user_id?: string
        otter_email?: string
      }

      return {
        accessToken: tokens.access_token,
        otterUserId: creds.otter_user_id,
        otterEmail: creds.otter_email,
      }
    } catch (error) {
      console.error('[Otter] Failed to refresh access token:', error)

      // Update error in database
      const supabase = await createClient()
      await supabase
        .from('integration_connections')
        .update({
          last_error: error instanceof Error ? error.message : 'Token refresh failed',
        })
        .eq('id', integration.id)

      return null
    }
  }

  // Token is still valid
  const decrypted = decryptCredentials(integration.credentials as Record<string, unknown>)
  const creds = decrypted as {
    otter_user_id?: string
    otter_email?: string
  }

  return {
    accessToken: integration.oauth_access_token,
    otterUserId: creds.otter_user_id,
    otterEmail: creds.otter_email,
  }
}

/**
 * Resolve Xero credentials for a tenant
 * Session 109: Xero OAuth Integration
 */
export async function resolveXeroCredentials(tenantId: string): Promise<{
  accessToken: string
  refreshToken?: string
  expiresAt: string
  xeroTenantId?: string
  xeroTenantName?: string
} | null> {
  const integration = await getIntegrationConnection(tenantId, 'xero')

  if (integration && integration.credentials) {
    const decrypted = decryptCredentials(
      integration.credentials as Record<string, unknown>
    )

    const creds = decrypted as {
      access_token?: string
      refresh_token?: string
      expires_at?: string
      xero_tenant_id?: string
      xero_tenant_name?: string
    }

    if (creds.access_token && creds.expires_at) {
      return {
        accessToken: creds.access_token,
        refreshToken: creds.refresh_token,
        expiresAt: creds.expires_at,
        xeroTenantId: creds.xero_tenant_id,
        xeroTenantName: creds.xero_tenant_name,
      }
    }
  }

  return null
}

/**
 * Refresh Xero access token if expired
 * Session 109: Xero OAuth token refresh
 */
export async function refreshXeroToken(
  tenantId: string,
  userId?: string
): Promise<{
  accessToken: string
  xeroTenantId?: string
  xeroTenantName?: string
} | null> {
  const integration = await getIntegrationConnection(tenantId, 'xero')

  if (!integration || !integration.credentials) {
    return null
  }

  const decrypted = decryptCredentials(
    integration.credentials as Record<string, unknown>
  )

  const creds = decrypted as {
    access_token?: string
    refresh_token?: string
    expires_at?: string
    xero_tenant_id?: string
    xero_tenant_name?: string
  }

  if (!creds.refresh_token) {
    console.error('[Xero] No refresh token available')
    return null
  }

  // Check if token is expired (with 5 min buffer)
  const expiresAt = new Date(creds.expires_at || 0)
  const now = new Date()
  const bufferMs = 5 * 60 * 1000

  if (expiresAt.getTime() - bufferMs > now.getTime()) {
    // Token still valid
    return {
      accessToken: creds.access_token!,
      xeroTenantId: creds.xero_tenant_id,
      xeroTenantName: creds.xero_tenant_name,
    }
  }

  // Token expired, refresh it
  const clientId = process.env.XERO_CLIENT_ID
  const clientSecret = process.env.XERO_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error('[Xero] OAuth not configured')
    return null
  }

  try {
    const response = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: creds.refresh_token,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[Xero] Token refresh failed:', errorData)
      
      const supabase = await createClient()
      await supabase
        .from('integration_connections')
        .update({
          last_error: 'Token refresh failed - reconnection required',
          is_active: false,
        })
        .eq('id', integration.id)
      
      return null
    }

    const tokens = await response.json() as {
      access_token: string
      refresh_token?: string
      expires_in: number
    }

    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Update stored credentials
    const newCredentials = {
      ...creds,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || creds.refresh_token,
      expires_at: newExpiresAt,
    }

    await upsertIntegrationConnection(tenantId, 'xero', newCredentials, userId)

    console.log('[Xero] Successfully refreshed access token for tenant:', tenantId)

    return {
      accessToken: tokens.access_token,
      xeroTenantId: creds.xero_tenant_id,
      xeroTenantName: creds.xero_tenant_name,
    }
  } catch (error) {
    console.error('[Xero] Failed to refresh access token:', error)

    const supabase = await createClient()
    await supabase
      .from('integration_connections')
      .update({
        last_error: error instanceof Error ? error.message : 'Token refresh failed',
      })
      .eq('id', integration.id)

    return null
  }
}

/**
 * Resolve QuickBooks credentials for a tenant
 * Session 109: QuickBooks OAuth Integration
 */
export async function resolveQuickBooksCredentials(tenantId: string): Promise<{
  accessToken: string
  refreshToken?: string
  expiresAt: string
  realmId?: string
  companyName?: string
} | null> {
  const integration = await getIntegrationConnection(tenantId, 'quickbooks')

  if (integration && integration.credentials) {
    const decrypted = decryptCredentials(
      integration.credentials as Record<string, unknown>
    )

    const creds = decrypted as {
      access_token?: string
      refresh_token?: string
      expires_at?: string
      realm_id?: string
      company_name?: string
    }

    if (creds.access_token && creds.expires_at) {
      return {
        accessToken: creds.access_token,
        refreshToken: creds.refresh_token,
        expiresAt: creds.expires_at,
        realmId: creds.realm_id,
        companyName: creds.company_name,
      }
    }
  }

  return null
}

/**
 * Refresh QuickBooks access token if expired
 * Session 109: QuickBooks OAuth token refresh
 */
export async function refreshQuickBooksToken(
  tenantId: string,
  userId?: string
): Promise<{
  accessToken: string
  realmId?: string
  companyName?: string
} | null> {
  const integration = await getIntegrationConnection(tenantId, 'quickbooks')

  if (!integration || !integration.credentials) {
    return null
  }

  const decrypted = decryptCredentials(
    integration.credentials as Record<string, unknown>
  )

  const creds = decrypted as {
    access_token?: string
    refresh_token?: string
    expires_at?: string
    realm_id?: string
    company_name?: string
    refresh_token_expires_at?: string
  }

  if (!creds.refresh_token) {
    console.error('[QuickBooks] No refresh token available')
    return null
  }

  // Check if token is expired (with 5 min buffer)
  const expiresAt = new Date(creds.expires_at || 0)
  const now = new Date()
  const bufferMs = 5 * 60 * 1000

  if (expiresAt.getTime() - bufferMs > now.getTime()) {
    // Token still valid
    return {
      accessToken: creds.access_token!,
      realmId: creds.realm_id,
      companyName: creds.company_name,
    }
  }

  // Token expired, refresh it
  const clientId = process.env.QUICKBOOKS_CLIENT_ID
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error('[QuickBooks] OAuth not configured')
    return null
  }

  try {
    const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: creds.refresh_token,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[QuickBooks] Token refresh failed:', errorData)
      
      const supabase = await createClient()
      await supabase
        .from('integration_connections')
        .update({
          last_error: 'Token refresh failed - reconnection required',
          is_active: false,
        })
        .eq('id', integration.id)
      
      return null
    }

    const tokens = await response.json() as {
      access_token: string
      refresh_token?: string
      expires_in: number
      x_refresh_token_expires_in?: number
    }

    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Update stored credentials
    const newCredentials = {
      ...creds,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || creds.refresh_token,
      expires_at: newExpiresAt,
      refresh_token_expires_at: tokens.x_refresh_token_expires_in
        ? new Date(Date.now() + tokens.x_refresh_token_expires_in * 1000).toISOString()
        : creds.refresh_token_expires_at,
    }

    await upsertIntegrationConnection(tenantId, 'quickbooks', newCredentials, userId)

    console.log('[QuickBooks] Successfully refreshed access token for tenant:', tenantId)

    return {
      accessToken: tokens.access_token,
      realmId: creds.realm_id,
      companyName: creds.company_name,
    }
  } catch (error) {
    console.error('[QuickBooks] Failed to refresh access token:', error)

    const supabase = await createClient()
    await supabase
      .from('integration_connections')
      .update({
        last_error: error instanceof Error ? error.message : 'Token refresh failed',
      })
      .eq('id', integration.id)

    return null
  }
}
