import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders, getUserIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// PATCH /api/notifications/[id] - Update a notification (mark as read)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
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

    const { data, error } = await supabase
      .from('notifications')
      .update({ 
        is_read: body.read ?? true,
        read_at: body.read ? new Date().toISOString() : null
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating notification:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in PATCH /api/notifications/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
