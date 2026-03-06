import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { deleteIntegrationConnection } from '@/lib/services/integrations.service'

/**
 * DELETE /api/integrations/:type
 * Disconnects an integration for the current tenant
 * Session 90: Universal disconnect endpoint
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const { type } = await params

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

    // Validate integration type
    const validTypes = ['sendgrid', 'twilio', 'opensolar', 'stripe', 'google_calendar']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid integration type: ${type}` },
        { status: 400 }
      )
    }

    // Delete the integration
    const success = await deleteIntegrationConnection(tenantId, type)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to disconnect integration' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        success: true,
        message: `${type} integration disconnected successfully`,
      },
    })
  } catch (error) {
    console.error(`Error in DELETE /api/integrations/${(await params).type}:`, error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
