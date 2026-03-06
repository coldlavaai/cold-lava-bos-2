import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getTenantIdFromHeaders } from "@/lib/supabase/tenant-context"
import { headers } from "next/headers"

// DELETE /api/installations/[id]/documents/[docId]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id: jobId, docId } = await params
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json({ error: "No tenant context" }, { status: 400 })
    }

    const { data: doc, error: fetchError } = await supabase
      .from("installation_documents")
      .select("storage_path")
      .eq("id", docId)
      .eq("job_id", jobId)
      .eq("tenant_id", tenantId)
      .single()

    if (fetchError || !doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const { error: storageError } = await supabase.storage
      .from("installation-files")
      .remove([doc.storage_path])

    if (storageError) {
      console.error("[installations/documents DELETE] storage error:", storageError)
    }

    const { error: dbError } = await supabase
      .from("installation_documents")
      .delete()
      .eq("id", docId)
      .eq("tenant_id", tenantId)

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[installations/documents DELETE]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
