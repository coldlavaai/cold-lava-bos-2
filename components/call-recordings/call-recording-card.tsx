/**
 * Session 98: Call Recordings UX Improvements
 * CallRecordingCard - Timeline item component for call recordings
 */

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Headphones, FileText } from "lucide-react"
import type { CallRecording } from "@/lib/api/types"

interface CallRecordingCardProps {
  recording: CallRecording
  onViewTranscript?: () => void
}

export function CallRecordingCard({ recording, onViewTranscript }: CallRecordingCardProps) {
  // Format duration for display
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins > 0) {
      return `${mins}m ${secs}s`
    }
    return `${secs}s`
  }

  // Format timestamp
  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Get timestamp from started_at or created_at
  const timestamp = recording.started_at || recording.created_at

  return (
    <div className="space-y-2">
        {/* Header with provider and direction */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">
            Call Recording
          </span>
          <Badge variant="secondary" className="text-xs capitalize">
            {recording.provider}
          </Badge>
          {recording.direction && (
            <Badge variant="outline" className="text-xs capitalize">
              {recording.direction}
            </Badge>
          )}
        </div>

        {/* Timestamp and duration */}
        <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
          <span>{formatTimestamp(timestamp)}</span>
          {recording.duration_seconds && (
            <>
              <span>•</span>
              <span>{formatDuration(recording.duration_seconds)}</span>
            </>
          )}
          {recording.language && (
            <>
              <span>•</span>
              <span className="uppercase">{recording.language}</span>
            </>
          )}
        </div>

        {/* Summary */}
        {recording.summary && (
          <div className="text-sm text-foreground/80">
            {recording.summary.length > 150
              ? `${recording.summary.substring(0, 150)}...`
              : recording.summary}
          </div>
        )}

        {/* Action items badge (if present) */}
        {recording.action_items && recording.action_items.length > 0 && (
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              {recording.action_items.length} action {recording.action_items.length === 1 ? 'item' : 'items'}
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          {/* View transcript button */}
          {recording.transcript && onViewTranscript && (
            <Button
              variant="outline"
              size="sm"
              onClick={onViewTranscript}
              className="gap-1.5"
            >
              <FileText className="h-3.5 w-3.5" />
              View Transcript
            </Button>
          )}

          {/* Open in provider */}
          {recording.provider_meeting_url && (
            <Button variant="outline" size="sm" asChild className="gap-1.5">
              <a href={recording.provider_meeting_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                Open in {recording.provider}
              </a>
            </Button>
          )}

          {/* Listen to audio */}
          {recording.audio_url && (
            <Button variant="outline" size="sm" asChild className="gap-1.5">
              <a href={recording.audio_url} target="_blank" rel="noopener noreferrer">
                <Headphones className="h-3.5 w-3.5" />
                Listen
              </a>
            </Button>
          )}
        </div>
    </div>
  )
}
