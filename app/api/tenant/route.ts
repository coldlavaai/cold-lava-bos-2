import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders, getUserRoleFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/tenant - Get current tenant details
export async function GET() {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    // DEBUG: Log auth and tenant context
    const { data: { user } } = await supabase.auth.getUser()
    console.log('[/api/tenant] DEBUG context', {
      tenantId,
      userId: user?.id,
      hasAuth: !!user,
      headerTenantId: headersList.get('x-tenant-id'),
      headerUserId: headersList.get('x-user-id'),
    })

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single()

    // DEBUG: Log query result
    console.log('[/api/tenant] DEBUG query result', {
      hasTenant: !!tenant,
      tenantName: tenant?.name,
      hasError: !!error,
      error: error ? { message: error.message, code: error.code } : null,
    })

    if (error) {
      console.error('Error fetching tenant:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Extract timezone from settings JSONB for frontend compatibility
    const settings = tenant.settings as Record<string, unknown> || {}
    const data = {
      ...tenant,
      timezone: settings.timezone || 'UTC',
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in GET /api/tenant:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/tenant - Update tenant settings (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const userRole = await getUserRoleFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    // Only admins can update tenant settings
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin role required' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Build update object - only allow whitelisted fields
    const updates: Record<string, unknown> = {}

    if (body.name !== undefined) updates.name = body.name
    if (body.subdomain !== undefined) updates.subdomain = body.subdomain

    // Handle timezone field - store it in settings JSONB
    if (body.timezone !== undefined || body.settings !== undefined) {
      // Get current settings first
      const { data: currentTenant } = await supabase
        .from('tenants')
        .select('settings')
        .eq('id', tenantId)
        .single()

      const currentSettings = (currentTenant?.settings as Record<string, unknown>) || {}

      // Merge settings
      const newSettings = {
        ...currentSettings,
        ...(body.settings || {}),
      }

      // Add timezone if provided
      if (body.timezone !== undefined) {
        newSettings.timezone = body.timezone
      }

      updates.settings = newSettings
    }

    // Don't allow changing tier, is_active via this endpoint
    // Those should have dedicated admin endpoints

    const { data: updatedTenant, error } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', tenantId)
      .select()
      .single()

    if (error) {
      console.error('Error updating tenant:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Extract timezone from settings for response
    const settings = updatedTenant.settings as Record<string, unknown> || {}
    const data = {
      ...updatedTenant,
      timezone: settings.timezone || 'UTC',
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in PATCH /api/tenant:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
