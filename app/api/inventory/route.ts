/**
 * Session 109: Inventory API
 * GET /api/inventory - List inventory items
 * POST /api/inventory - Create inventory item
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface _InventoryItem {
  id: string
  tenant_id: string
  sku: string | null
  name: string
  description: string | null
  category: string | null
  item_type: 'panel' | 'inverter' | 'battery' | 'mounting' | 'cable' | 'other' // SOLAR-SPECIFIC: types from original schema, kept for DB compatibility
  manufacturer: string | null
  model: string | null
  datasheet_url: string | null
  quantity_in_stock: number
  reorder_level: number | null
  reorder_quantity: number | null
  unit_cost_pence: number | null
  unit_price_pence: number | null
  warehouse_location: string | null
  is_active: boolean
  is_preferred: boolean
  created_at: string
  updated_at: string
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const search = searchParams.get("search") || ""
    const itemType = searchParams.get("item_type")
    const lowStockOnly = searchParams.get("low_stock") === "true"
    const sortField = searchParams.get("sort") || "name"
    const sortOrder = searchParams.get("order") || "asc"

    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from("inventory_items")
      .select("*", { count: "exact" })
      .is("deleted_at", null)

    // Type filter
    if (itemType) {
      query = query.eq("item_type", itemType)
    }

    // Low stock filter
    if (lowStockOnly) {
      query = query.not("reorder_level", "is", null)
        .filter("quantity_in_stock", "lte", "reorder_level")
    }

    // Search filter
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,sku.ilike.%${search}%,manufacturer.ilike.%${search}%,model.ilike.%${search}%`
      )
    }

    // Active only by default
    query = query.eq("is_active", true)

    // Sorting
    const ascending = sortOrder === "asc"
    query = query.order(sortField, { ascending })

    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data: items, error, count } = await query

    if (error) {
      console.error("[Inventory API] Query error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: items || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("[Inventory API] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get tenant ID from user
    const { data: tenantUser, error: tenantError } = await supabase
      .from("tenant_users")
      .select("tenant_id")
      .eq("user_id", user.id)
      .single()

    if (tenantError || !tenantUser) {
      return NextResponse.json({ error: "User not associated with tenant" }, { status: 403 })
    }

    const body = await request.json()

    // Validate required fields
    if (!body.name || !body.item_type) {
      return NextResponse.json(
        { error: "Name and item_type are required" },
        { status: 400 }
      )
    }

    // Create inventory item
    const { data: item, error: insertError } = await supabase
      .from("inventory_items")
      .insert({
        tenant_id: tenantUser.tenant_id,
        sku: body.sku || null,
        name: body.name,
        description: body.description || null,
        category: body.category || null,
        item_type: body.item_type,
        manufacturer: body.manufacturer || null,
        model: body.model || null,
        datasheet_url: body.datasheet_url || null,
        quantity_in_stock: body.quantity_in_stock || 0,
        reorder_level: body.reorder_level || null,
        reorder_quantity: body.reorder_quantity || null,
        unit_cost_pence: body.unit_cost_pence || null,
        unit_price_pence: body.unit_price_pence || null,
        warehouse_location: body.warehouse_location || null,
        is_active: body.is_active !== false,
        is_preferred: body.is_preferred || false,
      })
      .select()
      .single()

    if (insertError) {
      console.error("[Inventory API] Insert error:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ data: item }, { status: 201 })
  } catch (error) {
    console.error("[Inventory API] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
