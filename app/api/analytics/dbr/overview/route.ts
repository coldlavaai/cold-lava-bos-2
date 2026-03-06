/**
 * Session 105: Analytics v1 - DBR Overview
 * GET /api/analytics/dbr/overview
 *
 * Returns DBR campaign performance metrics for dashboard cards.
 * Computes metrics from dbr_campaigns and dbr_campaign_customers tables.
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getTenantIdFromHeaders } from "@/lib/supabase/tenant-context"

export interface DBRAnalyticsOverview {
  total_campaigns: number
  active_campaigns: number
  total_contacts: number
  replied_contacts: number
  reply_rate: number
  calls_booked_last_7_days: number
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const tenantId = await getTenantIdFromHeaders(request.headers)

    if (!tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const window = searchParams.get("window") || "7d"

    // Calculate date threshold for calls_booked metric
    const callsThreshold = new Date()
    if (window === "7d") {
      callsThreshold.setDate(callsThreshold.getDate() - 7)
    } else if (window === "30d") {
      callsThreshold.setDate(callsThreshold.getDate() - 30)
    }

    // Fetch all campaigns for the tenant
    const { data: campaigns, error: campaignsError } = await supabase
      .from("dbr_campaigns")
      .select("id, status")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)

    if (campaignsError) {
      console.error("[DBR Analytics] Error fetching campaigns:", campaignsError)
      return NextResponse.json(
        { error: "Failed to fetch DBR campaigns" },
        { status: 500 }
      )
    }

    const totalCampaigns = campaigns?.length || 0
    const activeCampaigns =
      campaigns?.filter((c) => c.status === "running").length || 0

    // If no campaigns exist, return zeros
    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({
        total_campaigns: 0,
        active_campaigns: 0,
        total_contacts: 0,
        replied_contacts: 0,
        reply_rate: 0,
        calls_booked_last_7_days: 0,
      } as DBRAnalyticsOverview)
    }

    const campaignIds = campaigns.map((c) => c.id)

    // Fetch all contacts across all campaigns
    const { data: contacts, error: contactsError } = await supabase
      .from("dbr_campaign_customers")
      .select("id, contact_status, call_outcome, last_called_at")
      .in("campaign_id", campaignIds)
      .is("archived", false)

    if (contactsError) {
      console.error("[DBR Analytics] Error fetching contacts:", contactsError)
      return NextResponse.json(
        { error: "Failed to fetch DBR contacts" },
        { status: 500 }
      )
    }

    const totalContacts = contacts?.length || 0

    // Count replied contacts (contact_status = 'replied' or call_outcome indicates engagement)
    const repliedContacts =
      contacts?.filter(
        (c) =>
          c.contact_status === "replied" ||
          c.contact_status === "callback_requested" ||
          c.call_outcome === "answered"
      ).length || 0

    // Calculate reply rate
    const replyRate = totalContacts > 0 ? (repliedContacts / totalContacts) * 100 : 0

    // Count calls booked in the time window
    // Assuming a call is "booked" when contact_status = 'callback_requested' or call_outcome = 'answered'
    const callsBooked =
      contacts?.filter((c) => {
        if (!c.last_called_at) return false
        const callDate = new Date(c.last_called_at)
        return (
          callDate >= callsThreshold &&
          (c.contact_status === "callback_requested" ||
            c.call_outcome === "answered")
        )
      }).length || 0

    const overview: DBRAnalyticsOverview = {
      total_campaigns: totalCampaigns,
      active_campaigns: activeCampaigns,
      total_contacts: totalContacts,
      replied_contacts: repliedContacts,
      reply_rate: Math.round(replyRate * 100) / 100, // Round to 2 decimal places
      calls_booked_last_7_days: callsBooked,
    }

    return NextResponse.json(overview)
  } catch (error) {
    console.error("[DBR Analytics] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
