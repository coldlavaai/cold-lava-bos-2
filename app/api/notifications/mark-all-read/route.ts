import { createAdminClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders, getUserIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/notifications/mark-all-read - Mark all notifications as read
// Optional body: { type?: 'feed' | 'reminder' | 'system' }
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const userId = await getUserIdFromHeaders(headersList)

    if (!tenantId || !userId) {
      return NextResponse.json(
        { error: 'No tenant or user context' },
        { status: 400 }
      )
    }

    let type: string | undefined
    try {
      const body = await request.json()
      type = body?.type
    } catch {
      // No body or invalid JSON — mark all types
    }

    let query = supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .or(`user_id.eq.${userId},user_id.is.null`)
      .eq('is_read', false)

    if (type) {
      query = query.eq('type', type)
    }

    const { error } = await query

    if (error) {
      console.error('Error marking notifications as read:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in POST /api/notifications/mark-all-read:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
