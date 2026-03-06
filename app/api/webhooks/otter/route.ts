import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decryptCredentials } from '@/lib/security/credentials-encryption'
import { mapOtterPayloadToCallRecording, validateOtterPayload } from '@/lib/integrations/otter'
import type { CreateCallRecordingRequest } from '@/lib/api/types'

/**
 * POST /api/webhooks/otter
 * Webhook endpoint for Otter.ai to send call recordings and transcripts
 * Session 93: Otter webhook integration
 *
 * Expected header: X-BOS-Otter-Secret with the webhook secret
 */
export async function POST(request: NextRequest) {
  try {
    // Get the secret from header
    const providedSecret = request.headers.get('X-BOS-Otter-Secret')

    if (!providedSecret) {
      console.error('[Otter Webhook] Missing X-BOS-Otter-Secret header')
      return NextResponse.json(
        { error: 'Missing webhook secret header' },
        { status: 401 }
      )
    }

    // Parse request body
    const payload = await request.json()

    // Validate payload structure
    if (!validateOtterPayload(payload)) {
      console.error('[Otter Webhook] Invalid payload structure')
      return NextResponse.json(
        { error: 'Invalid Otter payload' },
        { status: 400 }
      )
    }

    // Determine tenant from metadata or use first configured tenant
    // For Session 93, we'll use the first tenant that has Otter configured
    const supabase = await createClient()

    // Query all active Otter integrations to find matching secret
    const { data: integrations, error: integrationsError } = await supabase
      .from('integration_connections')
      .select('*')
      .eq('integration_type', 'otter')
      .eq('is_active', true)

    if (integrationsError || !integrations || integrations.length === 0) {
      console.error('[Otter Webhook] No active Otter integrations found')
      return NextResponse.json(
        { error: 'No active Otter integration configured' },
        { status: 401 }
      )
    }

    // Find integration with matching secret
    let matchingIntegration = null
    let tenantId = null

    for (const integration of integrations) {
      const credentials = decryptCredentials(integration.credentials)
      if (credentials?.webhook_secret === providedSecret) {
        matchingIntegration = integration
        tenantId = integration.tenant_id
        break
      }
    }

    if (!matchingIntegration || !tenantId) {
      console.error('[Otter Webhook] Invalid webhook secret')
      return NextResponse.json(
        { error: 'Invalid webhook secret' },
        { status: 401 }
      )
    }

    console.log('[Otter Webhook] Authenticated webhook for tenant:', tenantId)

    // Map Otter payload to CallRecording format
    const recordingRequest: CreateCallRecordingRequest = mapOtterPayloadToCallRecording(payload)

    // Prepare data for upsert
    const recordingData = {
      tenant_id: tenantId,
      customer_id: recordingRequest.customer_id || null,
      job_id: recordingRequest.job_id || null,
      message_thread_id: recordingRequest.message_thread_id || null,
      provider: recordingRequest.provider,
      provider_call_id: recordingRequest.provider_call_id || null,
      provider_meeting_url: recordingRequest.provider_meeting_url || null,
      audio_url: recordingRequest.audio_url || null,
      transcript: recordingRequest.transcript || null,
      summary: recordingRequest.summary || null,
      action_items: recordingRequest.action_items || null,
      language: recordingRequest.language || null,
      direction: recordingRequest.direction || null,
      started_at: recordingRequest.started_at || null,
      ended_at: recordingRequest.ended_at || null,
      duration_seconds: recordingRequest.duration_seconds || null,
      updated_at: new Date().toISOString(),
    }

    // Upsert logic: check if provider + provider_call_id exists
    let result
    if (recordingRequest.provider_call_id) {
      const { data: existing } = await supabase
        .from('call_recordings')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('provider', recordingRequest.provider)
        .eq('provider_call_id', recordingRequest.provider_call_id)
        .single()

      if (existing) {
        // Update existing recording
        const { data: updated, error } = await supabase
          .from('call_recordings')
          .update(recordingData)
          .eq('id', existing.id)
          .select()
          .single()

        if (error) {
          console.error('[Otter Webhook] Error updating call recording:', error)
          // Return 200 to prevent retries
          return NextResponse.json({
            success: false,
            error: 'Failed to update call recording',
          })
        }

        result = updated
        console.log('[Otter Webhook] Updated existing recording:', existing.id)
      } else {
        // Insert new recording
        const { data: inserted, error } = await supabase
          .from('call_recordings')
          .insert({
            ...recordingData,
            created_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (error) {
          console.error('[Otter Webhook] Error inserting call recording:', error)
          // Return 200 to prevent retries
          return NextResponse.json({
            success: false,
            error: 'Failed to create call recording',
          })
        }

        result = inserted
        console.log('[Otter Webhook] Created new recording:', inserted.id)
      }
    } else {
      // No provider_call_id - always insert new
      const { data: inserted, error } = await supabase
        .from('call_recordings')
        .insert({
          ...recordingData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error('[Otter Webhook] Error inserting call recording:', error)
        // Return 200 to prevent retries
        return NextResponse.json({
          success: false,
          error: 'Failed to create call recording',
        })
      }

      result = inserted
      console.log('[Otter Webhook] Created new recording:', inserted.id)
    }

    // Log summary without full transcript
    console.log('[Otter Webhook] Successfully processed:', {
      recordingId: result.id,
      provider_call_id: recordingRequest.provider_call_id,
      provider_meeting_url: recordingRequest.provider_meeting_url,
      job_id: recordingRequest.job_id,
      customer_id: recordingRequest.customer_id,
      has_transcript: !!recordingRequest.transcript,
      has_summary: !!recordingRequest.summary,
    })

    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        provider_call_id: result.provider_call_id,
      },
    })
  } catch (error) {
    console.error('[Otter Webhook] Unexpected error:', error)
    // Always return 200 to prevent retries for unexpected errors
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    })
  }
}
