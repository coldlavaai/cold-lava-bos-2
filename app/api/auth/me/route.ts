import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get the current authenticated user from Supabase Auth
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    console.log('[/api/auth/me] Auth user:', JSON.stringify({
      id: authUser?.id,
      email: authUser?.email,
      authError: authError?.message
    }, null, 2))

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Use admin client for database queries to bypass RLS
    // Auth is already verified above via supabase.auth.getUser()
    console.log('[/api/auth/me] Service role key present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    console.log('[/api/auth/me] Service role key first 20 chars:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20))
    console.log('[/api/auth/me] Service role key length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length)
    console.log('[/api/auth/me] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    const adminClient = createAdminClient()

    // Get the user from our users table - SWITCHING TO ID LOOKUP
    console.log('[/api/auth/me] Querying users table with id:', authUser.id)
    const { data: user, error: userError } = await adminClient
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    console.log('[/api/auth/me] Users query result:', JSON.stringify({
      user: user ? { id: user.id, email: user.email } : null,
      userError: userError?.message,
      userErrorCode: userError?.code,
      userErrorDetails: userError?.details
    }, null, 2))

    if (userError || !user) {
      console.error('[/api/auth/me] User not found in public.users table:', {
        authUserId: authUser.id,
        authUserEmail: authUser.email,
        error: userError
      })
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get the user's tenant relationship
    console.log('[/api/auth/me] Querying tenant_users with user_id:', user.id)
    const { data: tenantUser, error: tenantUserError } = await adminClient
      .from('tenant_users')
      .select(`
        role,
        tenant:tenants (
          id,
          name,
          slug,
          tier,
          settings,
          is_active
        )
      `)
      .eq('user_id', user.id)
      .single()

    console.log('[/api/auth/me] Tenant query result:', JSON.stringify({
      tenantUser: tenantUser ? { role: tenantUser.role, hasTenant: !!tenantUser.tenant } : null,
      tenantUserError: tenantUserError?.message,
      tenantUserErrorCode: tenantUserError?.code
    }, null, 2))

    if (tenantUserError || !tenantUser || !tenantUser.tenant) {
      console.error('[/api/auth/me] No tenant association found:', {
        userId: user.id,
        error: tenantUserError
      })
      return NextResponse.json(
        { error: 'No tenant association found' },
        { status: 404 }
      )
    }

    // Extract tenant data (Supabase returns it as an array for foreign key relationships)
    const tenant = Array.isArray(tenantUser.tenant) ? tenantUser.tenant[0] : tenantUser.tenant

    if (!tenant) {
      return NextResponse.json(
        { error: 'No tenant association found' },
        { status: 404 }
      )
    }

    // Derive permissions from role
    const permissions = {
      can_manage_users: tenantUser.role === 'admin',
      can_manage_billing: tenantUser.role === 'admin',
      can_delete_jobs: tenantUser.role === 'admin',
      can_access_analytics: true,
    }

    // Return user and tenant data with spec-aligned field names
    console.log('[/api/auth/me] Success! Returning user data for:', user.email, 'with tenant:', tenant.name)
    return NextResponse.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.name,          // Alias for spec alignment
          role: tenantUser.role,
          avatar_url: user.avatar_url,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
        tenant: {
          id: tenant.id,
          company_name: tenant.name,     // Alias for spec alignment
          slug: tenant.slug,
          tier: tenant.tier,
          settings: tenant.settings,
          is_active: tenant.is_active,
        },
        permissions,
      },
    })
  } catch (error) {
    console.error('Error in /api/auth/me:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
// Build: 1767979622 - Updated Supabase project to sasudhihvdsbvjblxorb
