import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { CallRecording, CreateCallRecordingRequest } from '@/lib/api/types'

/**
 * GET /api/call-recordings
 * List call recordings filtered by job, customer, or message thread
 * Session 92: Call Recordings & Otter Foundation
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('job_id')
    const customerId = searchParams.get('customer_id')
    const threadId = searchParams.get('thread_id')

    // Build query
    let query = supabase
      .from('call_recordings')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('started_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    // Apply filters
    if (jobId) {
      query = query.eq('job_id', jobId)
    }

    if (customerId) {
      query = query.eq('customer_id', customerId)
    }

    if (threadId) {
      query = query.eq('message_thread_id', threadId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching call recordings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch call recordings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data as CallRecording[],
    })
  } catch (error) {
    console.error('Error in GET /api/call-recordings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/call-recordings
 * Ingest or upsert call recording from external providers
 * Session 92: Call Recordings & Otter Foundation
 *
 * Auth: Should be called by trusted background jobs or provider webhooks
 * with service-role auth or shared secret validation
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json() as CreateCallRecordingRequest

    // Validate required fields
    if (!body.provider) {
      return NextResponse.json(
        { error: 'Provider is required' },
        { status: 400 }
      )
    }

    // Check if at least one linkage is provided (recommended but not enforced)
    if (!body.job_id && !body.customer_id && !body.message_thread_id) {
      console.warn('[Call Recordings] No linkage provided (job_id, customer_id, or message_thread_id)')
    }

    // Prepare data for upsert
    const recordingData = {
      tenant_id: tenantId,
      customer_id: body.customer_id || null,
      job_id: body.job_id || null,
      message_thread_id: body.message_thread_id || null,
      provider: body.provider,
      provider_call_id: body.provider_call_id || null,
      provider_meeting_url: body.provider_meeting_url || null,
      audio_url: body.audio_url || null,
      transcript: body.transcript || null,
      summary: body.summary || null,
      action_items: body.action_items || null,
      language: body.language || null,
      direction: body.direction || null,
      started_at: body.started_at || null,
      ended_at: body.ended_at || null,
      duration_seconds: body.duration_seconds || null,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    }

    // Upsert logic: If provider + provider_call_id exists, update; else insert
    let result

    if (body.provider_call_id) {
      // Check if recording already exists
      const { data: existing } = await supabase
        .from('call_recordings')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('provider', body.provider)
        .eq('provider_call_id', body.provider_call_id)
        .single()

      if (existing) {
        // Update existing recording
        const { data: updated, error } = await supabase
          .from('call_recordings')
          .update(recordingData)
          .eq('id', existing.id)
          .select()
          .single()

        if (error) {
          console.error('Error updating call recording:', error)
          return NextResponse.json(
            { error: 'Failed to update call recording' },
            { status: 500 }
          )
        }

        result = updated
      } else {
        // Insert new recording
        const { data: inserted, error } = await supabase
          .from('call_recordings')
          .insert({
            ...recordingData,
            created_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (error) {
          console.error('Error inserting call recording:', error)
          return NextResponse.json(
            { error: 'Failed to create call recording' },
            { status: 500 }
          )
        }

        result = inserted
      }
    } else {
      // No provider_call_id - always insert new
      const { data: inserted, error } = await supabase
        .from('call_recordings')
        .insert({
          ...recordingData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error('Error inserting call recording:', error)
        return NextResponse.json(
          { error: 'Failed to create call recording' },
          { status: 500 }
        )
      }

      result = inserted
    }

    return NextResponse.json({
      data: result as CallRecording,
    })
  } catch (error) {
    console.error('Error in POST /api/call-recordings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
