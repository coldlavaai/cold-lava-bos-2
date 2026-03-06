import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders, getUserIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'

// GET - Fetch all signatures for the user
export async function GET(_request: NextRequest) {
  try {
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const userId = await getUserIdFromHeaders(headersList)

    if (!tenantId || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    const { data: signatures, error } = await supabase
      .from('email_signatures')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching signatures:', error)
      return NextResponse.json({ error: 'Failed to fetch signatures' }, { status: 500 })
    }

    return NextResponse.json({ signatures })
  } catch (error: unknown) {
    console.error('Error in GET /api/signatures:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new signature
export async function POST(request: NextRequest) {
  try {
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const userId = await getUserIdFromHeaders(headersList)

    if (!tenantId || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const body = await request.json()
    const { name, html_content, text_content, is_default, source = 'manual', integration_id } = body

    if (!name || !html_content) {
      return NextResponse.json(
        { error: 'Name and HTML content are required' },
        { status: 400 }
      )
    }

    const { data: signature, error } = await supabase
      .from('email_signatures')
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        name,
        html_content,
        text_content,
        is_default: is_default || false,
        source,
        integration_id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating signature:', error)
      return NextResponse.json({ error: 'Failed to create signature' }, { status: 500 })
    }

    return NextResponse.json({ signature })
  } catch (error: unknown) {
    console.error('Error in POST /api/signatures:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 })
  }
}
