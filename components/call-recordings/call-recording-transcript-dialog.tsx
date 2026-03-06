/**
 * Session 98: Call Recordings UX Improvements
 * CallRecordingTranscriptDialog - Full transcript viewer with metadata and action items
 */

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Phone, Clock, Calendar, ExternalLink, Headphones, CheckCircle2 } from "lucide-react"
import type { CallRecording } from "@/lib/api/types"

interface CallRecordingTranscriptDialogProps {
  recording: CallRecording | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CallRecordingTranscriptDialog({
  recording,
  open,
  onOpenChange,
}: CallRecordingTranscriptDialogProps) {
  if (!recording) {
    return null
  }

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    const hours = Math.floor(mins / 60)
    const remainingMins = mins % 60

    if (hours > 0) {
      return `${hours}h ${remainingMins}m`
    }
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
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Get timestamp
  const timestamp = recording.started_at || recording.created_at

  // Parse transcript to detect speaker labels
  // Format: "Speaker Name: text\n\nSpeaker Name: text"
  const parseTranscript = (transcript: string) => {
    const segments: Array<{ speaker: string | null; text: string }> = []

    // Split by double newlines first (paragraph breaks)
    const paragraphs = transcript.split(/\n\n+/)

    for (const para of paragraphs) {
      // Check if paragraph starts with "Speaker Name:" pattern
      const speakerMatch = para.match(/^([^:]+):\s*(.+)$/)

      if (speakerMatch) {
        segments.push({
          speaker: speakerMatch[1].trim(),
          text: speakerMatch[2].trim(),
        })
      } else {
        // No speaker label, treat as continuation
        segments.push({
          speaker: null,
          text: para.trim(),
        })
      }
    }

    return segments
  }

  const transcriptSegments = recording.transcript ? parseTranscript(recording.transcript) : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-blue-500" />
            Call Recording
          </DialogTitle>
          <DialogDescription>
            {recording.summary || `Call with ${recording.provider}`}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-4">
            {/* Metadata section */}
            <div className="space-y-3">
              {/* Provider and direction */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="capitalize">
                  {recording.provider}
                </Badge>
                {recording.direction && (
                  <Badge variant="outline" className="capitalize">
                    {recording.direction}
                  </Badge>
                )}
                {recording.language && (
                  <Badge variant="outline" className="uppercase">
                    {recording.language}
                  </Badge>
                )}
              </div>

              {/* Timestamp and duration */}
              <div className="flex items-start gap-4 text-sm text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>{formatTimestamp(timestamp)}</span>
                </div>
                {recording.duration_seconds && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span>{formatDuration(recording.duration_seconds)}</span>
                  </div>
                )}
              </div>

              {/* External links */}
              <div className="flex gap-2 flex-wrap">
                {recording.provider_meeting_url && (
                  <Button variant="outline" size="sm" asChild className="gap-1.5">
                    <a href={recording.provider_meeting_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open in {recording.provider}
                    </a>
                  </Button>
                )}
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

            <Separator />

            {/* Action items section (if present) */}
            {recording.action_items && recording.action_items.length > 0 && (
              <>
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-amber-500" />
                    Action Items
                  </h3>
                  <ul className="space-y-2">
                    {recording.action_items.map((item, idx) => (
                      <li key={idx} className="flex gap-2 text-sm">
                        <span className="text-amber-500 flex-shrink-0">•</span>
                        <div className="flex-1">
                          <p className="text-foreground/90">{item.text}</p>
                          {(item.owner_user_id || item.due_date) && (
                            <div className="text-xs text-muted-foreground mt-1 flex gap-3">
                              {item.owner_user_id && <span>Owner: {item.owner_user_id}</span>}
                              {item.due_date && (
                                <span>
                                  Due: {new Date(item.due_date).toLocaleDateString('en-GB', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                <Separator />
              </>
            )}

            {/* Transcript section */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Transcript</h3>

              {!recording.transcript ? (
                <p className="text-sm text-muted-foreground italic">
                  Transcript not available for this recording yet.
                </p>
              ) : transcriptSegments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {recording.transcript}
                </p>
              ) : (
                <div className="space-y-4">
                  {transcriptSegments.map((segment, idx) => (
                    <div key={idx} className="space-y-1">
                      {segment.speaker && (
                        <div className="font-medium text-sm text-blue-600 dark:text-blue-400">
                          {segment.speaker}
                        </div>
                      )}
                      <p className="text-sm text-foreground/90 leading-relaxed pl-4 border-l-2 border-muted">
                        {segment.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
