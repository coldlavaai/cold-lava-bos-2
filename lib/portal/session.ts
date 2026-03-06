/**
 * Session 102: Customer Portal - Session Validation Helpers
 * Server-side utilities for validating portal sessions
 */

import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import crypto from "crypto"

export interface PortalSession {
  id: string
  tenant_id: string
  customer_id: string
  expires_at: string
  last_activity_at: string
}

export interface PortalCustomer {
  id: string
  tenant_id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  address_line_1: string | null
  address_line_2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string | null
}

/**
 * Validates the portal session cookie and returns session + customer data
 * Returns null if session is invalid or expired
 */
export async function getPortalSession(): Promise<{
  session: PortalSession
  customer: PortalCustomer
} | null> {
  try {
    const supabase = await createClient()
    const cookieStore = await cookies()

    // 1. Get session token from cookie
    const rawSessionToken = cookieStore.get("portal_session")?.value

    if (!rawSessionToken) {
      return null
    }

    // 2. Hash the session token
    const sessionHash = crypto
      .createHash("sha256")
      .update(rawSessionToken)
      .digest("hex")

    // 3. Look up session in database
    const { data: session, error: sessionError } = await supabase
      .from("portal_sessions")
      .select("id, tenant_id, customer_id, expires_at, last_activity_at")
      .eq("session_hash", sessionHash)
      .single()

    if (sessionError || !session) {
      return null
    }

    // 4. Check if session has expired
    const now = new Date()
    const expiresAt = new Date(session.expires_at)

    if (now > expiresAt) {
      // Session expired - delete it
      await supabase
        .from("portal_sessions")
        .delete()
        .eq("id", session.id)

      return null
    }

    // 5. Update last_activity_at (for activity-based expiration tracking)
    await supabase
      .from("portal_sessions")
      .update({ last_activity_at: now.toISOString() })
      .eq("id", session.id)

    // 6. Get customer data
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, tenant_id, first_name, last_name, email, phone, address_line_1, address_line_2, city, state, postal_code, country")
      .eq("id", session.customer_id)
      .eq("tenant_id", session.tenant_id)
      .single()

    if (customerError || !customer) {
      return null
    }

    return {
      session,
      customer,
    }
  } catch (error) {
    console.error("[Portal Session] Error validating session:", error)
    return null
  }
}

/**
 * Clears the portal session cookie
 */
export async function clearPortalSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete("portal_session")
}
