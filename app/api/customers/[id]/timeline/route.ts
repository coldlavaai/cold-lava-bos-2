import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export interface TimelineItem {
  id: string
  type: 'job' | 'job_event' | 'message_thread' | 'appointment' | 'call_recording' | 'customer_note'
  timestamp: string
  title: string
  description?: string
  // Foreign keys for navigation
  job_id?: string
  thread_id?: string
  appointment_id?: string
  // Additional metadata
  metadata?: Record<string, unknown>
}

// GET /api/customers/:id/timeline - Get unified timeline for customer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const { id: customerId } = await params

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    const timeline: TimelineItem[] = []

    // Fetch jobs for this customer
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select(`
        id,
        job_number,
        current_stage_id,
        estimated_value,
        system_size_kwp,
        created_at,
        current_stage:job_stages!current_stage_id(name)
      `)
      .eq('customer_id', customerId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (jobsError) {
      console.error('Error fetching jobs for timeline:', jobsError)
    } else if (jobs) {
      jobs.forEach((job) => {
        // Handle current_stage which could be an object or array depending on Supabase response
        const stage = job.current_stage as unknown as { name: string } | { name: string }[] | null
        const stageName = stage
          ? Array.isArray(stage) && stage.length > 0
            ? stage[0]?.name
            : 'name' in stage
            ? stage.name
            : undefined
          : undefined

        timeline.push({
          id: `job-${job.id}`,
          type: 'job',
          timestamp: job.created_at,
          title: `Job ${job.job_number} created`,
          description: stageName,
          job_id: job.id,
          metadata: {
            estimated_value: job.estimated_value,
            system_size_kwp: job.system_size_kwp,
            stage: stageName,
          },
        })
      })
    }

    // Fetch message threads for this customer
    const { data: threads, error: threadsError } = await supabase
      .from('message_threads')
      .select('id, channel, subject, last_message_at, created_at')
      .eq('customer_id', customerId)
      .eq('tenant_id', tenantId)
      .order('last_message_at', { ascending: false })

    if (threadsError) {
      console.error('Error fetching threads for timeline:', threadsError)
    } else if (threads) {
      threads.forEach((thread) => {
        timeline.push({
          id: `thread-${thread.id}`,
          type: 'message_thread',
          timestamp: thread.last_message_at || thread.created_at,
          title: thread.subject || `${thread.channel} conversation`,
          description: undefined,
          thread_id: thread.id,
          metadata: {
            channel: thread.channel,
          },
        })
      })
    }

    // Fetch appointments for this customer
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        title,
        appointment_type,
        start_time,
        end_time,
        location,
        status,
        job_id,
        created_at
      `)
      .eq('customer_id', customerId)
      .eq('tenant_id', tenantId)
      .order('start_time', { ascending: false })

    if (appointmentsError) {
      console.error('Error fetching appointments for timeline:', appointmentsError)
    } else if (appointments) {
      appointments.forEach((appointment) => {
        timeline.push({
          id: `appointment-${appointment.id}`,
          type: 'appointment',
          timestamp: appointment.start_time,
          title: appointment.title,
          description: appointment.appointment_type || undefined,
          appointment_id: appointment.id,
          job_id: appointment.job_id || undefined,
          metadata: {
            location: appointment.location,
            status: appointment.status,
            start_time: appointment.start_time,
            end_time: appointment.end_time,
          },
        })
      })
    }

    // Fetch customer notes
    const { data: notes, error: notesError } = await supabase
      .from('customer_notes')
      .select('id, note, created_at, created_by')
      .eq('customer_id', customerId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (notesError) {
      console.error('Error fetching customer notes for timeline:', notesError)
    } else if (notes) {
      notes.forEach((note) => {
        // Truncate note for description (first 100 chars)
        const description = note.note.length > 100
          ? note.note.substring(0, 100) + '...'
          : note.note

        timeline.push({
          id: `note-${note.id}`,
          type: 'customer_note',
          timestamp: note.created_at,
          title: 'Call logged',
          description,
          metadata: {
            full_note: note.note,
            created_by: note.created_by,
          },
        })
      })
    }

    // Sort timeline by timestamp descending (most recent first)
    timeline.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })

    return NextResponse.json({ data: timeline })
  } catch (error) {
    console.error('Error in GET /api/customers/:id/timeline:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
