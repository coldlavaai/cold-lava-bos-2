/**
 * Session 102: Customer Portal - Access Token Generation
 * POST /api/portal/access-tokens
 *
 * Generates one-time magic-link tokens for customer portal access
 * Only accessible to authenticated installer users (via Supabase auth)
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import crypto from "crypto"

interface GenerateTokenRequest {
  customer_id: string
}

interface GenerateTokenResponse {
  success: boolean
  data?: {
    token_id: string
    magic_link: string
    expires_at: string
  }
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<GenerateTokenResponse>> {
  try {
    const supabase = await createClient()

    // 1. Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // 2. Get user's tenant
    const { data: tenantUser, error: tenantError } = await supabase
      .from("tenant_users")
      .select("tenant_id")
      .eq("user_id", user.id)
      .single()

    if (tenantError || !tenantUser) {
      return NextResponse.json(
        { success: false, error: "User not associated with a tenant" },
        { status: 403 }
      )
    }

    const tenantId = tenantUser.tenant_id

    // 3. Parse request body
    const body = await request.json() as GenerateTokenRequest

    if (!body.customer_id) {
      return NextResponse.json(
        { success: false, error: "Missing customer_id" },
        { status: 400 }
      )
    }

    // 4. Verify customer belongs to this tenant
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id")
      .eq("id", body.customer_id)
      .eq("tenant_id", tenantId)
      .single()

    if (customerError || !customer) {
      return NextResponse.json(
        { success: false, error: "Customer not found or does not belong to your tenant" },
        { status: 404 }
      )
    }

    // 5. Generate random token (32 bytes = 256 bits)
    const rawToken = crypto.randomBytes(32).toString("hex") // 64 hex characters

    // 6. Hash the token for storage (SHA-256)
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex")

    // 7. Set expiry (1 hour from now)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1)

    // 8. Insert token into database
    const { data: tokenRecord, error: insertError } = await supabase
      .from("portal_access_tokens")
      .insert({
        tenant_id: tenantId,
        customer_id: body.customer_id,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
      })
      .select("id, expires_at")
      .single()

    if (insertError || !tokenRecord) {
      console.error("[Portal Access Token] Insert error:", insertError)
      return NextResponse.json(
        { success: false, error: "Failed to create access token" },
        { status: 500 }
      )
    }

    // 9. Build magic link URL
    // Format: /api/portal/access?token={raw_token}
    // Token validation happens in Node.js API route for reliable cookie setting
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:3000`
    const magicLink = `${baseUrl}/api/portal/access?token=${rawToken}`

    // 10. Return response with magic link
    return NextResponse.json({
      success: true,
      data: {
        token_id: tokenRecord.id,
        magic_link: magicLink,
        expires_at: tokenRecord.expires_at,
      },
    })
  } catch (error) {
    console.error("[Portal Access Token] Unexpected error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
