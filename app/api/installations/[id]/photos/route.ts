import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getTenantIdFromHeaders } from "@/lib/supabase/tenant-context"
import { headers } from "next/headers"

// GET /api/installations/[id]/photos
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json({ error: "No tenant context" }, { status: 400 })
    }

    const { data: photos, error } = await supabase
      .from("installation_photos")
      .select("*")
      .eq("job_id", jobId)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Generate signed URLs (1 hour expiry)
    const photosWithUrls = await Promise.all(
      (photos || []).map(async (photo) => {
        const { data: signed } = await supabase.storage
          .from("installation-files")
          .createSignedUrl(photo.storage_path, 3600)
        return { ...photo, url: signed?.signedUrl ?? null }
      })
    )

    return NextResponse.json({ data: photosWithUrls })
  } catch (err) {
    console.error("[installations/photos GET]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/installations/[id]/photos
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const userId = headersList.get("x-user-id")

    if (!tenantId) {
      return NextResponse.json({ error: "No tenant context" }, { status: 400 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const caption = formData.get("caption") as string | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "File type not allowed. Use JPEG, PNG, WebP or HEIC." }, { status: 400 })
    }

    // Max 50MB
    if (file.size > 52428800) {
      return NextResponse.json({ error: "File too large. Max 50MB." }, { status: 400 })
    }

    const ext = file.name.split(".").pop() ?? "jpg"
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const storagePath = `${tenantId}/${jobId}/photos/${safeName}`

    const { error: uploadError } = await supabase.storage
      .from("installation-files")
      .upload(storagePath, file, { contentType: file.type })

    if (uploadError) {
      console.error("[installations/photos POST] upload error:", uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: photo, error: dbError } = await supabase
      .from("installation_photos")
      .insert({
        tenant_id: tenantId,
        job_id: jobId,
        storage_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        caption: caption || null,
        uploaded_by: userId || null,
      })
      .select()
      .single()

    if (dbError) {
      // Rollback storage upload
      await supabase.storage.from("installation-files").remove([storagePath])
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // Return with signed URL
    const { data: signed } = await supabase.storage
      .from("installation-files")
      .createSignedUrl(storagePath, 3600)

    return NextResponse.json({ data: { ...photo, url: signed?.signedUrl ?? null } }, { status: 201 })
  } catch (err) {
    console.error("[installations/photos POST]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
