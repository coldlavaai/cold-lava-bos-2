import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/team
 * Returns team members for the current user's tenant
 * Only admins can see the full team list
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get user's tenant and role
    const { data: tenantUser, error: tenantUserError } = await adminClient
      .from('tenant_users')
      .select('tenant_id, role')
      .eq('user_id', authUser.id)
      .single()

    if (tenantUserError || !tenantUser) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
    }

    // Get all team members for this tenant
    const { data: teamMembers, error: teamError } = await adminClient
      .from('tenant_users')
      .select(`
        id,
        user_id,
        role,
        joined_at,
        user:users (
          id,
          email,
          name
        )
      `)
      .eq('tenant_id', tenantUser.tenant_id)
      .order('role', { ascending: true })

    if (teamError) {
      console.error('[/api/team] Error fetching team:', teamError)
      return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 })
    }

    // Define user type for type safety
    interface UserData {
      id?: string
      email?: string
      name?: string
    }

    // Format response - flatten user data
    const formattedTeam = (teamMembers || []).map(member => {
      const userData = Array.isArray(member.user) 
        ? (member.user[0] as UserData)
        : (member.user as UserData)
      
      return {
        id: member.id,
        user_id: member.user_id,
        role: member.role,
        joined_at: member.joined_at,
        user: {
          id: userData?.id,
          email: userData?.email,
          full_name: userData?.name,
        }
      }
    })

    return NextResponse.json({
      data: formattedTeam,
      meta: {
        total: formattedTeam.length,
        current_user_role: tenantUser.role
      }
    })
  } catch (error) {
    console.error('[/api/team] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
