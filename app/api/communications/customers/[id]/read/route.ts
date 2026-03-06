import { createAdminClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// PATCH /api/communications/customers/[id]/read - Mark all communications as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createAdminClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const { id: customerId } = await params

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 })
    }

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID required' }, { status: 400 })
    }

    // Mark all threads for this customer as read
    const { error } = await supabase
      .from('message_threads')
      .update({ is_read: true })
      .eq('tenant_id', tenantId)
      .eq('customer_id', customerId)
      .eq('is_read', false)

    if (error) {
      console.error('Error marking threads as read:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PATCH /api/communications/customers/[id]/read:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
