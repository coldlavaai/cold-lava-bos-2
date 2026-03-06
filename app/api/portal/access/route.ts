/**
 * Session 102/108: Customer Portal - Token Redemption (Node.js)
 * GET /api/portal/access?token={raw_token}
 *
 * Validates one-time access token and creates portal session in Node.js runtime
 * Sets session cookie and redirects to portal dashboard
 *
 * This runs in Node.js runtime (not Edge) for reliable database access and cookie setting
 */

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import crypto from "crypto"

// Force Node.js runtime for reliable cookie handling
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  console.log('[Portal Access API] Processing token redemption request')

  try {
    // Use admin client (service role) since this is unauthenticated token redemption
    // RLS policies allow service_role full access to portal tables
    const supabase = createAdminClient()

    // 1. Extract token from query parameter
    const searchParams = request.nextUrl.searchParams
    const rawToken = searchParams.get("token")

    console.log('[Portal Access API] Token param:', {
      hasToken: !!rawToken,
      tokenLength: rawToken?.length,
      tokenPrefix: rawToken?.substring(0, 10),
    })

    if (!rawToken) {
      console.log('[Portal Access API] No token provided - redirecting to invalid-link')
      return NextResponse.redirect(new URL("/portal/invalid-link", request.url))
    }

    // 2. Hash the provided token to match against database
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex")

    console.log('[Portal Access API] Token hashed:', {
      hashPrefix: tokenHash.substring(0, 16),
      hashLength: tokenHash.length,
    })

    // 3. Look up token in database
    console.log('[Portal Access API] Looking up token in database...')
    const { data: tokenRecord, error: tokenError } = await supabase
      .from("portal_access_tokens")
      .select("id, tenant_id, customer_id, expires_at, used_at")
      .eq("token_hash", tokenHash)
      .single()

    console.log('[Portal Access API] Token lookup result:', {
      hasToken: !!tokenRecord,
      hasError: !!tokenError,
      errorMessage: tokenError?.message,
      errorCode: tokenError?.code,
      tokenId: tokenRecord?.id,
    })

    if (tokenError || !tokenRecord) {
      console.error('[Portal Access API] Invalid token:', {
        error: tokenError,
        message: tokenError?.message,
        details: tokenError?.details,
        hint: tokenError?.hint,
      })
      return NextResponse.redirect(new URL("/portal/invalid-link", request.url))
    }

    // 4. Check if token has already been used
    console.log('[Portal Access API] Checking if token already used:', {
      usedAt: tokenRecord.used_at,
      isUsed: !!tokenRecord.used_at,
    })

    if (tokenRecord.used_at) {
      console.log('[Portal Access API] Token already used - redirecting to invalid-link')
      return NextResponse.redirect(new URL("/portal/invalid-link", request.url))
    }

    // 5. Check if token has expired
    const now = new Date()
    const expiresAt = new Date(tokenRecord.expires_at)

    console.log('[Portal Access API] Checking token expiry:', {
      now: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      isExpired: now > expiresAt,
    })

    if (now > expiresAt) {
      console.log('[Portal Access API] Token expired - redirecting to expired-link')
      return NextResponse.redirect(new URL("/portal/expired-link", request.url))
    }

    // 6. Mark token as used (update used_at timestamp)
    console.log('[Portal Access API] Marking token as used...')
    const { error: updateError } = await supabase
      .from("portal_access_tokens")
      .update({ used_at: now.toISOString() })
      .eq("id", tokenRecord.id)

    console.log('[Portal Access API] Token update result:', {
      hasError: !!updateError,
      errorMessage: updateError?.message,
    })

    if (updateError) {
      console.error("[Portal Access API] Error marking token as used:", updateError)
      return NextResponse.json(
        { error: "Failed to redeem token" },
        { status: 500 }
      )
    }

    // 7. Generate session token (32 bytes)
    console.log('[Portal Access API] Generating session token...')
    const rawSessionToken = crypto.randomBytes(32).toString("hex")

    // 8. Hash session token for storage
    const sessionHash = crypto
      .createHash("sha256")
      .update(rawSessionToken)
      .digest("hex")

    console.log('[Portal Access API] Session token generated:', {
      tokenLength: rawSessionToken.length,
      hashPrefix: sessionHash.substring(0, 16),
    })

    // 9. Set session expiry (7 days from now)
    const sessionExpiresAt = new Date()
    sessionExpiresAt.setDate(sessionExpiresAt.getDate() + 7)

    // 10. Create portal session record
    console.log('[Portal Access API] Creating portal session...')
    const { data: sessionRecord, error: sessionError } = await supabase
      .from("portal_sessions")
      .insert({
        tenant_id: tokenRecord.tenant_id,
        customer_id: tokenRecord.customer_id,
        session_hash: sessionHash,
        expires_at: sessionExpiresAt.toISOString(),
        last_activity_at: now.toISOString(),
      })
      .select("id")
      .single()

    console.log('[Portal Access API] Session creation result:', {
      hasSession: !!sessionRecord,
      hasError: !!sessionError,
      errorMessage: sessionError?.message,
      sessionId: sessionRecord?.id,
    })

    if (sessionError || !sessionRecord) {
      console.error("[Portal Access API] Error creating session:", sessionError)
      return NextResponse.json(
        { error: "Failed to create portal session" },
        { status: 500 }
      )
    }

    // 11. Redirect to /portal with session token in URL
    // Middleware will detect this and set the cookie (avoids redirect-with-cookie issues)
    console.log('[Portal Access API] Redirecting to /portal with session param...')
    const portalUrl = new URL("/portal", request.url)
    portalUrl.searchParams.set("session", rawSessionToken)

    console.log('[Portal Access API] SUCCESS - Redirecting to /portal?session=...')
    return NextResponse.redirect(portalUrl)
  } catch (error) {
    console.error("[Portal Access API] Unexpected error:", {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
