import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { upsertIntegrationConnection } from '@/lib/services/integrations.service'
import type { ConfigureOpenSolarRequest } from '@/lib/api/types'

/**
 * POST /api/integrations/opensolar/configure
 * Configure OpenSolar integration for the current tenant
 * Session 90: OpenSolar integration endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    // Parse and validate request body
    const body: ConfigureOpenSolarRequest = await request.json()

    // Support both username/password and legacy API key auth
    if (!body.username && !body.apiKey) {
      return NextResponse.json(
        { error: 'Username or API key is required' },
        { status: 400 }
      )
    }

    if (body.username && !body.password) {
      return NextResponse.json(
        { error: 'Password is required when using username' },
        { status: 400 }
      )
    }

    // Organization ID is required for the OpenSolar API
    if (!body.organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Store credentials in integration_connections
    const credentials = {
      username: body.username || null,
      password: body.password || null,
      api_key: body.apiKey || null,
      organization_id: body.organizationId || null,
      default_project_id: body.defaultProjectId || null,
    }

    const integration = await upsertIntegrationConnection(
      tenantId,
      'opensolar',
      credentials,
      user.id
    )

    if (!integration) {
      return NextResponse.json(
        { error: 'Failed to save OpenSolar integration' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        success: true,
        message: 'OpenSolar integration configured successfully',
        integration: {
          id: integration.id,
          type: 'opensolar',
          configured: true,
        },
      },
    })
  } catch (error) {
    console.error('Error in POST /api/integrations/opensolar/configure:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
