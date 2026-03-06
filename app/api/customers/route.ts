import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { fetchAndCacheCustomerSolarData } from '@/lib/services/solar-data-fetcher'

// GET /api/customers - List customers with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    // DEBUG: Log auth and tenant context
    const { data: { user } } = await supabase.auth.getUser()
    console.log('[/api/customers] DEBUG context', {
      tenantId,
      userId: user?.id,
      hasAuth: !!user,
      headerTenantId: headersList.get('x-tenant-id'),
      headerUserId: headersList.get('x-user-id'),
    })

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search')
    const source = searchParams.get('source')

    // Build query
    let query = supabase
      .from('customers')
      .select('*, source:customer_sources(name)', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,city.ilike.%${search}%,postcode.ilike.%${search}%`)
    }

    if (source) {
      query = query.eq('source_id', source)
    }

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    // DEBUG: Log query result
    console.log('[/api/customers] DEBUG query result', {
      dataCount: data?.length || 0,
      totalCount: count,
      hasError: !!error,
      error: error ? { message: error.message, code: error.code } : null,
    })

    if (error) {
      console.error('Error fetching customers:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data || [],
      meta: {
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      },
    })
  } catch (error) {
    console.error('Error in GET /api/customers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/customers - Create new customer
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Validate required fields
    if (!body.name || !body.email) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email' },
        { status: 400 }
      )
    }

    // Create customer
    const { data, error } = await supabase
      .from('customers')
      .insert({
        tenant_id: tenantId,
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        address_line_1: body.address_line_1 || null,
        address_line_2: body.address_line_2 || null,
        city: body.city || null,
        postcode: body.postcode || null,
        source_id: body.source_id || null,
        notes: body.notes || null,
        created_by: headersList.get('x-user-id'),
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation - identify which constraint
        const detail = error.details || error.message || ''
        if (detail.includes('job_number')) {
          // Race condition on job number generation - retry once
          console.warn('Job number collision during customer creation, retrying...')
          const retry = await supabase
            .from('customers')
            .insert({
              tenant_id: tenantId,
              name: body.name,
              email: body.email,
              phone: body.phone || null,
              address_line_1: body.address_line_1 || null,
              address_line_2: body.address_line_2 || null,
              city: body.city || null,
              postcode: body.postcode || null,
              source_id: body.source_id || null,
              notes: body.notes || null,
              created_by: headersList.get('x-user-id'),
            })
            .select()
            .single()
          
          if (retry.error) {
            console.error('Retry also failed creating customer:', retry.error)
            return NextResponse.json(
              { error: 'Failed to create customer. Please try again.' },
              { status: 500 }
            )
          }
          // Use retry data
          const retryData = retry.data
          if (retryData.postcode && retryData.address_line_1) {
            fetchAndCacheCustomerSolarData(retryData.id, {
              postcode: retryData.postcode,
              addressLine1: retryData.address_line_1,
            }).catch((err: unknown) => {
              console.error('[POST /api/customers] Background solar fetch error:', err)
            })
          }
          return NextResponse.json({ data: retryData }, { status: 201 })
        }
        
        return NextResponse.json(
          { error: 'A duplicate record was detected. Please check the details and try again.' },
          { status: 409 }
        )
      }

      console.error('Error creating customer:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // SOLAR-SPECIFIC: Background solar data fetch disabled for Cold Lava
    // if (data.postcode && data.address_line_1) {
    //   fetchAndCacheCustomerSolarData(...)
    // }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/customers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
