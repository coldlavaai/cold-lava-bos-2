import { NextResponse } from "next/server"
import twilio from "twilio"
import { createClient } from "@/lib/supabase/server"

const { AccessToken } = twilio.jwt
const { VoiceGrant } = AccessToken

/**
 * POST /api/calls/token
 * Generates a Twilio Access Token with a Voice Grant for the browser SDK.
 * Token expires in 1 hour.
 */
export async function POST() {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim()
    const apiKeySid = process.env.TWILIO_API_KEY_SID?.trim()
    const apiKeySecret = process.env.TWILIO_API_KEY_SECRET?.trim()
    const twimlAppSid = process.env.TWILIO_TWIML_APP_SID?.trim()

    if (!accountSid || !apiKeySid || !apiKeySecret || !twimlAppSid) {
      return NextResponse.json(
        { error: "Voice calling not configured. Missing: " + 
          [!accountSid && "ACCOUNT_SID", !apiKeySid && "API_KEY_SID", !apiKeySecret && "API_KEY_SECRET", !twimlAppSid && "TWIML_APP_SID"].filter(Boolean).join(", ") },
        { status: 503 }
      )
    }

    // Get the current user for identity
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use "bos_agent" as shared identity so inbound calls ring all connected browsers
    // The TwiML route dials client:bos_agent for inbound calls
    const identity = "bos_agent"

    const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, {
      identity,
      ttl: 3600,
    })

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: true,
    })
    token.addGrant(voiceGrant)

    return NextResponse.json({ token: token.toJwt(), identity })
  } catch (err) {
    console.error("[calls/token]", err)
    return NextResponse.json({ error: "Failed to generate token" }, { status: 500 })
  }
}
