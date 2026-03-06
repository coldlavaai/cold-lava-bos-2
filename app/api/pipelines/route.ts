import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/pipelines
 * Returns pipelines the current user has access to
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get user's tenant and role
    const { data: tenantUser } = await adminClient
      .from('tenant_users')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single()

    if (!tenantUser) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
    }

    const isAdmin = tenantUser.role === 'admin'

    // Get pipelines with member info
    let query = adminClient
      .from('pipelines')
      .select(`
        *,
        pipeline_members (
          user_id,
          role,
          user:users (id, name, email)
        ),
        created_by_user:users!pipelines_created_by_fkey (id, name, email)
      `)
      .eq('tenant_id', tenantUser.tenant_id)
      .order('created_at', { ascending: true })

    // Non-admins only see pipelines they're members of
    if (!isAdmin) {
      const { data: memberPipelines } = await adminClient
        .from('pipeline_members')
        .select('pipeline_id')
        .eq('user_id', user.id)

      const pipelineIds = memberPipelines?.map(p => p.pipeline_id) || []
      
      if (pipelineIds.length === 0) {
        return NextResponse.json({ data: [], meta: { is_admin: false } })
      }
      
      query = query.in('id', pipelineIds)
    }

    const { data: pipelines, error } = await query

    if (error) {
      console.error('[/api/pipelines] Error:', error)
      return NextResponse.json({ error: 'Failed to fetch pipelines' }, { status: 500 })
    }

    return NextResponse.json({
      data: pipelines || [],
      meta: {
        is_admin: isAdmin,
        total: pipelines?.length || 0
      }
    })
  } catch (error) {
    console.error('[/api/pipelines] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/pipelines
 * Create a new pipeline (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Verify admin role
    const { data: tenantUser } = await adminClient
      .from('tenant_users')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single()

    if (!tenantUser || tenantUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, color, member_ids } = body

    if (!name) {
      return NextResponse.json({ error: 'Pipeline name is required' }, { status: 400 })
    }

    // Create pipeline
    const { data: pipeline, error: createError } = await adminClient
      .from('pipelines')
      .insert({
        tenant_id: tenantUser.tenant_id,
        name,
        description,
        color: color || '#06b6d4',
        created_by: user.id
      })
      .select()
      .single()

    if (createError) {
      console.error('[/api/pipelines] Create error:', createError)
      if (createError.code === '23505') {
        return NextResponse.json({ error: 'A pipeline with this name already exists' }, { status: 400 })
      }
      return NextResponse.json({ error: 'Failed to create pipeline' }, { status: 500 })
    }

    // Add members if provided
    if (member_ids && Array.isArray(member_ids) && member_ids.length > 0) {
      const members = member_ids.map((userId: string) => ({
        pipeline_id: pipeline.id,
        user_id: userId,
        role: 'member'
      }))

      await adminClient.from('pipeline_members').insert(members)
    }

    // Always add the creator as owner
    await adminClient.from('pipeline_members').insert({
      pipeline_id: pipeline.id,
      user_id: user.id,
      role: 'owner'
    })

    return NextResponse.json({ data: pipeline }, { status: 201 })
  } catch (error) {
    console.error('[/api/pipelines] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
