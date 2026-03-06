import { createAdminClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Default system profiles seeded on first GET
const DEFAULT_PROFILES = [
  {
    name: 'Administrator',
    description: 'Full access to all modules and settings',
    is_system: true,
    permissions: {
      customers: { view: true, create: true, edit: true, delete: true },
      jobs: { view: true, create: true, edit: true, delete: true },
      calendar: { view: true, create: true, edit: true, delete: true },
      comms: { view: true, create: true, edit: true, delete: true },
      settings: { view: true, create: true, edit: true, delete: true },
    },
  },
  {
    name: 'Standard',
    description: 'Access to all modules except settings administration',
    is_system: true,
    permissions: {
      customers: { view: true, create: true, edit: true, delete: false },
      jobs: { view: true, create: true, edit: true, delete: false },
      calendar: { view: true, create: true, edit: true, delete: true },
      comms: { view: true, create: true, edit: true, delete: false },
      settings: { view: false, create: false, edit: false, delete: false },
    },
  },
  {
    name: 'Surveyor',
    description: 'View and edit jobs and customers only',
    is_system: true,
    permissions: {
      customers: { view: true, create: false, edit: true, delete: false },
      jobs: { view: true, create: false, edit: true, delete: false },
      calendar: { view: true, create: false, edit: false, delete: false },
      comms: { view: false, create: false, edit: false, delete: false },
      settings: { view: false, create: false, edit: false, delete: false },
    },
  },
]

// GET /api/settings/profiles - List profiles (auto-seeds defaults if none exist)
export async function GET() {
  try {
    const supabase = createAdminClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 })
    }

    // Check if profiles exist for this tenant
    const { data: existing, error: checkError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1)

    if (checkError) {
      console.error('[profiles] Error checking existing:', checkError)
      return NextResponse.json({ error: checkError.message }, { status: 500 })
    }

    // Auto-seed defaults if no profiles exist
    if (!existing || existing.length === 0) {
      const seedData = DEFAULT_PROFILES.map((p) => ({
        tenant_id: tenantId,
        ...p,
      }))

      const { error: seedError } = await supabase
        .from('user_profiles')
        .insert(seedData)

      if (seedError) {
        console.error('[profiles] Error seeding defaults:', seedError)
        // Continue anyway — might be a race condition with another seed
      }
    }

    // Fetch all profiles for tenant
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('is_system', { ascending: false })
      .order('name', { ascending: true })

    if (error) {
      console.error('[profiles] Error fetching:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: profiles })
  } catch (err) {
    console.error('[profiles] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/settings/profiles - Create or update a profile
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 })
    }

    const body = await request.json()
    const { id, name, description, permissions } = body

    if (!name || !permissions) {
      return NextResponse.json(
        { error: 'Name and permissions are required' },
        { status: 400 }
      )
    }

    if (id) {
      // Update existing profile
      // Don't allow renaming system profiles
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('is_system')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single()

      const updateData: Record<string, unknown> = {
        permissions,
        description,
        updated_at: new Date().toISOString(),
      }

      // Only allow name change for non-system profiles
      if (!existingProfile?.is_system) {
        updateData.name = name
      }

      const { data: updated, error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single()

      if (error) {
        console.error('[profiles] Error updating:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ data: updated })
    } else {
      // Create new profile
      const { data: created, error } = await supabase
        .from('user_profiles')
        .insert({
          tenant_id: tenantId,
          name,
          description: description || '',
          permissions,
          is_system: false,
        })
        .select()
        .single()

      if (error) {
        console.error('[profiles] Error creating:', error)
        if (error.code === '23505') {
          return NextResponse.json(
            { error: 'A profile with that name already exists' },
            { status: 409 }
          )
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ data: created }, { status: 201 })
    }
  } catch (err) {
    console.error('[profiles] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/settings/profiles - Delete a profile
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const profileId = searchParams.get('id')

    if (!profileId) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 })
    }

    // Don't allow deleting system profiles
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_system')
      .eq('id', profileId)
      .eq('tenant_id', tenantId)
      .single()

    if (profile?.is_system) {
      return NextResponse.json(
        { error: 'Cannot delete system profiles' },
        { status: 403 }
      )
    }

    // Unlink users from this profile first
    await supabase
      .from('tenant_users')
      .update({ profile_id: null })
      .eq('profile_id', profileId)
      .eq('tenant_id', tenantId)

    // Delete the profile
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', profileId)
      .eq('tenant_id', tenantId)

    if (error) {
      console.error('[profiles] Error deleting:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[profiles] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
