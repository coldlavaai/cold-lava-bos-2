import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server"
import { getTenantIdFromHeaders } from "@/lib/supabase/tenant-context"
import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 })

    const body = await request.json()
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("user_profiles")
      .update({
        name: body.name,
        description: body.description,
        permissions: body.permissions,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: "Failed to update" }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err) {
    console.error("[profiles PUT]", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 })

    const supabase = createAdminClient()

    // Don't allow deleting system profiles
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_system")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .single()

    if (profile?.is_system) {
      return NextResponse.json({ error: "Cannot delete system profile" }, { status: 403 })
    }

    await supabase.from("user_profiles").delete().eq("id", id).eq("tenant_id", tenantId)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[profiles DELETE]", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
