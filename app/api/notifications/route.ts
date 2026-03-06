import { createAdminClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders, getUserIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/notifications - List notifications for current user
// Supports: ?type=feed|reminder|system &page=1 &limit=20 &read=true|false
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const type = searchParams.get('type') // 'feed', 'reminder', 'system'
    const read = searchParams.get('read')

    // Build query - scoped to current user and tenant
    // Includes notifications targeted at this user OR all users (user_id IS NULL)
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .or(`user_id.eq.${userId},user_id.is.null`)
      .eq('dismissed', false)
      .order('created_at', { ascending: false })

    // Filter by type
    if (type) {
      query = query.eq('type', type)
    }

    // Filter by read status
    if (read !== null && read !== undefined) {
      query = query.eq('is_read', read === 'true')
    }

    // Apply pagination
    const rangeFrom = (page - 1) * limit
    const rangeTo = rangeFrom + limit - 1
    query = query.range(rangeFrom, rangeTo)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching notifications:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Get unread counts per type
    const unreadQuery = async (notifType?: string) => {
      let q = supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .or(`user_id.eq.${userId},user_id.is.null`)
        .eq('is_read', false)
        .eq('dismissed', false)

      if (notifType) {
        q = q.eq('type', notifType)
      }

      const { count: c } = await q
      return c || 0
    }

    const [totalUnread, feedUnread, reminderUnread, systemUnread] = await Promise.all([
      unreadQuery(),
      unreadQuery('feed'),
      unreadQuery('reminder'),
      unreadQuery('system'),
    ])

    return NextResponse.json({
      data: data || [],
      meta: {
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
        unread_count: totalUnread,
        unread_by_type: {
          feed: feedUnread,
          reminder: reminderUnread,
          system: systemUnread,
        },
      },
    })
  } catch (error) {
    console.error('Error in GET /api/notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/notifications - Bulk update (mark as read / dismiss)
// Body: { ids: string[], is_read?: boolean, dismissed?: boolean }
export async function PATCH(request: NextRequest) {
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

    const body = await request.json()
    const { ids, is_read, dismissed } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'ids array is required' },
        { status: 400 }
      )
    }

    const updates: Record<string, unknown> = {}
    if (is_read !== undefined) {
      updates.is_read = is_read
      if (is_read) updates.read_at = new Date().toISOString()
    }
    if (dismissed !== undefined) {
      updates.dismissed = dismissed
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid update fields provided' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('notifications')
      .update(updates)
      .in('id', ids)
      .eq('tenant_id', tenantId)
      .or(`user_id.eq.${userId},user_id.is.null`)
      .select()

    if (error) {
      console.error('Error updating notifications:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data, updated: data?.length || 0 })
  } catch (error) {
    console.error('Error in PATCH /api/notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
