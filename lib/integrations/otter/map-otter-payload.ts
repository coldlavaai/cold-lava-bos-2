/**
 * Session 92: Call Recordings & Otter Foundation
 * Helper to map Otter.ai webhook payloads to BOS CreateCallRecordingRequest format
 */

import type { CreateCallRecordingRequest } from '@/lib/api/types'

/**
 * Otter.ai webhook payload structure (based on Otter API v1)
 * Reference: https://otter.ai/developer/api-reference
 *
 * Note: This is a simplified representation. Actual Otter webhooks may include
 * additional fields. Adjust as needed when implementing real Otter integration.
 */
export interface OtterWebhookPayload {
  // Unique identifier for the speech/conversation
  speech_id: string

  // Meeting/conversation metadata
  title?: string
  summary?: string
  start_time?: string // ISO 8601 timestamp
  end_time?: string   // ISO 8601 timestamp
  duration?: number   // seconds

  // Transcript data
  transcript?: {
    speakers?: Array<{
      speaker_id: string
      speaker_name?: string
    }>
    segments?: Array<{
      speaker_id: string
      text: string
      start_time: number
      end_time: number
    }>
  }

  // Full transcript text (pre-formatted)
  transcript_text?: string

  // Action items extracted by Otter AI
  action_items?: Array<{
    text: string
    speaker_id?: string
    timestamp?: number
  }>

  // Audio URL (if available)
  audio_url?: string

  // Meeting URL (Otter's web UI)
  otter_url?: string

  // Language code
  language?: string

  // Custom fields (for BOS linkage - if you pass them when creating the Otter meeting)
  metadata?: {
    job_id?: string
    customer_id?: string
    message_thread_id?: string
  }
}

/**
 * Maps an Otter.ai webhook payload to BOS CreateCallRecordingRequest format
 *
 * @param payload - The webhook payload from Otter.ai
 * @param options - Optional overrides for linkage fields
 * @returns CreateCallRecordingRequest ready for POST /api/call-recordings
 *
 * @example
 * ```typescript
 * const otterPayload = await request.json()
 * const recordingRequest = mapOtterPayloadToCallRecording(otterPayload, {
 *   job_id: 'xxx-yyy-zzz', // Override if not in metadata
 * })
 *
 * // POST to our API
 * await fetch('/api/call-recordings', {
 *   method: 'POST',
 *   body: JSON.stringify(recordingRequest),
 * })
 * ```
 */
export function mapOtterPayloadToCallRecording(
  payload: OtterWebhookPayload,
  options?: {
    job_id?: string
    customer_id?: string
    message_thread_id?: string
  }
): CreateCallRecordingRequest {
  // Build full transcript from segments if transcript_text not provided
  const transcriptText = payload.transcript_text || buildTranscriptFromSegments(payload.transcript)

  // Map action items to BOS format
  const actionItems = payload.action_items?.map(item => ({
    text: item.text,
    // owner_user_id and due_date could be added here if Otter provides them
  }))

  return {
    // Linkage to BOS entities (from metadata or options)
    job_id: options?.job_id || payload.metadata?.job_id,
    customer_id: options?.customer_id || payload.metadata?.customer_id,
    message_thread_id: options?.message_thread_id || payload.metadata?.message_thread_id,

    // Provider information
    provider: 'otter',
    provider_call_id: payload.speech_id,
    provider_meeting_url: payload.otter_url,

    // Media & transcription
    audio_url: payload.audio_url,
    transcript: transcriptText,
    summary: payload.summary,
    action_items: actionItems,
    language: payload.language || 'en',

    // Call metadata
    // Note: Otter doesn't provide direction (inbound/outbound) - could be inferred from metadata
    started_at: payload.start_time,
    ended_at: payload.end_time,
    duration_seconds: payload.duration,
  }
}

/**
 * Helper to build a formatted transcript from Otter's segment structure
 */
function buildTranscriptFromSegments(transcript?: OtterWebhookPayload['transcript']): string | undefined {
  if (!transcript?.segments || transcript.segments.length === 0) {
    return undefined
  }

  // Build speaker name map
  const speakerMap = new Map<string, string>()
  transcript.speakers?.forEach(speaker => {
    speakerMap.set(speaker.speaker_id, speaker.speaker_name || `Speaker ${speaker.speaker_id}`)
  })

  // Format segments as "Speaker Name: text"
  return transcript.segments
    .map(segment => {
      const speakerName = speakerMap.get(segment.speaker_id) || `Speaker ${segment.speaker_id}`
      return `${speakerName}: ${segment.text}`
    })
    .join('\n\n')
}

/**
 * Validates that an Otter webhook payload has minimum required fields
 * Use this in your webhook handler before calling the mapper
 */
export function validateOtterPayload(payload: unknown): payload is OtterWebhookPayload {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  const p = payload as Partial<OtterWebhookPayload>

  // Minimum requirement: must have a speech_id
  return typeof p.speech_id === 'string' && p.speech_id.length > 0
}
