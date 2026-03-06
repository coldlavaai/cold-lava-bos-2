import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server"
import { getTenantIdFromHeaders } from "@/lib/supabase/tenant-context"
import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { phoneVariations } from "@/lib/integrations/twilio"

/**
 * POST /api/call-recordings/create-live
 * Called by the browser when a call connects to immediately create a call record.
 * This ensures the call shows in the timeline right away, before recording/transcript.
 */
export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant" }, { status: 400 })
    }

    const body = await request.json()
    const { provider_call_id, direction, customer_phone, customer_id } = body

    if (!provider_call_id) {
      return NextResponse.json({ error: "Missing provider_call_id" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Resolve customer if not provided
    let resolvedCustomerId = customer_id || null
    if (!resolvedCustomerId && customer_phone) {
      const variations = phoneVariations(customer_phone)
      if (variations.length > 0) {
        const orFilter = variations.map(p => `phone.eq.${p}`).join(",")
        const { data: customer } = await supabase
          .from("customers")
          .select("id")
          .eq("tenant_id", tenantId)
          .or(orFilter)
          .limit(1)
          .single()
        if (customer) resolvedCustomerId = customer.id
      }
    }

    // Find associated job
    let jobId: string | null = null
    if (resolvedCustomerId) {
      const { data: job } = await supabase
        .from("jobs")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("customer_id", resolvedCustomerId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()
      if (job) jobId = job.id
    }

    // Create/upsert call record
    const { data, error } = await supabase
      .from("call_recordings")
      .upsert(
        {
          tenant_id: tenantId,
          customer_id: resolvedCustomerId,
          job_id: jobId,
          provider: "twilio",
          provider_call_id,
          direction: direction || "outbound",
          started_at: new Date().toISOString(),
          created_by: user.id,
        },
        { onConflict: "provider_call_id" }
      )
      .select("id")
      .single()

    if (error) {
      console.error("[create-live] DB error:", error)
      return NextResponse.json({ error: "DB error" }, { status: 500 })
    }

    console.log(`[create-live] Created call record ${data.id} for ${provider_call_id}`)
    return NextResponse.json({ id: data.id })
  } catch (err) {
    console.error("[create-live]", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
