/**
 * Session 109: Google Calendar Sync API
 * POST /api/integrations/google-calendar/sync
 * 
 * Sync BOS appointments to Google Calendar
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { syncAppointmentToGoogle, testGoogleCalendarConnection } from "@/lib/services/google-calendar.service"

interface SyncRequest {
  appointment_ids?: string[]  // Specific appointments to sync
  sync_all?: boolean         // Sync all upcoming appointments
  action?: 'test' | 'sync'   // Action to perform
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get tenant ID
    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("tenant_id")
      .eq("user_id", user.id)
      .single()

    if (!tenantUser) {
      return NextResponse.json({ error: "User not associated with tenant" }, { status: 403 })
    }

    const body: SyncRequest = await request.json()
    const action = body.action || 'sync'

    // Test connection
    if (action === 'test') {
      const result = await testGoogleCalendarConnection(tenantUser.tenant_id)
      return NextResponse.json(result)
    }

    // Get appointments to sync
    let appointmentsQuery = supabase
      .from("appointments")
      .select(`
        id,
        title,
        description,
        starts_at,
        ends_at,
        location,
        google_event_id,
        customers:customer_id(email, first_name, last_name)
      `)
      .eq("tenant_id", tenantUser.tenant_id)
      .is("deleted_at", null)
      .gte("starts_at", new Date().toISOString()) // Only future appointments

    if (body.appointment_ids && body.appointment_ids.length > 0) {
      appointmentsQuery = appointmentsQuery.in("id", body.appointment_ids)
    }

    const { data: appointments, error: appointmentsError } = await appointmentsQuery.limit(100)

    if (appointmentsError) {
      console.error("[Calendar Sync] Failed to fetch appointments:", appointmentsError)
      return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 })
    }

    if (!appointments || appointments.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        message: "No appointments to sync",
      })
    }

    // Sync each appointment
    const results = await Promise.allSettled(
      appointments.map(async (apt) => {
        const customer = apt.customers as { email?: string; first_name?: string; last_name?: string } | null
        
        const result = await syncAppointmentToGoogle(tenantUser.tenant_id, {
          id: apt.id,
          title: apt.title,
          description: apt.description || undefined,
          starts_at: apt.starts_at,
          ends_at: apt.ends_at,
          location: apt.location || undefined,
          customer_email: customer?.email,
          customer_name: customer ? `${customer.first_name} ${customer.last_name}`.trim() : undefined,
          google_event_id: apt.google_event_id || undefined,
        })

        // Update appointment with Google event ID if newly created
        if (result.success && result.eventId && !apt.google_event_id) {
          await supabase
            .from("appointments")
            .update({ google_event_id: result.eventId })
            .eq("id", apt.id)
        }

        return {
          appointment_id: apt.id,
          ...result,
        }
      })
    )

    const synced = results.filter(r => r.status === 'fulfilled' && (r.value as { success: boolean }).success).length
    const failed = results.filter(r => r.status === 'rejected' || !(r.value as { success: boolean }).success).length

    return NextResponse.json({
      success: true,
      synced,
      failed,
      total: appointments.length,
      details: results.map(r => r.status === 'fulfilled' ? r.value : { error: 'Failed' }),
    })
  } catch (error) {
    console.error("[Calendar Sync] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
