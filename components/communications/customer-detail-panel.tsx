"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Mail,
  Phone,
  Briefcase,
  ExternalLink,
  Clock,
  Play,
  FileText,
  FolderOpen,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react"
import Link from "next/link"
import { useCustomerJobs, useCallRecordingsForCustomer } from "@/lib/api/hooks"
import type { Job, CallRecording } from "@/lib/api/types"
import { getWebsiteScore } from "@/lib/utils/website-score"

interface CustomerDetailPanelProps {
  customer: {
    id: string
    name: string
    email: string | null
    phone: string | null
  }
}

export function CustomerDetailPanel({ customer }: CustomerDetailPanelProps) {
  const { data: jobs } = useCustomerJobs(customer.id)
  const { data: callRecordings } = useCallRecordingsForCustomer(customer.id)

  const [jobsExpanded, setJobsExpanded] = React.useState(true)
  const [callsExpanded, setCallsExpanded] = React.useState(true)

  const initials = customer.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2)

  return (
    <div className="flex flex-col h-full overflow-y-auto comms-scrollbar">
      {/* Customer info header */}
      <div className="p-4 border-b border-white/[0.06]">
        {/* Avatar and name */}
        <div className="flex flex-col items-center text-center mb-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center text-white text-lg font-bold mb-3 shadow-lg shadow-[hsl(var(--primary))]/20">
            {initials}
          </div>
          <h3 className="text-sm font-semibold text-white">{customer.name}</h3>
          <Link
            href={`/customers/${customer.id}`}
            className="flex items-center gap-1 text-[10px] text-[hsl(var(--accent))]/70 hover:text-[hsl(var(--accent))] transition-colors mt-1"
          >
            View full profile
            <ExternalLink className="h-2.5 w-2.5" />
          </Link>
        </div>

        {/* Contact details */}
        <div className="space-y-2">
          {customer.email && (
            <div className="flex items-center gap-2.5 text-xs">
              <Mail className="h-3.5 w-3.5 text-white/30 shrink-0" />
              <a
                href={`mailto:${customer.email}`}
                className="text-white/70 hover:text-white truncate transition-colors"
              >
                {customer.email}
              </a>
            </div>
          )}
          {customer.phone && (
            <div className="flex items-center gap-2.5 text-xs">
              <Phone className="h-3.5 w-3.5 text-white/30 shrink-0" />
              <a
                href={`tel:${customer.phone}`}
                className="text-white/70 hover:text-white transition-colors"
              >
                {customer.phone}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Jobs section */}
      <div className="border-b border-white/[0.06]">
        <button
          type="button"
          onClick={() => setJobsExpanded(!jobsExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Briefcase className="h-3.5 w-3.5 text-white/40" />
            <span className="text-xs font-semibold text-white/80">
              Jobs
            </span>
            {jobs && jobs.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))]">
                {jobs.length}
              </span>
            )}
          </div>
          {jobsExpanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-white/30" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-white/30" />
          )}
        </button>

        {jobsExpanded && (
          <div className="px-4 pb-3 space-y-2">
            {!jobs || jobs.length === 0 ? (
              <p className="text-[10px] text-white/30 py-2">No jobs linked</p>
            ) : (
              jobs.map((job: Job) => (
                <JobCard key={job.id} job={job} />
              ))
            )}
          </div>
        )}
      </div>

      {/* Call Recordings section */}
      <div className="border-b border-white/[0.06]">
        <button
          type="button"
          onClick={() => setCallsExpanded(!callsExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-white/40" />
            <span className="text-xs font-semibold text-white/80">
              Call Recordings
            </span>
            {callRecordings && callRecordings.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.08] text-white/50">
                {callRecordings.length}
              </span>
            )}
          </div>
          {callsExpanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-white/30" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-white/30" />
          )}
        </button>

        {callsExpanded && (
          <div className="px-4 pb-3 space-y-2">
            {!callRecordings || callRecordings.length === 0 ? (
              <p className="text-[10px] text-white/30 py-2">No recordings</p>
            ) : (
              callRecordings.slice(0, 5).map((recording: CallRecording) => (
                <CallRecordingCard key={recording.id} recording={recording} />
              ))
            )}
          </div>
        )}
      </div>

      {/* Files placeholder */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <FolderOpen className="h-3.5 w-3.5 text-white/40" />
          <span className="text-xs font-semibold text-white/80">Files</span>
        </div>
        <div className="py-4 text-center">
          <FolderOpen className="h-6 w-6 mx-auto mb-1.5 text-white/15" />
          <p className="text-[10px] text-white/25">Coming in Phase 5</p>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Job Card Sub-component
// ============================================================================

function JobCard({ job }: { job: Job }) {
  const stageName = job.current_stage?.name || "Unknown Stage"

  const getStageColor = (name: string) => {
    const lower = name.toLowerCase()
    if (lower.includes("lead") || lower.includes("enquir")) return "bg-blue-400/15 text-blue-400 ring-blue-400/30"
    if (lower.includes("survey") || lower.includes("assess")) return "bg-teal-400/15 text-teal-400 ring-teal-400/30"
    if (lower.includes("install") || lower.includes("schedule")) return "bg-purple-400/15 text-purple-400 ring-purple-400/30"
    if (lower.includes("complete") || lower.includes("handover")) return "bg-emerald-400/15 text-emerald-400 ring-emerald-400/30"
    if (lower.includes("cancel") || lower.includes("lost")) return "bg-red-400/15 text-red-400 ring-red-400/30"
    return "bg-white/[0.08] text-white/60 ring-white/[0.12]"
  }

  const websiteScore = getWebsiteScore(job)
  const getScoreColor = (s: number | null) => {
    if (s == null) return "text-white/20"
    if (s >= 70) return "text-emerald-400"
    if (s >= 40) return "text-teal-400"
    return "text-red-400"
  }

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-[11px] font-medium text-white/80 group-hover:text-white transition-colors truncate">
          {job.job_number || `Job`}
        </span>
        <ExternalLink className="h-2.5 w-2.5 text-white/20 group-hover:text-white/40 shrink-0 transition-colors" />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <span
          className={cn(
            "inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-semibold ring-1",
            getStageColor(stageName)
          )}
        >
          {stageName}
        </span>

        {/* Website Score */}
        {websiteScore != null && (
          <span
            className={cn(
              "text-[9px] font-medium",
              getScoreColor(websiteScore)
            )}
          >
            Web: {websiteScore}/100
          </span>
        )}
      </div>
    </Link>
  )
}

