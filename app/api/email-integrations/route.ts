import { createAdminClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders, getUserIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/email-integrations
 * Returns connected Gmail/Outlook email integrations for the current user/tenant.
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const _userId = await getUserIdFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    try {
      const { data, error } = await supabase
        .from('email_integrations')
        .select('id, tenant_id, user_id, provider, email_address, display_name, is_active, last_sync_at, last_error, created_at, updated_at')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        // Table might not exist yet (migration not run)
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return NextResponse.json({ data: [] })
        }
        throw error
      }

      return NextResponse.json({ data: data || [] })
    } catch (dbError: unknown) {
      // Gracefully handle missing table
      const errorMessage = dbError instanceof Error ? dbError.message : String(dbError)
      if (errorMessage.includes('does not exist') || errorMessage.includes('42P01')) {
        return NextResponse.json({ data: [] })
      }
      throw dbError
    }
  } catch (error) {
    console.error('Error in GET /api/email-integrations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/email-integrations
 * Disconnect an email integration (deactivate, remove tokens).
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    const { integrationId } = await request.json()

    if (!integrationId) {
      return NextResponse.json(
        { error: 'integrationId is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('email_integrations')
      .update({
        is_active: false,
        access_token: null,
        refresh_token: null,
        token_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', integrationId)
      .eq('tenant_id', tenantId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/email-integrations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
