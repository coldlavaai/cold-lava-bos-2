import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export interface PhoneSettings {
  voicemail_enabled: boolean
  voicemail_greeting: string
  ring_timeout: number
  recording_enabled: boolean
  record_from: 'record-from-answer' | 'record-from-ringing'
  transcription_enabled: boolean
  ai_summary_enabled: boolean
  caller_id: string
}

const DEFAULT_PHONE_SETTINGS: PhoneSettings = {
  voicemail_enabled: true,
  voicemail_greeting:
    "Sorry, we can't take your call right now. Please leave a message after the beep.",
  ring_timeout: 20,
  recording_enabled: true,
  record_from: 'record-from-answer',
  transcription_enabled: false,
  ai_summary_enabled: false,
  caller_id: process.env.TWILIO_PHONE_NUMBER || '+447480486658',
}

/**
 * GET /api/settings/phone
 * Returns the phone settings for the current tenant.
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const { data: tenantUser, error: tuError } = await adminClient
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    if (tuError || !tenantUser) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
    }

    const { data: tenant, error: tenantError } = await adminClient
      .from('tenants')
      .select('settings')
      .eq('id', tenantUser.tenant_id)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const phoneSettings: PhoneSettings = {
      ...DEFAULT_PHONE_SETTINGS,
      ...(tenant.settings?.phone_settings || {}),
      // Always use the env var for caller_id
      caller_id: process.env.TWILIO_PHONE_NUMBER || '+447480486658',
    }

    return NextResponse.json(phoneSettings)
  } catch (err) {
    console.error('[api/settings/phone] GET error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/settings/phone
 * Updates the phone settings for the current tenant.
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const { data: tenantUser, error: tuError } = await adminClient
      .from('tenant_users')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single()

    if (tuError || !tenantUser) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
    }

    if (tenantUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can update phone settings' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate and sanitize input
    const updatedSettings: Omit<PhoneSettings, 'caller_id'> = {
      voicemail_enabled: Boolean(body.voicemail_enabled),
      voicemail_greeting:
        typeof body.voicemail_greeting === 'string'
          ? body.voicemail_greeting.slice(0, 500)
          : DEFAULT_PHONE_SETTINGS.voicemail_greeting,
      ring_timeout: Math.min(60, Math.max(5, Number(body.ring_timeout) || 20)),
      recording_enabled: Boolean(body.recording_enabled),
      record_from:
        body.record_from === 'record-from-ringing'
          ? 'record-from-ringing'
          : 'record-from-answer',
      transcription_enabled: Boolean(body.transcription_enabled),
      ai_summary_enabled: Boolean(body.ai_summary_enabled),
    }

    // Get current tenant settings
    const { data: tenant, error: tenantError } = await adminClient
      .from('tenants')
      .select('settings')
      .eq('id', tenantUser.tenant_id)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const newSettings = {
      ...(tenant.settings || {}),
      phone_settings: updatedSettings,
    }

    const { error: updateError } = await adminClient
      .from('tenants')
      .update({ settings: newSettings })
      .eq('id', tenantUser.tenant_id)

    if (updateError) {
      console.error('[api/settings/phone] Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to save settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ...updatedSettings,
      caller_id: process.env.TWILIO_PHONE_NUMBER || '+447480486658',
    })
  } catch (err) {
    console.error('[api/settings/phone] PUT error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
