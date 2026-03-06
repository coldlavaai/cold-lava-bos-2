import { NextRequest, NextResponse } from "next/server"
import twilio from "twilio"
import { ensureE164 } from "@/lib/integrations/twilio"

const VoiceResponse = twilio.twiml.VoiceResponse

/**
 * POST /api/calls/twiml
 * TwiML generator — Twilio calls this to determine how to handle a call.
 *
 * Outbound: browser dials a customer → Twilio posts here with To=+447xxx
 *           We respond with <Dial> to connect to that number, recording enabled.
 *
 * Inbound:  Customer dials +447480486658 → Twilio posts here with To=+447480486658
 *           We respond with <Dial><Client> to ring the browser.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const params = Object.fromEntries(new URLSearchParams(body))

    const to = params.To || ""
    const from = params.From || ""
    const callSid = params.CallSid || ""
    const ourNumber = (process.env.TWILIO_PHONE_NUMBER || "").trim()
    const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://cl-solarbos-jan-26.vercel.app").trim()

    const recordingStatusCallback = `${appBaseUrl}/api/webhooks/twilio/voice/recording`
    const statusCallback = `${appBaseUrl}/api/webhooks/twilio/voice/status`

    const twiml = new VoiceResponse()

    // Inbound call: someone is ringing our Twilio number
    // If unanswered after 20s, Dial action fires → voicemail endpoint handles fallback
    if (to === ourNumber || to.replace("whatsapp:", "") === ourNumber) {
      const voicemailAction = `${appBaseUrl}/api/calls/twiml/voicemail`
      const dial = twiml.dial({
        callerId: from,
        timeout: 20,
        record: "record-from-answer",
        recordingStatusCallback,
        recordingStatusCallbackMethod: "POST",
        action: voicemailAction,
      })
      dial.client({
        statusCallback,
        statusCallbackMethod: "POST",
        statusCallbackEvent: ["completed"],
      }, "bos_agent")
    } else {
      // Outbound call: browser is dialling a customer phone number
      const dial = twiml.dial({
        callerId: ourNumber,
        record: "record-from-answer",
        recordingStatusCallback,
        recordingStatusCallbackMethod: "POST",
        action: statusCallback,
      })
      dial.number(ensureE164(to))
    }

    console.log(`[calls/twiml] CallSid=${callSid} To=${to} From=${from}`)

    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    })
  } catch (err) {
    console.error("[calls/twiml]", err)
    const twiml = new twilio.twiml.VoiceResponse()
    twiml.say("An error occurred. Please try again.")
    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    })
  }
}
