import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

interface IntegrationHealth {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unconfigured'
  message: string
  lastChecked: string
  responseTimeMs?: number
}

interface HealthCheckResult {
  overall: 'healthy' | 'degraded' | 'unhealthy'
  integrations: IntegrationHealth[]
  checkedAt: string
}

/**
 * GET /api/integrations/health
 * Test all external integrations and return their health status
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    const integrations: IntegrationHealth[] = []

    // 1. Check GetAddress.io (Postcode Lookup)
    integrations.push(await checkGetAddress())

    // 2. Check Twilio (SMS/WhatsApp)
    integrations.push(await checkTwilio(supabase, tenantId))

    // 3. Check SendGrid (Email)
    integrations.push(await checkSendGrid(supabase, tenantId))

    // 4. Check Google (Calendar) - basic connectivity
    integrations.push(await checkGoogleCalendar(supabase, tenantId))

    // Calculate overall status
    const hasUnhealthy = integrations.some(i => i.status === 'unhealthy')
    const hasDegraded = integrations.some(i => i.status === 'degraded')
    const overall = hasUnhealthy ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy'

    const result: HealthCheckResult = {
      overall,
      integrations,
      checkedAt: new Date().toISOString(),
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in GET /api/integrations/health:', error)
    return NextResponse.json(
      { error: 'Failed to check integration health' },
      { status: 500 }
    )
  }
}

/**
 * Check GetAddress.io API health
 */
async function checkGetAddress(): Promise<IntegrationHealth> {
  const name = 'GetAddress.io (Postcode Lookup)'
  const apiKey = process.env.GETADDRESS_API_KEY

  if (!apiKey) {
    return {
      name,
      status: 'unconfigured',
      message: 'API key not configured',
      lastChecked: new Date().toISOString(),
    }
  }

  try {
    const start = Date.now()
    // Use a known valid postcode for testing
    const response = await fetch(
      `https://api.getaddress.io/autocomplete/SW1A%201AA?api-key=${apiKey.trim()}&all=true`,
      { method: 'GET', headers: { 'Accept': 'application/json' } }
    )
    const responseTimeMs = Date.now() - start

    if (response.status === 401) {
      return {
        name,
        status: 'unhealthy',
        message: 'API key rejected - check key in GetAddress.io dashboard',
        lastChecked: new Date().toISOString(),
        responseTimeMs,
      }
    }

    if (response.status === 429) {
      return {
        name,
        status: 'degraded',
        message: 'Rate limit exceeded',
        lastChecked: new Date().toISOString(),
        responseTimeMs,
      }
    }

    if (!response.ok) {
      return {
        name,
        status: 'unhealthy',
        message: `API error: ${response.status}`,
        lastChecked: new Date().toISOString(),
        responseTimeMs,
      }
    }

    return {
      name,
      status: responseTimeMs > 2000 ? 'degraded' : 'healthy',
      message: responseTimeMs > 2000 ? 'Slow response' : 'Operational',
      lastChecked: new Date().toISOString(),
      responseTimeMs,
    }
  } catch (error) {
    return {
      name,
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Connection failed',
      lastChecked: new Date().toISOString(),
    }
  }
}

