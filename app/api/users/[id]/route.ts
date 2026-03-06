import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders, getUserRoleFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

// DELETE /api/users/:id - Remove user from tenant
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const userRole = await getUserRoleFromHeaders(headersList)
    const { id } = await params

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    // Only admins can delete users
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin role required' },
        { status: 403 }
      )
    }

    // Get the membership to check role before deleting
    const { data: membership } = await supabase
      .from('tenant_users')
      .select('role')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent deleting admin users (optional safety check)
    if (membership.role === 'admin') {
      // Count total admins for this tenant
      const { count } = await supabase
        .from('tenant_users')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('role', 'admin')

      // Don't allow deleting the last admin
      if (count && count <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last admin user' },
          { status: 400 }
        )
      }
    }

    // Delete the tenant membership (not the user itself)
    const { error } = await supabase
      .from('tenant_users')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      console.error('Error deleting user membership:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Return 204 No Content on success
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error in DELETE /api/users/:id:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
