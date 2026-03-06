import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { resolveOtterCredentials } from '@/lib/services/integrations.service'
import { scheduleOtterBot } from '@/lib/services/otter-api.service'

/**
 * POST /api/appointments/[id]/schedule-otter
 * Schedule Otter bot to join meeting for this appointment
 * Session 94: Otter OAuth integration - auto-scheduling
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const appointmentId = params.id
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

    // Get appointment
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .eq('tenant_id', tenantId)
      .single()

    if (appointmentError || !appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    // Check if appointment has a meeting URL
    const meetingUrl = appointment.location
    if (!meetingUrl || !isValidMeetingUrl(meetingUrl)) {
      return NextResponse.json(
        { error: 'Appointment does not have a valid meeting URL (Zoom, Google Meet, or Teams link required)' },
        { status: 400 }
      )
    }

    // Get Otter credentials
    const otterCreds = await resolveOtterCredentials(tenantId)
    if (!otterCreds) {
      return NextResponse.json(
        { error: 'Otter integration not configured. Please connect Otter in Settings → Integrations.' },
        { status: 400 }
      )
    }

    // Build metadata for linking recording back to job/customer
    const metadata: Record<string, unknown> = {
      bos_appointment_id: appointmentId,
      bos_tenant_id: tenantId,
    }

    if (appointment.job_id) {
      metadata.job_id = appointment.job_id
    }

    if (appointment.customer_id) {
      metadata.customer_id = appointment.customer_id
    }

    // Schedule Otter bot
    const result = await scheduleOtterBot(otterCreds.accessToken, {
      meeting_url: meetingUrl,
      start_time: appointment.start_time,
      custom_metadata: metadata,
    })

    // Store Otter meeting ID in appointment metadata
    if (result.meeting_id) {
      const currentMetadata = (appointment.metadata as Record<string, unknown>) || {}
      const updatedMetadata = {
        ...currentMetadata,
        otter_meeting_id: result.meeting_id,
        otter_scheduled_at: new Date().toISOString(),
      }

      await supabase
        .from('appointments')
        .update({ metadata: updatedMetadata })
        .eq('id', appointmentId)
    }

    console.log('[Otter Schedule] Successfully scheduled bot:', {
      appointment_id: appointmentId,
      job_id: appointment.job_id,
      meeting_id: result.meeting_id,
    })

    return NextResponse.json({
      data: {
        success: true,
        message: 'Otter bot scheduled successfully',
        meeting_id: result.meeting_id,
      },
    })
  } catch (error) {
    console.error('Error in POST /api/appointments/[id]/schedule-otter:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to schedule Otter bot' },
      { status: 500 }
    )
  }
}

/**
 * Helper to validate if URL is a supported meeting platform
 */
function isValidMeetingUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()

    // Zoom
    if (hostname.includes('zoom.us') || hostname.includes('zoom.com')) {
      return true
    }

    // Google Meet
    if (hostname.includes('meet.google.com')) {
      return true
    }

    // Microsoft Teams
    if (hostname.includes('teams.microsoft.com') || hostname.includes('teams.live.com')) {
      return true
    }

    return false
  } catch {
    return false
  }
}
