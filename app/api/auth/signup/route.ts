/**
 * Session 101: Self-Serve Signup Endpoint
 * POST /api/auth/signup - Create new tenant + admin user
 */

import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface SignupRequest {
  company_name: string
  full_name: string
  email: string
  password: string
  load_demo_data?: boolean
}

export async function POST(request: NextRequest) {
  try {
    // Check for required environment variables
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[Signup] SUPABASE_SERVICE_ROLE_KEY is not configured')
      return NextResponse.json(
        { error: 'Server configuration error. Please contact support.' },
        { status: 500 }
      )
    }

    const body = await request.json() as SignupRequest

    // Validation
    if (!body.company_name || !body.full_name || !body.email || !body.password) {
      return NextResponse.json(
        { error: 'Missing required fields: company_name, full_name, email, password' },
        { status: 400 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email address format' },
        { status: 400 }
      )
    }

    // Password strength validation
    if (body.password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Company name validation
    if (body.company_name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Company name must be at least 2 characters' },
        { status: 400 }
      )
    }

    // Full name validation
    if (body.full_name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Full name must be at least 2 characters' },
        { status: 400 }
      )
    }

    // Use admin client to create user and tenant
    const adminClient = createAdminClient()

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers()
    const userExists = existingUsers?.users?.some(u => u.email === body.email.toLowerCase())

    if (userExists) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    // 1. Create Supabase Auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: body.email.toLowerCase(),
      password: body.password,
      email_confirm: true, // Auto-confirm email for self-serve signup
      user_metadata: {
        full_name: body.full_name.trim(),
      },
    })

    if (authError || !authData.user) {
      console.error('[Signup] Error creating auth user:', authError)
      return NextResponse.json(
        { error: authError?.message || 'Failed to create user account' },
        { status: 500 }
      )
    }

    const userId = authData.user.id

    // 2. Create tenant
    const tenantSlug = body.company_name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50)

    const { data: tenant, error: tenantError } = await adminClient
      .from('tenants')
      .insert({
        name: body.company_name.trim(),
        slug: tenantSlug,
        subdomain: tenantSlug,
        tier: 'essential', // Default tier for self-serve signups
        settings: {
          onboarding_completed: false,
          onboarding_dismissed: false,
        },
        is_active: true,
      })
      .select()
      .single()

    if (tenantError || !tenant) {
      console.error('[Signup] Error creating tenant:', tenantError)

      // Clean up: delete auth user if tenant creation failed
      await adminClient.auth.admin.deleteUser(userId)

      // Return more specific error for debugging
      const errorMessage = tenantError?.message || 'Unknown tenant creation error'
      const isDuplicate = errorMessage.includes('duplicate') || errorMessage.includes('unique')
      
      return NextResponse.json(
        { 
          error: isDuplicate 
            ? 'A company with this name already exists. Please choose a different name.' 
            : `Failed to create company account: ${errorMessage}` 
        },
        { status: isDuplicate ? 409 : 500 }
      )
    }

    // 2a. Seed default tenant data (job stages, appointment types, customer sources)
    try {
      await adminClient.rpc('seed_tenant_data', { p_tenant_id: tenant.id })
      console.log('[Signup] Successfully seeded tenant data:', { tenantId: tenant.id })
    } catch (seedError) {
      // Log but don't block signup - tenant can manually configure later
      console.error('[Signup] Error seeding tenant data:', {
        tenantId: tenant.id,
        error: seedError instanceof Error ? seedError.message : String(seedError)
      })
    }

    // 2b. Optionally seed demo data (sample customers, jobs, appointments)
    if (body.load_demo_data) {
      try {
        await adminClient.rpc('seed_demo_data', { p_tenant_id: tenant.id })
        console.log('[Signup] Successfully seeded demo data:', { tenantId: tenant.id })
      } catch (demoError) {
        // Log but don't block signup
        console.error('[Signup] Error seeding demo data:', {
          tenantId: tenant.id,
          error: demoError instanceof Error ? demoError.message : String(demoError)
        })
      }
    }

    // 3. Create user record in public.users table
    const { data: user, error: userError } = await adminClient
      .from('users')
      .insert({
        id: userId,
        email: body.email.toLowerCase(),
        name: body.full_name.trim(),
      })
      .select()
      .single()

    if (userError || !user) {
      console.error('[Signup] Error creating user record:', userError)

      // Clean up: delete tenant and auth user
      await adminClient.from('tenants').delete().eq('id', tenant.id)
      await adminClient.auth.admin.deleteUser(userId)

      return NextResponse.json(
        { error: `Failed to create user record: ${userError?.message || 'Unknown error'}` },
        { status: 500 }
      )
    }

    // 4. Link user to tenant as admin
    const { error: tenantUserError } = await adminClient
      .from('tenant_users')
      .insert({
        tenant_id: tenant.id,
        user_id: userId,
        role: 'admin',
      })

    if (tenantUserError) {
      console.error('[Signup] Error creating tenant_users link:', tenantUserError)

      // Clean up: delete user, tenant, and auth user
      await adminClient.from('users').delete().eq('id', userId)
      await adminClient.from('tenants').delete().eq('id', tenant.id)
      await adminClient.auth.admin.deleteUser(userId)

      return NextResponse.json(
        { error: 'Failed to link user to company' },
        { status: 500 }
      )
    }

    // 5. Create welcome notification
    try {
      // Get the welcome notification type ID
      const { data: welcomeType } = await adminClient
        .from('notification_types')
        .select('id')
        .eq('type_key', 'welcome')
        .single()

      await adminClient.from('notifications').insert({
        tenant_id: tenant.id,
        user_id: userId,
        notification_type_id: welcomeType?.id || null,
        title: '👋 Welcome to Cold Lava!',
        body: `Hi ${body.full_name.split(' ')[0]}! Your account is ready. Start by adding your first job or take a quick tour of the system.`,
        action_url: '/?tour=start',
        is_read: false,
      })
      console.log('[Signup] Created welcome notification')
    } catch (notifError) {
      // Don't block signup if notification fails
      console.error('[Signup] Error creating welcome notification:', notifError)
    }

    console.log('[Signup] Successfully created tenant and admin user:', {
      tenantId: tenant.id,
      tenantName: tenant.name,
      userId: user.id,
      userEmail: user.email,
    })

    // Return success with user/tenant data
    // The client will handle session establishment via Supabase client
    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.name,
        },
        tenant: {
          id: tenant.id,
          company_name: tenant.name,
          slug: tenant.slug,
        },
      },
    })
  } catch (error) {
    console.error('[Signup] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
