import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getTenantIdFromHeaders, getUserIdFromHeaders } from "@/lib/supabase/tenant-context"
import { headers } from "next/headers"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: customerId } = await params

    // Get tenant context from cookies (set by middleware)
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const userId = await getUserIdFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json(
        { error: "Missing tenant context" },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await req.json()
    const { note } = body

    if (!note || typeof note !== "string" || note.trim().length === 0) {
      return NextResponse.json(
        { error: "Note text is required" },
        { status: 400 }
      )
    }

    // Insert customer note
    const { data, error } = await supabase
      .from("customer_notes")
      .insert({
        tenant_id: tenantId,
        customer_id: customerId,
        created_by: userId || null,
        note: note.trim(),
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating customer note:", error)
      return NextResponse.json(
        { error: "Failed to create note" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/customers/:id/notes:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
