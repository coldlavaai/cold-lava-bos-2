import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/pipelines/[id]
 * Get a single pipeline with its members
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const { data: pipeline, error } = await adminClient
      .from('pipelines')
      .select(`
        *,
        pipeline_members (
          id,
          user_id,
          role,
          user:users (id, name, email)
        )
      `)
      .eq('id', id)
      .single()

    if (error || !pipeline) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 })
    }

    return NextResponse.json({ data: pipeline })
  } catch (error) {
    console.error('[/api/pipelines/[id]] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/pipelines/[id]
 * Update a pipeline (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Verify admin
    const { data: tenantUser } = await adminClient
      .from('tenant_users')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single()

    if (!tenantUser || tenantUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, color, stages, member_ids } = body

    // Update pipeline
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (color !== undefined) updateData.color = color
    if (stages !== undefined) updateData.stages = stages

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await adminClient
        .from('pipelines')
        .update(updateData)
        .eq('id', id)

      if (updateError) {
        console.error('[/api/pipelines/[id]] Update error:', updateError)
        return NextResponse.json({ error: 'Failed to update pipeline' }, { status: 500 })
      }
    }

    // Update members if provided
    if (member_ids !== undefined && Array.isArray(member_ids)) {
      // Remove existing members (except owners)
      await adminClient
        .from('pipeline_members')
        .delete()
        .eq('pipeline_id', id)
        .neq('role', 'owner')

      // Add new members
      if (member_ids.length > 0) {
        const members = member_ids.map((userId: string) => ({
          pipeline_id: id,
          user_id: userId,
          role: 'member'
        }))
        await adminClient.from('pipeline_members').insert(members)
      }
    }

    // Fetch updated pipeline
    const { data: pipeline } = await adminClient
      .from('pipelines')
      .select(`
        *,
        pipeline_members (
          id,
          user_id,
          role,
          user:users (id, name, email)
        )
      `)
      .eq('id', id)
      .single()

    return NextResponse.json({ data: pipeline })
  } catch (error) {
    console.error('[/api/pipelines/[id]] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/pipelines/[id]
 * Delete a pipeline (admin only)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Verify admin
    const { data: tenantUser } = await adminClient
      .from('tenant_users')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single()

    if (!tenantUser || tenantUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Check if pipeline has jobs
    const { count } = await adminClient
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('pipeline_id', id)

    if (count && count > 0) {
      return NextResponse.json({ 
        error: `Cannot delete pipeline with ${count} jobs. Move or delete jobs first.` 
      }, { status: 400 })
    }

    // Delete pipeline (cascade will delete members)
    const { error } = await adminClient
      .from('pipelines')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[/api/pipelines/[id]] Delete error:', error)
      return NextResponse.json({ error: 'Failed to delete pipeline' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[/api/pipelines/[id]] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
