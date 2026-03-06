import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { BulkImportCustomersSchema } from '@/lib/api/validation'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ZodError } from 'zod'

/**
 * POST /api/import/customers - Bulk import customers with upsert
 * Session 62 - Phase API-2
 *
 * Accepts an array of customers and upserts them by email.
 * Returns a summary with successes, errors, and statistics.
 */

// Helper to upsert customer by email (reused from leads endpoint)
async function upsertCustomer(
  supabase: SupabaseClient,
  tenantId: string,
  customerData: {
    name: string
    email: string
    phone?: string | null
    address_line_1?: string | null
    address_line_2?: string | null
    city?: string | null
    postcode?: string | null
    notes?: string | null
  },
  userId: string | null
): Promise<{ id: string; created: boolean }> {
  // First, try to find existing customer by email
  const { data: existingCustomer, error: findError } = await supabase
    .from('customers')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('email', customerData.email)
    .maybeSingle()

  if (findError) {
    throw new Error(`Failed to check for existing customer: ${findError.message}`)
  }

  // If customer exists, update and return ID
  if (existingCustomer) {
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        name: customerData.name,
        phone: customerData.phone,
        address_line_1: customerData.address_line_1,
        address_line_2: customerData.address_line_2,
        city: customerData.city,
        postcode: customerData.postcode,
        notes: customerData.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingCustomer.id)

    if (updateError) {
      throw new Error(`Failed to update customer: ${updateError.message}`)
    }

    return { id: existingCustomer.id, created: false }
  }

  // Otherwise, create new customer
  const { data: newCustomer, error: insertError } = await supabase
    .from('customers')
    .insert({
      tenant_id: tenantId,
      name: customerData.name,
      email: customerData.email,
      phone: customerData.phone,
      address_line_1: customerData.address_line_1,
      address_line_2: customerData.address_line_2,
      city: customerData.city,
      postcode: customerData.postcode,
      notes: customerData.notes,
      created_by: userId,
    })
    .select('id')
    .single()

  if (insertError || !newCustomer) {
    throw new Error(`Failed to create customer: ${insertError?.message || 'Unknown error'}`)
  }

  return { id: newCustomer.id, created: true }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    // Get user ID (may be null for API key auth in future)
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || headersList.get('x-user-id')

    console.log('[POST /api/import/customers] Request received', {
      tenantId,
      userId,
      hasAuth: !!user,
    })

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    // Parse and validate request body
    const rawBody = await request.json()

    let validatedData
    try {
      validatedData = BulkImportCustomersSchema.parse(rawBody)
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: error.errors.map(e => ({
              path: e.path.join('.'),
              message: e.message,
            }))
          },
          { status: 400 }
        )
      }
      throw error
    }

    console.log('[POST /api/import/customers] Processing customers', {
      count: validatedData.customers.length,
    })

    // Process each customer
    const results = {
      total: validatedData.customers.length,
      created: 0,
      updated: 0,
      errors: [] as Array<{ row: number; email: string; error: string }>,
    }

    for (let i = 0; i < validatedData.customers.length; i++) {
      const customer = validatedData.customers[i]
      try {
        const result = await upsertCustomer(supabase, tenantId, customer, userId)
        if (result.created) {
          results.created++
        } else {
          results.updated++
        }
      } catch (error) {
        console.error(`Error processing customer at row ${i}:`, error)
        results.errors.push({
          row: i + 1,
          email: customer.email,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    console.log('[POST /api/import/customers] Import completed', results)

    return NextResponse.json({
      success: results.errors.length === 0,
      data: results,
      message: `Import completed: ${results.created} created, ${results.updated} updated, ${results.errors.length} errors`,
    }, { status: 200 })

  } catch (error) {
    console.error('Error in POST /api/import/customers:', error)

    // Return structured error for known issues
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