/**
 * Check Twilio API health
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkTwilio(supabase: any, tenantId: string): Promise<IntegrationHealth> {
  const name = 'Twilio (SMS/WhatsApp)'

  try {
    const { data: connection } = await supabase
      .from('integration_connections')
      .select('credentials, is_active')
      .eq('tenant_id', tenantId)
      .eq('integration_type', 'twilio')
      .single()

    if (!connection) {
      return {
        name,
        status: 'unconfigured',
        message: 'Not configured',
        lastChecked: new Date().toISOString(),
      }
    }

    const creds = connection.credentials as {
      account_sid?: string
      auth_token?: string
    }

    if (!creds.account_sid || !creds.auth_token) {
      return {
        name,
        status: 'unhealthy',
        message: 'Missing credentials',
        lastChecked: new Date().toISOString(),
      }
    }

    // Test Twilio API with account lookup
    const start = Date.now()
    const auth = Buffer.from(`${creds.account_sid}:${creds.auth_token}`).toString('base64')
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${creds.account_sid}.json`,
      {
        method: 'GET',
        headers: { 'Authorization': `Basic ${auth}` },
      }
    )
    const responseTimeMs = Date.now() - start

    if (response.status === 401) {
      return {
        name,
        status: 'unhealthy',
        message: 'Invalid credentials',
        lastChecked: new Date().toISOString(),
        responseTimeMs,
      }
    }

    if (!response.ok) {
      return {
        name,
        status: 'unhealthy',
        message: `API error: ${response.status}`,
        lastChecked: new Date().toISOString(),
        responseTimeMs,
      }
    }

    const data = await response.json()
    if (data.status === 'suspended') {
      return {
        name,
        status: 'unhealthy',
        message: 'Account suspended',
        lastChecked: new Date().toISOString(),
        responseTimeMs,
      }
    }

    return {
      name,
      status: connection.is_active ? 'healthy' : 'degraded',
      message: connection.is_active ? 'Operational' : 'Configured but disabled',
      lastChecked: new Date().toISOString(),
      responseTimeMs,
    }
  } catch (error) {
    return {
      name,
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Check failed',
      lastChecked: new Date().toISOString(),
    }
  }
}

/**
 * Check SendGrid API health
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkSendGrid(supabase: any, tenantId: string): Promise<IntegrationHealth> {
  const name = 'SendGrid (Email)'

  try {
    const { data: connection } = await supabase
      .from('integration_connections')
      .select('credentials, is_active')
      .eq('tenant_id', tenantId)
      .eq('integration_type', 'sendgrid')
      .single()

    if (!connection) {
      return {
        name,
        status: 'unconfigured',
        message: 'Not configured',
        lastChecked: new Date().toISOString(),
      }
    }

    const creds = connection.credentials as { api_key?: string }

    if (!creds.api_key) {
      return {
        name,
        status: 'unhealthy',
        message: 'Missing API key',
        lastChecked: new Date().toISOString(),
      }
    }

    // Test SendGrid API
    const start = Date.now()
    const response = await fetch('https://api.sendgrid.com/v3/user/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${creds.api_key}`,
        'Content-Type': 'application/json',
      },
    })
    const responseTimeMs = Date.now() - start

    if (response.status === 401 || response.status === 403) {
      return {
        name,
        status: 'unhealthy',
        message: 'Invalid API key',
        lastChecked: new Date().toISOString(),
        responseTimeMs,
      }
    }

    if (!response.ok) {
      return {
        name,
        status: 'degraded',
        message: `API warning: ${response.status}`,
        lastChecked: new Date().toISOString(),
        responseTimeMs,
      }
    }

    return {
      name,
      status: connection.is_active ? 'healthy' : 'degraded',
      message: connection.is_active ? 'Operational' : 'Configured but disabled',
      lastChecked: new Date().toISOString(),
      responseTimeMs,
    }
  } catch (error) {
    return {
      name,
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Check failed',
      lastChecked: new Date().toISOString(),
    }
  }
}

/**
 * Check Google Calendar integration health
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkGoogleCalendar(supabase: any, tenantId: string): Promise<IntegrationHealth> {
  const name = 'Google Calendar'

  try {
    const { data: connection } = await supabase
      .from('integration_connections')
      .select('credentials, is_active')
      .eq('tenant_id', tenantId)
      .eq('integration_type', 'google_calendar')
      .single()

    if (!connection) {
      return {
        name,
        status: 'unconfigured',
        message: 'Not configured',
        lastChecked: new Date().toISOString(),
      }
    }

    // For OAuth integrations, we just check if tokens exist
    const creds = connection.credentials as { access_token?: string; refresh_token?: string }

    if (!creds.access_token && !creds.refresh_token) {
      return {
        name,
        status: 'unhealthy',
        message: 'No tokens - reconnect required',
        lastChecked: new Date().toISOString(),
      }
    }

    return {
      name,
      status: connection.is_active ? 'healthy' : 'degraded',
      message: connection.is_active ? 'Connected' : 'Connected but disabled',
      lastChecked: new Date().toISOString(),
    }
  } catch (error) {
    return {
      name,
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Check failed',
      lastChecked: new Date().toISOString(),
    }
  }
}
