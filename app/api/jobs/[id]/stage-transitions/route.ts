import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders, getUserIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/jobs/:id/stage-transitions - Move job to new stage
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const userId = await getUserIdFromHeaders(headersList)
    const { id: jobId } = await params

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    const body = await request.json()

    if (!body.to_stage_id) {
      return NextResponse.json(
        { error: 'Missing required field: to_stage_id' },
        { status: 400 }
      )
    }

    // Get current job to know the from_stage_id
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('current_stage_id')
      .eq('id', jobId)
      .eq('tenant_id', tenantId)
      .single()

    if (jobError) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Create stage transition record
    const { data: transition, error: transitionError } = await supabase
      .from('job_stage_transitions')
      .insert({
        job_id: jobId,
        from_stage_id: job.current_stage_id,
        to_stage_id: body.to_stage_id,
        transitioned_by: userId,
        notes: body.notes || null,
      })
      .select()
      .single()

    if (transitionError) {
      console.error('Error creating stage transition:', transitionError)
      return NextResponse.json(
        { error: transitionError.message },
        { status: 500 }
      )
    }

    // Resolve destination stage details so we can return stage_type to the client
    // (client uses stage_type = 'completed' on 'Closed (Won)' to prompt compliance workflow)
    const { data: toStage } = await supabase
      .from('job_stages')
      .select('name, stage_type')
      .eq('id', body.to_stage_id)
      .eq('tenant_id', tenantId)
      .single()

    // Update job's current_stage_id and stage_changed_at
    const { data: updatedJob, error: updateError } = await supabase
      .from('jobs')
      .update({
        current_stage_id: body.to_stage_id,
        stage_changed_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating job stage:', updateError)
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        job: updatedJob,
        transition,
        stage: toStage,
        compliance_required: toStage?.name === 'Closed (Won)',
      },
    })
  } catch (error) {
    console.error('Error in POST /api/jobs/:id/stage-transitions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
