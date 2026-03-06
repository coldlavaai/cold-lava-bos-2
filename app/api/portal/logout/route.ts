/**
 * Session 102: Customer Portal - Logout
 * POST /api/portal/logout
 * Clears portal session cookie and redirects to invalid link page
 */

import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/server"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const rawSessionToken = cookieStore.get("portal_session")?.value

    if (rawSessionToken) {
      // Hash token to find session
      const sessionHash = crypto
        .createHash("sha256")
        .update(rawSessionToken)
        .digest("hex")

      // Delete session from database (use admin client for service_role access)
      const supabase = createAdminClient()
      await supabase
        .from("portal_sessions")
        .delete()
        .eq("session_hash", sessionHash)
    }

    // Clear session cookie
    cookieStore.delete("portal_session")

    // Redirect to invalid link page
    return NextResponse.redirect(new URL("/portal/invalid-link", request.url))
  } catch (error) {
    console.error("[Portal Logout] Error:", error)
    return NextResponse.json(
      { error: "Failed to logout" },
      { status: 500 }
    )
  }
}
