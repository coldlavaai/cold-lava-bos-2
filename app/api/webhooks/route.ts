import { NextRequest, NextResponse } from 'next/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { getTenantWebhooks, addTenantWebhook, updateTenantWebhook, deleteTenantWebhook } from '@/lib/webhooks/webhook'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

/**
 * Webhook Management Endpoints
 * Session 63 - Phase API-3
 *
 * GET    /api/webhooks - List webhooks
 * POST   /api/webhooks - Create webhook
 * PATCH  /api/webhooks?id=xxx - Update webhook
 * DELETE /api/webhooks?id=xxx - Delete webhook
 */

export async function GET() {
  try {
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 })
    }

    const webhooks = await getTenantWebhooks(tenantId)

    return NextResponse.json({ data: webhooks })
  } catch (error) {
    console.error('[GET /api/webhooks] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 })
    }

    const body = await request.json()
    const { url, events, description } = body

    // Validate
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'At least one event is required' }, { status: 400 })
    }

    // Get user ID
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const webhook = await addTenantWebhook(tenantId, url, events, description, user?.id || null)

    return NextResponse.json({ data: webhook }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/webhooks] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const webhookId = searchParams.get('id')

    if (!webhookId) {
      return NextResponse.json({ error: 'Webhook ID is required' }, { status: 400 })
    }

    const body = await request.json()
    await updateTenantWebhook(tenantId, webhookId, body)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[PATCH /api/webhooks] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const webhookId = searchParams.get('id')

    if (!webhookId) {
      return NextResponse.json({ error: 'Webhook ID is required' }, { status: 400 })
    }

    await deleteTenantWebhook(tenantId, webhookId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/webhooks] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
