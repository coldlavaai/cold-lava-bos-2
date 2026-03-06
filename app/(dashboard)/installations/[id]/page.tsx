"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import {
  useJob,
  useInstallationPhotos,
  useInstallationDocuments,
  useUploadInstallationPhoto,
  useUploadInstallationDocument,
  useDeleteInstallationPhoto,
  useDeleteInstallationDocument,
} from "@/lib/api/hooks"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowLeft,
  Upload,
  Trash2,
  FileText,
  Image as ImageIcon,
  Download,
  Loader2,
  MapPin,
  Zap,
  User,
  ExternalLink,
  Plus,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import Link from "next/link"
import type { InstallationDocument } from "@/lib/api/types"

const DOC_TYPE_CONFIG: Record<
  InstallationDocument["document_type"],
  { label: string; color: string }
> = {
  dno_approval:    { label: "Approval Docs",   color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  mcs_certificate: { label: "Certificate",     color: "bg-green-500/15 text-green-400 border-green-500/30" },
  handover_pack:   { label: "Handover Pack",   color: "bg-teal-500/15 text-teal-400 border-teal-500/30" },
  om_manual:       { label: "O&M Manual",      color: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  other:           { label: "Other",            color: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function PhotoGrid({ jobId }: { jobId: string }) {
  const { data: photos = [], isLoading } = useInstallationPhotos(jobId)
  const uploadPhoto = useUploadInstallationPhoto(jobId)
  const deletePhoto = useDeleteInstallationPhoto(jobId)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [lightbox, setLightbox] = React.useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    for (const file of files) {
      const fd = new FormData()
      fd.append("file", file)
      try {
        await uploadPhoto.mutateAsync(fd)
      } catch (err) {
        toast.error(`Failed to upload ${file.name}`)
      }
    }
    toast.success(`${files.length} photo${files.length > 1 ? "s" : ""} uploaded`)
    e.target.value = ""
  }

  const handleDelete = async (photoId: string) => {
    if (!confirm("Delete this photo?")) return
    try {
      await deletePhoto.mutateAsync(photoId)
      toast.success("Photo deleted")
    } catch {
      toast.error("Failed to delete photo")
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-teal-400" />
            Photos
            {photos.length > 0 && (
              <Badge variant="outline" className="text-xs font-normal">{photos.length}</Badge>
            )}
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadPhoto.isPending}
          >
            {uploadPhoto.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5 mr-1.5" />
            )}
            Upload
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : photos.length === 0 ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-border rounded-lg py-10 text-center hover:border-teal-500/40 hover:bg-teal-500/5 transition-colors group"
          >
            <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40 group-hover:text-teal-400/60" />
            <p className="text-sm text-muted-foreground">No photos yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Click to upload project photos</p>
          </button>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group aspect-square rounded-md overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url ?? ""}
                  alt={photo.caption ?? photo.file_name}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setLightbox(photo.url ?? null)}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                <button
                  onClick={() => handleDelete(photo.id)}
                  className="absolute top-1.5 right-1.5 p-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600/80"
                  title="Delete photo"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
                {photo.caption && (
                  <p className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/60 text-white text-[10px] truncate opacity-0 group-hover:opacity-100 transition-opacity">
                    {photo.caption}
                  </p>
                )}
              </div>
            ))}
            {/* Add more button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-md border-2 border-dashed border-border hover:border-teal-500/40 hover:bg-teal-500/5 transition-colors flex items-center justify-center group"
            >
              <Plus className="h-6 w-6 text-muted-foreground/40 group-hover:text-teal-400/60" />
            </button>
          </div>
        )}
      </CardContent>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Full size"
            className="max-w-full max-h-full object-contain rounded"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl font-light"
          >
            ✕
          </button>
        </div>
      )}
    </Card>
  )
}

function DocumentRow({
  doc,
  onDelete,
}: {
  doc: InstallationDocument & { url?: string | null }
  onDelete: (id: string) => void
}) {
  const config = DOC_TYPE_CONFIG[doc.document_type]
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{doc.file_name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border", config.color)}>
            {config.label}
          </Badge>
          {doc.file_size && (
            <span className="text-[10px] text-muted-foreground">{formatBytes(doc.file_size)}</span>
          )}
        </div>
        {doc.notes && (
          <p className="text-xs text-muted-foreground mt-0.5">{doc.notes}</p>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {doc.url && (
          <a href={doc.url} download={doc.file_name} target="_blank" rel="noopener noreferrer">
            <Button size="icon" variant="ghost" className="h-7 w-7" title="Download">
              <Download className="h-3.5 w-3.5" />
            </Button>
          </a>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground hover:text-red-400"
          title="Delete"
          onClick={() => onDelete(doc.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

function DocumentsSection({ jobId }: { jobId: string }) {
  const { data: docs = [], isLoading } = useInstallationDocuments(jobId)
  const uploadDoc = useUploadInstallationDocument(jobId)
  const deleteDoc = useDeleteInstallationDocument(jobId)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [selectedType, setSelectedType] = React.useState<InstallationDocument["document_type"]>("other")

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append("file", file)
    fd.append("document_type", selectedType)
    try {
      await uploadDoc.mutateAsync(fd)
      toast.success("Document uploaded")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed")
    }
    e.target.value = ""
  }

  const handleDelete = async (docId: string) => {
    if (!confirm("Delete this document?")) return
    try {
      await deleteDoc.mutateAsync(docId)
      toast.success("Document deleted")
    } catch {
      toast.error("Failed to delete document")
    }
  }

  const uploadForType = (type: InstallationDocument["document_type"]) => {
    setSelectedType(type)
    // Need micro-delay so state updates before click triggers
    setTimeout(() => fileInputRef.current?.click(), 10)
  }

  // Group docs by type
  const docsByType = docs.reduce<Record<string, typeof docs>>((acc, doc) => {
    acc[doc.document_type] = [...(acc[doc.document_type] || []), doc]
    return acc
  }, {})

  const docTypeOrder: InstallationDocument["document_type"][] = [
    "dno_approval", "mcs_certificate", "handover_pack", "om_manual", "other"
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-teal-400" />
            Documents
            {docs.length > 0 && (
              <Badge variant="outline" className="text-xs font-normal">{docs.length}</Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Document slots by type */}
            {docTypeOrder.map((type) => {
              const config = DOC_TYPE_CONFIG[type]
              const typeDocs = docsByType[type] || []
              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-1.5">
                    <Badge variant="outline" className={cn("text-xs border", config.color)}>
                      {config.label}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs px-2 text-muted-foreground hover:text-foreground"
                      onClick={() => uploadForType(type)}
                      disabled={uploadDoc.isPending}
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      Upload
                    </Button>
                  </div>
                  {typeDocs.length === 0 ? (
                    <p className="text-xs text-muted-foreground/60 pl-1 pb-1">No file uploaded</p>
                  ) : (
                    typeDocs.map((doc) => (
                      <DocumentRow key={doc.id} doc={doc} onDelete={handleDelete} />
                    ))
                  )}
                </div>
              )
            })}
          </>
        )}
      </CardContent>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </Card>
  )
}

