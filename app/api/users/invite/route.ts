import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders, getUserRoleFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { sendInviteEmailDirect } from '@/lib/services/messaging.service'

// POST /api/users/invite - Invite user to tenant
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

    // Validate email
    if (!body.email || typeof body.email !== 'string' || !body.email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }

    // Validate role if provided
    const validRoles = ['admin', 'sales', 'ops', 'finance', 'viewer']
    const role = body.role || 'viewer'

    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be one of: admin, sales, ops, finance, viewer' },
        { status: 400 }
      )
    }

    const email = body.email.toLowerCase().trim()

    // Find user by email first (simpler query)
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    // If user exists, check if they're already in this tenant
    if (existingUser) {
      const { data: existingMembership } = await supabase
        .from('tenant_users')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('user_id', existingUser.id)
        .maybeSingle()

      if (existingMembership) {
        return NextResponse.json(
          { error: 'User already exists in this tenant' },
          { status: 409 }
        )
      }
    }

    // Find or create user in global users table
    let userId: string

    if (existingUser) {
      userId = existingUser.id
    } else {
      // Create new user record using admin client (bypasses RLS)
      // This is necessary because RLS policies don't allow regular clients to insert
      const adminClient = createAdminClient()
      const { data: newUser, error: createUserError } = await adminClient
        .from('users')
        .insert({
          email,
          name: body.name || email.split('@')[0], // Use email prefix as default name
        })
        .select('id')
        .single()

      if (createUserError || !newUser) {
        console.error('[/api/users/invite] Error creating user:', {
          error: createUserError,
          message: createUserError?.message,
          code: createUserError?.code,
          details: createUserError?.details,
          hint: createUserError?.hint,
          email,
          tenantId
        })
        return NextResponse.json(
          { error: `Failed to create user record: ${createUserError?.message || 'Unknown error'}` },
          { status: 500 }
        )
      }

      userId = newUser.id
    }

    // Create tenant_users record (invited status)
    // invited_at defaults to NOW(), joined_at is NULL (pending status)
    const { data: tenantUser, error: tenantUserError } = await supabase
      .from('tenant_users')
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        role: role,
        // invited_at defaults to NOW()
        // joined_at remains NULL (pending status)
      })
      .select(`
        id,
        role,
        invited_at,
        joined_at,
        user:users(id, name, email, avatar_url)
      `)
      .single()

    if (tenantUserError) {
      console.error('Error creating tenant_user:', tenantUserError)
      return NextResponse.json(
        { error: tenantUserError.message },
        { status: 500 }
      )
    }

    // Get tenant name for the email
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single()

    const tenantName = tenant?.name || 'your organization'

    // Get inviter's name
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    let inviterName: string | undefined
    if (currentUser) {
      const { data: inviterData } = await supabase
        .from('users')
        .select('name')
        .eq('id', currentUser.id)
        .single()
      inviterName = inviterData?.name
    }

    // Generate invite URL (user will need to sign up/login)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cl-solarbos-jan-26.vercel.app'
    const inviteUrl = `${baseUrl}/signup?email=${encodeURIComponent(email)}&tenant=${tenantId}`

    // Send invitation email directly
    const emailResult = await sendInviteEmailDirect({
      to: email,
      invitedByName: inviterName,
      tenantName,
      role,
      inviteUrl,
    })

    if (!emailResult.success) {
      // Log error but don't fail the invite - email can be resent
      console.error('Error sending invite email:', emailResult.error)
    }

    return NextResponse.json({
      data: tenantUser,
      message: 'User invited successfully'
    })
  } catch (error) {
    console.error('Error in POST /api/users/invite:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
