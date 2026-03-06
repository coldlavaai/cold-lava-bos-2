import { createAdminClient } from "@/lib/supabase/server"
import { createClient } from "@/lib/supabase/server"
import { getTenantIdFromHeaders } from "@/lib/supabase/tenant-context"
import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/dbr/campaigns/[campaignId]/import
 * Import contacts into a DBR campaign.
 * Accepts JSON array of contacts: [{name, phone, email?, postcode?}]
 * Also accepts CSV text in body with header row.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { campaignId } = await params
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 })

    const supabase = createAdminClient()

    // Verify campaign exists
    const { data: campaign } = await supabase
      .from("dbr_campaigns")
      .select("id")
      .eq("id", campaignId)
      .eq("tenant_id", tenantId)
      .single()

    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })

    const contentType = request.headers.get("content-type") || ""
    let contacts: Array<{ name?: string; phone: string; email?: string; postcode?: string }> = []

    if (contentType.includes("application/json")) {
      const body = await request.json()
      contacts = Array.isArray(body) ? body : body.contacts || []
    } else {
      // Parse CSV
      const text = await request.text()
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean)
      if (lines.length < 2) return NextResponse.json({ error: "CSV must have header + at least 1 row" }, { status: 400 })

      const headerLine = lines[0].toLowerCase()
      const headers_arr = headerLine.split(",").map(h => h.trim().replace(/"/g, ""))

      const nameIdx = headers_arr.findIndex(h => ["name", "customer_name", "full_name", "contact_name"].includes(h))
      const phoneIdx = headers_arr.findIndex(h => ["phone", "mobile", "phone_number", "tel", "telephone"].includes(h))
      const emailIdx = headers_arr.findIndex(h => ["email", "email_address", "e-mail"].includes(h))
      const postcodeIdx = headers_arr.findIndex(h => ["postcode", "post_code", "zip", "zipcode"].includes(h))

      if (phoneIdx === -1) return NextResponse.json({ error: "CSV must have a 'phone' or 'mobile' column" }, { status: 400 })

      for (let i = 1; i < lines.length; i++) {
        const vals = parseCSVLine(lines[i])
        const phone = vals[phoneIdx]?.trim()
        if (!phone) continue

        contacts.push({
          name: nameIdx >= 0 ? vals[nameIdx]?.trim() : undefined,
          phone,
          email: emailIdx >= 0 ? vals[emailIdx]?.trim() : undefined,
          postcode: postcodeIdx >= 0 ? vals[postcodeIdx]?.trim() : undefined,
        })
      }
    }

    if (contacts.length === 0) {
      return NextResponse.json({ error: "No valid contacts found" }, { status: 400 })
    }

    // Normalize phones and prepare records
    let created = 0
    let skipped = 0
    const errors: Array<{ row: number; phone: string; error: string }> = []

    for (let i = 0; i < contacts.length; i++) {
      const c = contacts[i]
      let phone = c.phone.replace(/\s/g, "")

      // Basic UK phone normalization
      if (phone.startsWith("0")) phone = "+44" + phone.slice(1)
      if (phone.startsWith("44") && !phone.startsWith("+")) phone = "+" + phone
      if (!phone.startsWith("+")) phone = "+44" + phone

      // Check for existing customer by phone
      let customerId: string | null = null
      const phoneSuffix = phone.replace(/^\+/, "").slice(-10)
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("tenant_id", tenantId)
        .ilike("phone", `%${phoneSuffix}`)
        .limit(1)
        .single()

      if (existingCustomer) {
        customerId = existingCustomer.id
      } else {
        // Create customer
        const { data: newCustomer, error: custErr } = await supabase
          .from("customers")
          .insert({
            tenant_id: tenantId,
            name: c.name || "Unknown",
            phone,
            email: c.email || null,
            postcode: c.postcode || null,
            source: "dbr_import",
          })
          .select("id")
          .single()

        if (custErr) {
          errors.push({ row: i + 1, phone, error: custErr.message })
          continue
        }
        customerId = newCustomer.id
      }

      // Check if already in this campaign
      const { data: existing } = await supabase
        .from("dbr_campaign_customers")
        .select("id")
        .eq("campaign_id", campaignId)
        .eq("customer_id", customerId)
        .single()

      if (existing) {
        skipped++
        continue
      }

      // Insert into campaign
      const { error: insertErr } = await supabase
        .from("dbr_campaign_customers")
        .insert({
          tenant_id: tenantId,
          campaign_id: campaignId,
          customer_id: customerId,
          customer_name: c.name || "Unknown",
          phone,
          email: c.email || null,
          postcode: c.postcode || null,
          message_stage: "Ready",
          contact_status: "NEUTRAL",
        })

      if (insertErr) {
        errors.push({ row: i + 1, phone, error: insertErr.message })
      } else {
        created++
      }
    }

    // Update campaign total_contacts count
    const { count } = await supabase
      .from("dbr_campaign_customers")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaignId)

    await supabase
      .from("dbr_campaigns")
      .update({ total_contacts: count || 0 })
      .eq("id", campaignId)

    return NextResponse.json({
      success: true,
      total: contacts.length,
      created,
      skipped,
      errors: errors.slice(0, 20), // Cap error list
    })
  } catch (err) {
    console.error("[DBR import]", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

// Simple CSV line parser handling quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === "," && !inQuotes) {
      result.push(current)
      current = ""
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}