export default function InstallationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string

  const { data: job, isLoading } = useJob(jobId)

  const formatDate = (s: string | null) => {
    if (!s) return "—"
    return new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <p className="text-muted-foreground">Client record not found</p>
        <Button variant="ghost" className="mt-3" onClick={() => router.push("/installations")}>
          Back to Clients
        </Button>
      </div>
    )
  }

  const customer = job.customer

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border bg-background px-6 py-4">
        <div className="flex items-center gap-3 mb-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/installations")} className="gap-1.5 -ml-2">
            <ArrowLeft className="h-4 w-4" />
            Clients
          </Button>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold">{job.job_number}</h1>
              <Badge variant="outline" className="text-xs">
                {job.current_stage?.name ?? "—"}
              </Badge>
            </div>
            {customer && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <Link
                  href={`/customers/${customer.id}`}
                  className="hover:text-foreground transition-colors"
                >
                  {customer.name}
                </Link>
              </div>
            )}
            {job.installation_address && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                <MapPin className="h-3.5 w-3.5" />
                <span>{job.installation_address}{job.installation_postcode ? `, ${job.installation_postcode}` : ""}</span>
              </div>
            )}
          </div>
          <Link href={`/jobs/${jobId}`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              View Job
            </Button>
          </Link>
        </div>

        {/* Key stats strip */}
        <div className="flex items-center gap-4 mt-3 text-sm">
          {/* SOLAR-SPECIFIC: system size kWp hidden */}
          {job.installation_scheduled_date && !job.installation_completed_date && (
            <div className="text-muted-foreground">
              Scheduled: <span className="text-foreground font-medium">{formatDate(job.installation_scheduled_date)}</span>
            </div>
          )}
          {job.installation_completed_date && (
            <div className="text-muted-foreground">
              Completed: <span className="text-green-400 font-medium">{formatDate(job.installation_completed_date)}</span>
            </div>
          )}
          {/* SOLAR-SPECIFIC: MCS and DNO status badges hidden */}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-4xl space-y-4">
          <PhotoGrid jobId={jobId} />
          <DocumentsSection jobId={jobId} />
        </div>
      </div>
    </div>
  )
}
