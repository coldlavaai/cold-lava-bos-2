import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders, getUserIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/surveys/approve-route
 *
 * Creates appointments from an approved route
 * Moves jobs to "Survey Booked" stage
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const currentUserId = await getUserIdFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'No user context' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { route } = body

    if (!route || !route.stops) {
      return NextResponse.json(
        { error: 'Invalid route data' },
        { status: 400 }
      )
    }

    console.log('[/api/surveys/approve-route] Creating appointments for route:', {
      route_date: route.route_date,
      total_stops: route.total_stops,
    })

    // Get "Survey Booked" stage
    const { data: surveyStage } = await supabase
      .from('job_stages')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('name', 'Survey Booked')
      .single()

    const surveyStageId = surveyStage?.id

    if (!surveyStageId) {
      console.warn('[/api/surveys/approve-route] Survey Booked stage not found')
    }

    // Create appointments for each stop (excluding starting point and return)
    interface RouteStop {
      is_starting_point: boolean
      is_return: boolean
      job_id: string | null
      customer_name: string
      address: string
      arrival_time: string
      departure_time: string
      visit_duration_minutes: number
      travel_time_to_next_minutes: number
    }

    const appointmentsToCreate = route.stops
      .filter((stop: RouteStop) => !stop.is_starting_point && !stop.is_return && stop.job_id)
      .map((stop: RouteStop) => ({
        tenant_id: tenantId,
        job_id: stop.job_id,
        title: `Survey - ${stop.customer_name}`,
        start_time: stop.arrival_time,
        end_time: stop.departure_time,
        location: stop.address,
        status: 'proposed', // Per SurveyRoutingArchitecture.md - proposed until customer confirms
        created_by: currentUserId,
        // Note: description, appointment_type, visit_duration_minutes, travel_time_to_next_minutes
        // will be added after migration is applied
      }))

    console.log('[/api/surveys/approve-route] Creating', appointmentsToCreate.length, 'appointments')

    // Insert appointments
    const { data: createdAppointments, error: appointmentsError } = await supabase
      .from('appointments')
      .insert(appointmentsToCreate)
      .select()

    if (appointmentsError) {
      console.error('[/api/surveys/approve-route] Error creating appointments:', appointmentsError)
      return NextResponse.json(
        { error: 'Failed to create appointments', details: appointmentsError.message },
        { status: 500 }
      )
    }

    console.log('[/api/surveys/approve-route] Created', createdAppointments?.length || 0, 'appointments')

    // Update job stages to "Survey Booked" if stage exists
    if (surveyStageId) {
      const jobIds = route.stops
        .filter((stop: RouteStop) => !stop.is_starting_point && !stop.is_return && stop.job_id)
        .map((stop: RouteStop) => stop.job_id)

      const { error: updateError } = await supabase
        .from('jobs')
        .update({ current_stage_id: surveyStageId })
        .in('id', jobIds)

      if (updateError) {
        console.error('[/api/surveys/approve-route] Error updating job stages:', updateError)
        // Don't fail the request if stage update fails
      } else {
        console.log('[/api/surveys/approve-route] Updated', jobIds.length, 'jobs to Survey Booked stage')
      }
    }

    return NextResponse.json({
      success: true,
      appointments_created: createdAppointments?.length || 0,
      message: `Successfully created ${createdAppointments?.length || 0} survey appointments`,
    })

  } catch (error) {
    console.error('[/api/surveys/approve-route] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
