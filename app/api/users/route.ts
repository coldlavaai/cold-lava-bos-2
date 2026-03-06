import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders, getUserRoleFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/users - List tenant users
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    // DEBUG: Log auth and tenant context
    const { data: { user } } = await supabase.auth.getUser()
    console.log('[/api/users] DEBUG context', {
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const role = searchParams.get('role')

    // Query tenant_users to get users for this tenant
    let query = supabase
      .from('tenant_users')
      .select('id, tenant_id, user_id, role, invited_at, joined_at', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('joined_at', { ascending: false })

    // Apply role filter if specified
    if (role) {
      query = query.eq('role', role)
    }

    // Apply pagination
    const rangeFrom = (page - 1) * limit
    const rangeTo = rangeFrom + limit - 1
    query = query.range(rangeFrom, rangeTo)

    const { data: rawData, error, count } = await query

    // DEBUG: Log query result
    console.log('[/api/users] DEBUG query result', {
      dataCount: rawData?.length || 0,
      totalCount: count,
      hasError: !!error,
      error: error ? { message: error.message, code: error.code } : null,
    })

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Get user details for all user_ids
    const userIds = rawData?.map(item => item.user_id).filter(Boolean) || []
    let userDetails: Record<string, { name: string; email: string; created_at: string }> = {}

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, name, email, created_at')
        .in('id', userIds)

      if (users) {
        userDetails = Object.fromEntries(
          users.map(u => [u.id, { name: u.name, email: u.email, created_at: u.created_at }])
        )
      }
    }

    // Flatten to match TenantUser type
    const data = rawData?.map(item => {
      // Skip entries with no user_id or missing user details
      if (!item.user_id) {
        console.warn('tenant_users record missing user_id:', item.id)
        return null
      }

      const user = userDetails[item.user_id]
      if (!user) {
        console.warn('User not found for user_id:', item.user_id, 'in tenant_users:', item.id)
        return null
      }

      return {
        // id remains the membership id (tenant_users.id)
        id: item.id,
        tenant_id: item.tenant_id,
        // user_id is the underlying users.id FK target
        user_id: item.user_id,
        email: user.email || '',
        name: user.name || '',
        role: item.role,
        status: item.joined_at ? 'active' : 'invited',
        created_at: user.created_at || item.invited_at || new Date().toISOString(),
        updated_at: user.created_at || item.invited_at || new Date().toISOString(),
      }
    }).filter(Boolean) || []

    return NextResponse.json({
      data,
      meta: {
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      },
    })
  } catch (error) {
    console.error('Error in GET /api/users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/users/invite - Invite a new user to tenant
export async function POST(request: NextRequest) {
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

    // Only admins can invite users
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin role required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, role } = body

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      )
    }

    // Check if user already exists by email
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, name, email, avatar_url, created_at')
      .eq('email', email)
      .single()

    let userId: string
    let userName: string
    let userCreatedAt: string

    if (existingUser) {
      // User already exists, reuse it
      userId = existingUser.id
      userName = existingUser.name
      userCreatedAt = existingUser.created_at
    } else {
      // Create new user
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          email,
          name: email.split('@')[0], // Simple default name from email
        })
        .select('id, name, email, avatar_url, created_at')
        .single()

      if (userError) {
        console.error('Error creating user:', userError)
        return NextResponse.json(
          { error: userError.message },
          { status: 500 }
        )
      }

      userId = newUser.id
      userName = newUser.name
      userCreatedAt = newUser.created_at
    }

    // Check if user is already a member of this tenant
    const { data: existingMembership } = await supabase
      .from('tenant_users')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .single()

    if (existingMembership) {
      return NextResponse.json(
        { error: 'User is already a member of this tenant' },
        { status: 409 }
      )
    }

    // Create tenant_users membership
    const now = new Date().toISOString()
    const { data: membership, error: membershipError } = await supabase
      .from('tenant_users')
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        role,
        invited_at: now,
      })
      .select('id, tenant_id, user_id, role, invited_at, joined_at')
      .single()

    if (membershipError) {
      console.error('Error creating tenant membership:', membershipError)
      return NextResponse.json(
        { error: membershipError.message },
        { status: 500 }
      )
    }

    // Return flattened TenantUser format
    const tenantUser = {
      id: membership.id,
      tenant_id: membership.tenant_id,
      email,
      name: userName,
      role: membership.role,
      status: membership.joined_at ? 'active' : 'invited',
      created_at: userCreatedAt || membership.invited_at || new Date().toISOString(),
      updated_at: userCreatedAt || membership.invited_at || new Date().toISOString(),
    }

    return NextResponse.json({ data: tenantUser })
  } catch (error) {
    console.error('Error in POST /api/users/invite:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
