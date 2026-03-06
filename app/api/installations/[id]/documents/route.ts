import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getTenantIdFromHeaders } from "@/lib/supabase/tenant-context"
import { headers } from "next/headers"

// GET /api/installations/[id]/documents
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

    const { data: docs, error } = await supabase
      .from("installation_documents")
      .select("*")
      .eq("job_id", jobId)
      .eq("tenant_id", tenantId)
      .order("document_type", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Generate signed URLs (1 hour expiry)
    const docsWithUrls = await Promise.all(
      (docs || []).map(async (doc) => {
        const { data: signed } = await supabase.storage
          .from("installation-files")
          .createSignedUrl(doc.storage_path, 3600)
        return { ...doc, url: signed?.signedUrl ?? null }
      })
    )

    return NextResponse.json({ data: docsWithUrls })
  } catch (err) {
    console.error("[installations/documents GET]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/installations/[id]/documents
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
    const documentType = formData.get("document_type") as string | null
    const notes = formData.get("notes") as string | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const validTypes = ["dno_approval", "mcs_certificate", "handover_pack", "om_manual", "other"]
    if (!documentType || !validTypes.includes(documentType)) {
      return NextResponse.json({ error: "Invalid document_type" }, { status: 400 })
    }

    const allowedMimes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg", "image/png", "image/webp",
    ]
    if (!allowedMimes.includes(file.type)) {
      return NextResponse.json({ error: "File type not allowed. Use PDF, Word or image files." }, { status: 400 })
    }

    if (file.size > 52428800) {
      return NextResponse.json({ error: "File too large. Max 50MB." }, { status: 400 })
    }

    const ext = file.name.split(".").pop() ?? "pdf"
    const safeName = `${documentType}-${Date.now()}.${ext}`
    const storagePath = `${tenantId}/${jobId}/documents/${safeName}`

    const { error: uploadError } = await supabase.storage
      .from("installation-files")
      .upload(storagePath, file, { contentType: file.type })

    if (uploadError) {
      console.error("[installations/documents POST] upload error:", uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: doc, error: dbError } = await supabase
      .from("installation_documents")
      .insert({
        tenant_id: tenantId,
        job_id: jobId,
        document_type: documentType,
        storage_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        notes: notes || null,
        uploaded_by: userId || null,
      })
      .select()
      .single()

    if (dbError) {
      await supabase.storage.from("installation-files").remove([storagePath])
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    const { data: signed } = await supabase.storage
      .from("installation-files")
      .createSignedUrl(storagePath, 3600)

    return NextResponse.json({ data: { ...doc, url: signed?.signedUrl ?? null } }, { status: 201 })
  } catch (err) {
    console.error("[installations/documents POST]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
