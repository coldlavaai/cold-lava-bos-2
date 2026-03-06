/**
 * Session 104: Reviews API - List & Create
 * GET /api/reviews - List reviews with filters and pagination
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getTenantIdFromHeaders } from "@/lib/supabase/tenant-context"

export interface Review {
  id: string
  tenant_id: string
  customer_id: string
  job_id: string | null
  source: "invited" | "imported" | "manual" | "external"
  external_platform: "google" | "trustpilot" | "facebook" | "yell" | "other" | null
  external_review_id: string | null
  rating: number | null
  title: string | null
  body: string | null
  invitation_sent_at: string | null
  invitation_channel: "email" | "sms" | "whatsapp" | "portal" | null
  invitation_message_id: string | null
  status: "new" | "replied" | "flagged" | "hidden"
  reply_body: string | null
  replied_at: string | null
  reply_author_user_id: string | null
  auto_replied: boolean
  is_visible: boolean
  version: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ReviewWithRelations extends Review {
  customer?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
  job?: {
    id: string
    job_number: string
    site_address: string
  }
  reply_author?: {
    id: string
    full_name: string
    email: string
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const tenantId = await getTenantIdFromHeaders(request.headers)

    if (!tenantId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status")
    const source = searchParams.get("source")
    const ratingMin = searchParams.get("rating_min")
    const ratingMax = searchParams.get("rating_max")
    const jobId = searchParams.get("job_id")
    const customerId = searchParams.get("customer_id")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const sortBy = searchParams.get("sort_by") || "created_at"
    const sortOrder = searchParams.get("sort_order") || "desc"

    // Build query
    let query = supabase
      .from("reviews")
      .select(
        `
        *,
        customer:customers(id, first_name, last_name, email),
        job:jobs(id, job_number, site_address),
        reply_author:users!reply_author_user_id(id, full_name, email)
      `,
        { count: "exact" }
      )
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)

    // Apply filters
    if (status) {
      query = query.eq("status", status)
    }

    if (source) {
      query = query.eq("source", source)
    }

    if (ratingMin) {
      query = query.gte("rating", parseInt(ratingMin))
    }

    if (ratingMax) {
      query = query.lte("rating", parseInt(ratingMax))
    }

    if (jobId) {
      query = query.eq("job_id", jobId)
    }

    if (customerId) {
      query = query.eq("customer_id", customerId)
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === "asc" })

    // Apply pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    // Execute query
    const { data, error, count } = await query

    if (error) {
      console.error("[Reviews API] Error fetching reviews:", error)
      return NextResponse.json(
        { error: "Failed to fetch reviews" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data || [],
      meta: {
        page,
        limit,
        total: count || 0,
        total_pages: count ? Math.ceil(count / limit) : 0,
      },
    })
  } catch (error) {
    console.error("[Reviews API] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
