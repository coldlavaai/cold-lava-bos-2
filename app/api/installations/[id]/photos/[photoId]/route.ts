import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getTenantIdFromHeaders } from "@/lib/supabase/tenant-context"
import { headers } from "next/headers"

// DELETE /api/installations/[id]/photos/[photoId]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const { id: jobId, photoId } = await params
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json({ error: "No tenant context" }, { status: 400 })
    }

    // Fetch first to get storage_path and verify ownership
    const { data: photo, error: fetchError } = await supabase
      .from("installation_photos")
      .select("storage_path")
      .eq("id", photoId)
      .eq("job_id", jobId)
      .eq("tenant_id", tenantId)
      .single()

    if (fetchError || !photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 })
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from("installation-files")
      .remove([photo.storage_path])

    if (storageError) {
      console.error("[installations/photos DELETE] storage error:", storageError)
    }

    // Delete from DB
    const { error: dbError } = await supabase
      .from("installation_photos")
      .delete()
      .eq("id", photoId)
      .eq("tenant_id", tenantId)

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[installations/photos DELETE]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
