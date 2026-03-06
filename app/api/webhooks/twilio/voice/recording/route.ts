import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * POST /api/webhooks/twilio/voice/recording
 * Twilio calls this when a call recording is ready.
 * We store the recording URL and kick off transcription if OpenAI is configured.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const params = Object.fromEntries(new URLSearchParams(body))

    const {
      CallSid,
      RecordingSid,
      RecordingUrl,
      RecordingDuration,
      RecordingStatus,
    } = params

    console.log(`[voice/recording] CallSid=${CallSid} RecordingSid=${RecordingSid} status=${RecordingStatus}`)

    if (RecordingStatus !== "completed") {
      return new NextResponse("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response/>", { headers: { "Content-Type": "text/xml" } })
    }

    // Twilio recording URL needs .mp3 extension for direct download
    const audioUrl = `${RecordingUrl}.mp3`

    const supabase = getServiceClient()

    // Look up the call record — try direct match first, then check child calls
    // Recording webhook posts with the parent CallSid, but our DB stores the child (outbound-dial) SID
    let existingRecord: { id: string; tenant_id: string; customer_id: string | null } | null = null

    const { data: directMatch } = await supabase
      .from("call_recordings")
      .select("id, tenant_id, customer_id")
      .eq("provider_call_id", CallSid)
      .single()

    if (directMatch) {
      existingRecord = directMatch
    } else {
      // Try finding by checking Twilio for child calls of this parent
      try {
        const accountSid = (process.env.TWILIO_ACCOUNT_SID || "").trim()
        const authToken = (process.env.TWILIO_AUTH_TOKEN || "").trim()
        const childRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json?ParentCallSid=${CallSid}&Limit=5`,
          { headers: { Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64") } }
        )
        if (childRes.ok) {
          const childData = await childRes.json() as { calls: Array<{ sid: string }> }
          const childSids = childData.calls.map(c => c.sid)
          if (childSids.length > 0) {
            const { data: childMatch } = await supabase
              .from("call_recordings")
              .select("id, tenant_id, customer_id")
              .in("provider_call_id", childSids)
              .limit(1)
              .single()
            if (childMatch) existingRecord = childMatch
          }
        }
      } catch (err) {
        console.error("[voice/recording] Error looking up child calls:", err)
      }
    }

    if (!existingRecord) {
      console.warn("[voice/recording] No call record found for CallSid:", CallSid)
      return new NextResponse("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response/>", { headers: { "Content-Type": "text/xml" } })
    }

    await supabase
      .from("call_recordings")
      .update({
        audio_url: audioUrl,
        duration_seconds: RecordingDuration ? parseInt(RecordingDuration) : null,
        provider_meeting_url: `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Recordings/${RecordingSid}`,
      })
      .eq("id", existingRecord.id)

    // Attempt AI transcription + summary if OpenAI is configured
    const openAiKey = process.env.OPENAI_API_KEY
    if (openAiKey && existingRecord.tenant_id) {
      // Fire-and-forget — don't await, don't block the Twilio webhook response
      transcribeAndSummarise({
        recordingId: existingRecord.id,
        audioUrl,
        openAiKey,
        tenantId: existingRecord.tenant_id,
        supabase: getServiceClient(),
      }).catch((err) => console.error("[voice/recording] transcription error:", err))
    }

    return new NextResponse("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response/>", { headers: { "Content-Type": "text/xml" } })
  } catch (err) {
    console.error("[voice/recording]", err)
    return new NextResponse("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response/>", { headers: { "Content-Type": "text/xml" } })
  }
}

async function transcribeAndSummarise({
  recordingId,
  audioUrl,
  openAiKey,
  tenantId: _tenantId,
  supabase,
}: {
  recordingId: string
  audioUrl: string
  openAiKey: string
  tenantId: string
  supabase: ReturnType<typeof getServiceClient>
}) {
  // Download audio from Twilio (requires auth)
  const accountSid = process.env.TWILIO_ACCOUNT_SID!
  const authToken = process.env.TWILIO_AUTH_TOKEN!
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64")

  const audioResponse = await fetch(audioUrl, {
    headers: { Authorization: `Basic ${credentials}` },
  })

  if (!audioResponse.ok) {
    throw new Error(`Failed to download recording: ${audioResponse.status}`)
  }

  const audioBuffer = await audioResponse.arrayBuffer()
  const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" })

  // Transcribe with Whisper
  const formData = new FormData()
  formData.append("file", audioBlob, "recording.mp3")
  formData.append("model", "whisper-1")
  formData.append("language", "en")

  const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAiKey}` },
    body: formData,
  })

  if (!whisperRes.ok) {
    throw new Error(`Whisper failed: ${whisperRes.status}`)
  }

  const { text: transcript } = await whisperRes.json() as { text: string }

  // Summarise with GPT-4o-mini (fast, cheap)
  const summaryRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are summarising a sales call for a business CRM.
Write a concise 2-4 sentence summary of the call. Then list 1-3 action items if any were mentioned.
Format: {"summary": "...", "action_items": ["...", "..."]}
Return only valid JSON.`,
        },
        { role: "user", content: transcript },
      ],
      max_tokens: 300,
      temperature: 0.3,
    }),
  })

  let summary = ""
  let actionItems: string[] = []

  if (summaryRes.ok) {
    const summaryData = await summaryRes.json() as { choices: Array<{ message: { content: string } }> }
    try {
      const parsed = JSON.parse(summaryData.choices[0].message.content)
      summary = parsed.summary || ""
      actionItems = parsed.action_items || []
    } catch {
      summary = summaryData.choices[0].message.content
    }
  }

  // Save transcript + summary
  await supabase
    .from("call_recordings")
    .update({
      transcript,
      summary,
      action_items: actionItems.length ? actionItems : null,
    })
    .eq("id", recordingId)

  console.log(`[voice/recording] Transcription complete for recording ${recordingId}`)
}
