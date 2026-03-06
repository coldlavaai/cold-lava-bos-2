import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server"
import { getTenantIdFromHeaders } from "@/lib/supabase/tenant-context"
import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 })

    const supabase = createAdminClient()
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name, settings")
      .eq("id", tenantId)
      .single()

    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 })

    const settings = tenant.settings || {}
    return NextResponse.json({
      data: {
        company_name: tenant.name || "",
        phone: settings.phone || "",
        website: settings.website || "",
        address_line1: settings.address_line1 || "",
        address_line2: settings.address_line2 || "",
        city: settings.city || "",
        county: settings.county || "",
        postcode: settings.postcode || "",
        country: settings.country || "United Kingdom",
        currency: settings.currency || "GBP",
        timezone: settings.timezone || "Europe/London",
        logo_url: settings.logo_url || "",
      }
    })
  } catch (err) {
    console.error("[org settings GET]", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 })

    const body = await request.json()
    const supabase = createAdminClient()

    // Get current settings to merge
    const { data: tenant } = await supabase
      .from("tenants")
      .select("settings")
      .eq("id", tenantId)
      .single()

    const currentSettings = tenant?.settings || {}
    const newSettings = {
      ...currentSettings,
      phone: body.phone || "",
      website: body.website || "",
      address_line1: body.address_line1 || "",
      address_line2: body.address_line2 || "",
      city: body.city || "",
      county: body.county || "",
      postcode: body.postcode || "",
      country: body.country || "United Kingdom",
      currency: body.currency || "GBP",
      timezone: body.timezone || "Europe/London",
      logo_url: body.logo_url || "",
    }

    const { error } = await supabase
      .from("tenants")
      .update({
        name: body.company_name || undefined,
        settings: newSettings,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tenantId)

    if (error) {
      console.error("[org settings PUT]", error)
      return NextResponse.json({ error: "Failed to update" }, { status: 500 })
    }

    return NextResponse.json({ data: body })
  } catch (err) {
    console.error("[org settings PUT]", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
