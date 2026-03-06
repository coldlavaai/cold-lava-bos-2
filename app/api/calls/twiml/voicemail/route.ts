import { NextRequest, NextResponse } from "next/server"
import twilio from "twilio"
import { createClient } from "@supabase/supabase-js"
import { phoneVariations } from "@/lib/integrations/twilio"

const VoiceResponse = twilio.twiml.VoiceResponse

/**
 * POST /api/calls/twiml/voicemail
 *
 * Called by Twilio as the `action` URL when the <Dial> to the browser client
 * completes. If the call was answered and completed normally, we return an
 * empty response. If it was not answered (no-answer, busy, failed), we play
 * a voicemail greeting and record the caller's message.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const params = Object.fromEntries(new URLSearchParams(body))

    const dialCallStatus = params.DialCallStatus || ""
    const callSid = params.CallSid || ""
    const appBaseUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://cl-solarbos-jan-26.vercel.app"
    ).trim()

    const recordingStatusCallback = `${appBaseUrl}/api/webhooks/twilio/voice/recording`

    const from = params.From || ""
    const to = params.To || ""
    const duration = params.DialCallDuration || params.Duration || ""

    console.log(
      `[calls/twiml/voicemail] CallSid=${callSid} DialCallStatus=${dialCallStatus} From=${from}`
    )

    // Create/update call record for inbound calls (parent CallSid)
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const customerPhone = from
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

      if (!tenantId) {
        const { data: tenant } = await supabase
          .from("tenants")
          .select("id")
          .eq("is_active", true)
          .limit(1)
          .single()
        tenantId = tenant?.id ?? null
      }

      if (tenantId) {
        const summary = dialCallStatus === "completed"
          ? null
          : `Inbound call — ${dialCallStatus}${customerId ? "" : ` from ${customerPhone}`}`

        await supabase
          .from("call_recordings")
          .upsert(
            {
              tenant_id: tenantId,
              customer_id: customerId,
              job_id: jobId,
              provider: "twilio",
              provider_call_id: callSid,
              direction: "inbound",
              duration_seconds: duration ? parseInt(duration) : null,
              started_at: new Date().toISOString(),
              summary,
            },
            { onConflict: "provider_call_id" }
          )
        console.log(`[calls/twiml/voicemail] Upserted inbound call record for ${callSid}`)
      }
    } catch (dbErr) {
      console.error("[calls/twiml/voicemail] DB error:", dbErr)
    }

    const twiml = new VoiceResponse()

    if (dialCallStatus === "completed") {
      // Call was answered and completed normally — nothing to do
      return new NextResponse(twiml.toString(), {
        headers: { "Content-Type": "text/xml" },
      })
    }

    // no-answer, busy, failed, cancel — play voicemail greeting and record
    twiml.say(
      { voice: "alice" },
      "Sorry, we can't take your call right now. Please leave a message after the beep."
    )
    twiml.record({
      maxLength: 120,
      transcribe: false,
      recordingStatusCallback,
      recordingStatusCallbackMethod: "POST",
    })
    twiml.say(
      { voice: "alice" },
      "We didn't receive a recording. Goodbye."
    )

    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    })
  } catch (err) {
    console.error("[calls/twiml/voicemail]", err)
    const twiml = new VoiceResponse()
    twiml.say("An error occurred. Goodbye.")
    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    })
  }
}
