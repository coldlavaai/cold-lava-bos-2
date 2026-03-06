import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { phoneVariations } from "@/lib/integrations/twilio"

/**
 * POST /api/webhooks/twilio/voice/status
 * Twilio calls this when a call's status changes.
 * On "completed" we upsert the call record with duration, customer, and job links.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const params = Object.fromEntries(new URLSearchParams(body))

    const { CallSid, CallStatus, From, To, Direction, Duration, Timestamp, ParentCallSid } = params

    // Use parent SID if available — recordings always reference the parent call
    const storageSid = ParentCallSid || CallSid

    console.log(`[voice/status] ${CallSid} → ${CallStatus} (${Direction}) parent=${ParentCallSid || 'none'} storage=${storageSid}`)

    if (!["completed", "failed", "busy", "no-answer"].includes(CallStatus)) {
      return new NextResponse("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response/>", { headers: { "Content-Type": "text/xml" } })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // The customer phone is whichever end isn't our number
    const ourNumber = process.env.TWILIO_PHONE_NUMBER || ""
    const isOutbound = Direction?.startsWith("outbound")
    const customerPhone = isOutbound ? To : From

    const variations = phoneVariations(customerPhone || "")
    const orFilter = variations.map(p => `phone.eq.${p}`).join(",")

    let customerId: string | null = null
    let tenantId: string | null = null
    let jobId: string | null = null

    if (variations.length > 0) {
      const { data: customer } = await supabase
        .from("customers")
        .select("id, tenant_id")
        .or(orFilter)
        .limit(1)
        .single()

      if (customer) {
        customerId = customer.id
        tenantId = customer.tenant_id

        const { data: job } = await supabase
          .from("jobs")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        if (job) jobId = job.id
      }
    }

    // Fall back to first active tenant if customer not found
    if (!tenantId) {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("id")
        .eq("is_active", true)
        .limit(1)
        .single()
      tenantId = tenant?.id ?? null
    }

    if (!tenantId) {
      console.warn("[voice/status] Could not resolve tenant for call", CallSid)
      return new NextResponse("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response/>", { headers: { "Content-Type": "text/xml" } })
    }

    const direction = isOutbound ? "outbound" : "inbound"
    const startedAt = Timestamp ? new Date(Timestamp).toISOString() : new Date().toISOString()

    await supabase
      .from("call_recordings")
      .upsert(
        {
          tenant_id: tenantId,
          customer_id: customerId,
          job_id: jobId,
          provider: "twilio",
          provider_call_id: storageSid,
          direction,
          duration_seconds: Duration ? parseInt(Duration) : null,
          started_at: startedAt,
          summary: CallStatus !== "completed"
            ? `Call ${CallStatus}${customerId ? "" : ` from ${customerPhone || From}`}`
            : null,
        },
        { onConflict: "provider_call_id" }
      )

    // Twilio expects TwiML XML response, not JSON
    return new NextResponse("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response/>", {
      headers: { "Content-Type": "text/xml" },
    })
  } catch (err) {
    console.error("[voice/status]", err)
    return new NextResponse("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response/>", {
      headers: { "Content-Type": "text/xml" },
    })
  }
}