// ============================================================================
// Call Recording Card Sub-component
// ============================================================================

function CallRecordingCard({ recording }: { recording: CallRecording }) {
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [showTranscript, setShowTranscript] = React.useState(false)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "0m"
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
  }

  const directionIcon = recording.direction === "inbound" ? "↙" : "↗"
  const directionColor =
    recording.direction === "inbound" ? "text-blue-400" : "text-emerald-400"

  const handlePlayPause = () => {
    if (!recording.audio_url) return

    if (!audioRef.current) {
      // Build proxied URL for Twilio recordings
      const proxyUrl = recording.audio_url.startsWith("/api/")
        ? recording.audio_url
        : `/api/media/twilio?url=${encodeURIComponent(recording.audio_url)}`
      audioRef.current = new Audio(proxyUrl)
      audioRef.current.addEventListener("ended", () => setIsPlaying(false))
      audioRef.current.addEventListener("error", () => setIsPlaying(false))
    }

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play().catch(() => setIsPlaying(false))
      setIsPlaying(true)
    }
  }

  // Cleanup audio on unmount
  React.useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  return (
    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
      {/* Header row: direction + date + duration */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className={cn("text-[10px] font-medium", directionColor)}>
            {directionIcon}
          </span>
          <span className="text-[10px] text-white/50">
            {formatDate(recording.started_at || recording.created_at)}
          </span>
        </div>
        <span className="flex items-center gap-1 text-[10px] text-white/40">
          <Clock className="h-2.5 w-2.5" />
          {formatDuration(recording.duration_seconds)}
        </span>
      </div>

      {/* Summary */}
      {recording.summary && (
        <p className="text-[10px] text-white/60 line-clamp-2 mb-1.5 leading-relaxed">
          {recording.summary}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {recording.audio_url && (
          <button
            type="button"
            onClick={handlePlayPause}
            className={cn(
              "flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] transition-colors",
              isPlaying
                ? "bg-green-500/15 text-green-400 hover:bg-green-500/25"
                : "bg-white/[0.06] text-white/50 hover:text-white/70"
            )}
          >
            <Play className="h-2 w-2" />
            {isPlaying ? "Playing…" : "Play"}
          </button>
        )}

        {recording.transcript && (
          <button
            type="button"
            onClick={() => setShowTranscript(!showTranscript)}
            className={cn(
              "flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] transition-colors",
              showTranscript
                ? "bg-blue-500/15 text-blue-400 hover:bg-blue-500/25"
                : "bg-white/[0.06] text-white/50 hover:text-white/70"
            )}
          >
            <FileText className="h-2 w-2" />
            Transcript
          </button>
        )}

        {recording.provider_meeting_url && (
          <a
            href={recording.provider_meeting_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/[0.06] text-[9px] text-white/50 hover:text-white/70 transition-colors ml-auto"
          >
            <ExternalLink className="h-2 w-2" />
            {recording.provider}
          </a>
        )}
      </div>

      {/* Expandable transcript */}
      {showTranscript && recording.transcript && (
        <div className="mt-2 p-2 rounded-lg bg-white/[0.03] border border-white/[0.04]">
          <p className="text-[9px] text-white/50 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto comms-scrollbar">
            {recording.transcript}
          </p>
        </div>
      )}
    </div>
  )
}
