import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/messages/threads/:id - Get messages in a thread
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const { id } = await params

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    // First, verify the thread exists and belongs to this tenant
    const { data: thread, error: threadError } = await supabase
      .from('message_threads')
      .select(`
        *,
        customer:customers(id, name, email, phone)
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (threadError) {
      if (threadError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Thread not found' },
          { status: 404 }
        )
      }

      console.error('Error fetching thread:', threadError)
      return NextResponse.json(
        { error: threadError.message },
        { status: 500 }
      )
    }

    // Get all messages in the thread
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        *,
        creator:users!messages_created_by_fkey(id, name, email)
      `)
      .eq('thread_id', id)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('Error fetching messages:', messagesError)
      return NextResponse.json(
        { error: messagesError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        thread,
        messages: messages || [],
      },
    })
  } catch (error) {
    console.error('Error in GET /api/messages/threads/:id:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
