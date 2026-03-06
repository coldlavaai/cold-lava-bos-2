import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/profile - Get current user's profile
export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile with tenant info
    const { data: profile, error } = await supabase
      .from("users")
      .select(`
        id,
        email,
        name,
        phone,
        avatar_url,
        created_at,
        tenant_users!inner (
          role,
          tenant_id,
          tenants (
            name
          )
        )
      `)
      .eq("id", user.id)
      .single()

    if (error) {
      console.error("[API] Profile fetch error:", error)
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
    }

    // Flatten the response
    const tenantUser = profile.tenant_users?.[0] as { role?: string; tenant_id?: string; tenants?: { name?: string } | null } | undefined
    const result = {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      phone: profile.phone,
      avatar_url: profile.avatar_url,
      created_at: profile.created_at,
      role: tenantUser?.role || "viewer",
      tenant_name: (tenantUser?.tenants as { name?: string } | null)?.name || null,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("[API] Profile error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/profile - Update current user's profile
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, phone, avatar_url } = body

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    
    if (name !== undefined) updates.name = name.trim()
    if (phone !== undefined) updates.phone = phone?.trim() || null
    if (avatar_url !== undefined) updates.avatar_url = avatar_url?.trim() || null

    // Update user profile
    const { data: updated, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single()

    if (error) {
      console.error("[API] Profile update error:", error)
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[API] Profile update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
