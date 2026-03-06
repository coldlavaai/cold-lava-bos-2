/**
 * Session 104: Reviews API - Single Review Operations
 * GET /api/reviews/:id - Get single review
 * PATCH /api/reviews/:id - Update review (reply, status, visibility)
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getTenantIdFromHeaders, getUserIdFromHeaders } from "@/lib/supabase/tenant-context"

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient()
    const tenantId = await getTenantIdFromHeaders(request.headers)
    const resolvedParams = await params

    if (!tenantId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { data: review, error } = await supabase
      .from("reviews")
      .select(
        `
        *,
        customer:customers(id, first_name, last_name, email, phone),
        job:jobs(id, job_number, site_address, status),
        reply_author:users!reply_author_user_id(id, full_name, email)
      `
      )
      .eq("id", resolvedParams.id)
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .single()

    if (error || !review) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: review })
  } catch (error) {
    console.error("[Reviews API] Error fetching review:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient()
    const tenantId = await getTenantIdFromHeaders(request.headers)
    const userId = await getUserIdFromHeaders(request.headers)
    const resolvedParams = await params

    if (!tenantId || !userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate editable fields
    const allowedFields = [
      "reply_body",
      "status",
      "is_visible",
      "version",
    ]

    const updates: Record<string, unknown> = {}

    // Only include allowed fields that are present in the request
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    // If reply_body is being set, also set reply metadata
    if ("reply_body" in body && body.reply_body) {
      updates.replied_at = new Date().toISOString()
      updates.reply_author_user_id = userId

      // If status is not explicitly set, mark as replied
      if (!("status" in body)) {
        updates.status = "replied"
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      )
    }

    // Optimistic locking check
    const expectedVersion = body.version
    if (expectedVersion === undefined) {
      return NextResponse.json(
        { error: "Version field is required for updates" },
        { status: 400 }
      )
    }

    // Increment version
    updates.version = expectedVersion + 1

    // Perform update with optimistic locking
    const { data: review, error } = await supabase
      .from("reviews")
      .update(updates)
      .eq("id", resolvedParams.id)
      .eq("tenant_id", tenantId)
      .eq("version", expectedVersion) // Optimistic lock check
      .is("deleted_at", null)
      .select(
        `
        *,
        customer:customers(id, first_name, last_name, email),
        job:jobs(id, job_number, site_address),
        reply_author:users!reply_author_user_id(id, full_name, email)
      `
      )
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned - either not found or version mismatch
        return NextResponse.json(
          { error: "Review not found or has been modified by another user. Please refresh and try again." },
          { status: 409 }
        )
      }

      console.error("[Reviews API] Error updating review:", error)
      return NextResponse.json(
        { error: "Failed to update review" },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: review })
  } catch (error) {
    console.error("[Reviews API] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
