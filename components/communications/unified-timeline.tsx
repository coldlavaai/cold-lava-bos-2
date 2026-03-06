"use client"

import * as React from "react"
import { UnifiedCommunicationItem } from "@/lib/api/types"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Mail,
  MessageSquare,
  Phone,
  Clock,
  Check,
  CheckCheck,
  XCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Play,
  ExternalLink,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface UnifiedTimelineProps {
  items: UnifiedCommunicationItem[]
  isLoading?: boolean
}

export function UnifiedTimeline({ items, isLoading }: UnifiedTimelineProps) {
  // Group items by date
  const groupedItems = React.useMemo(() => {
    const groups = new Map<string, UnifiedCommunicationItem[]>()

    for (const item of items) {
      const date = new Date(item.timestamp)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      let label: string
      if (date.toDateString() === today.toDateString()) {
        label = "Today"
      } else if (date.toDateString() === yesterday.toDateString()) {
        label = "Yesterday"
      } else {
        label = date.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
        })
      }

      const existing = groups.get(label) || []
      existing.push(item)
      groups.set(label, existing)
    }

    return groups
  }, [items])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-muted-foreground">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium">No communications yet</p>
          <p className="text-xs mt-1">Send a message to start the conversation</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6" data-testid="unified-timeline">
      {Array.from(groupedItems.entries()).map(([dateLabel, dateItems]) => (
        <div key={dateLabel}>
          {/* Date header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground px-2">
              {dateLabel}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Items for this date */}
          <div className="space-y-3">
            {dateItems.map((item) => (
              <TimelineItem key={item.id} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function TimelineItem({ item }: { item: UnifiedCommunicationItem }) {
  const [expanded, setExpanded] = React.useState(false)
  const isOutbound = item.direction === "outbound"

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const getStatusIcon = () => {
    if (!isOutbound || !item.status) return null
    switch (item.status) {
      case "queued":
        return <Clock className="h-3 w-3 text-muted-foreground" />
      case "sent":
        return <Check className="h-3 w-3 text-muted-foreground" />
      case "delivered":
        return <CheckCheck className="h-3 w-3 text-green-600" />
      case "failed":
        return <XCircle className="h-3 w-3 text-destructive" />
      default:
        return null
    }
  }

  const getChannelIcon = () => {
    switch (item.type) {
      case "sms":
        return <MessageSquare className="h-3.5 w-3.5" />
      case "email":
        return <Mail className="h-3.5 w-3.5" />
      case "whatsapp":
        return <MessageSquare className="h-3.5 w-3.5 text-green-600" />
      case "call":
        return <Phone className="h-3.5 w-3.5" />
      default:
        return <MessageSquare className="h-3.5 w-3.5" />
    }
  }

  // Call recording card
  if (item.type === "call" && item.call_recording) {
    return (
      <div className="flex justify-center">
        <div className="w-full max-w-md p-4 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">
              {isOutbound ? "Outbound Call" : "Inbound Call"}
            </span>
            <span className="text-xs text-muted-foreground ml-auto">
              {formatTime(item.timestamp)}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(item.call_recording.duration_seconds)}
            </span>
            <span>Provider: {item.call_recording.provider}</span>
          </div>

          {item.call_recording.summary && (
            <p className="text-sm mb-3">{item.call_recording.summary}</p>
          )}

          <div className="flex items-center gap-2">
            {item.call_recording.has_transcript && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs">
                    <FileText className="h-3 w-3 mr-1" />
                    View Transcript
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Call Transcript</DialogTitle>
                  </DialogHeader>
                  <div className="prose prose-sm">
                    <p className="whitespace-pre-wrap">{item.body}</p>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {item.call_recording.action_items_count > 0 && (
              <Badge variant="secondary" className="text-xs">
                {item.call_recording.action_items_count} Action Items
              </Badge>
            )}

            {item.call_recording.audio_url && (
              <Button variant="ghost" size="sm" className="text-xs ml-auto">
                <Play className="h-3 w-3 mr-1" />
                Play
              </Button>
            )}

            {item.call_recording.provider_meeting_url && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                asChild
              >
                <a
                  href={item.call_recording.provider_meeting_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Open in {item.call_recording.provider}
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Email message (expandable)
  if (item.type === "email") {
    const isLong = item.body.length > 200

    return (
      <div className={cn("flex", isOutbound && "justify-end")}>
        <div className={cn("max-w-[80%]", isOutbound && "items-end")}>
          {/* Direction label */}
          <div
            className={cn(
              "flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1 px-2",
              isOutbound && "justify-end"
            )}
          >
            {!isOutbound && <span>← INBOUND EMAIL</span>}
            {isOutbound && <span>OUTBOUND EMAIL →</span>}
            <span>({formatTime(item.timestamp)})</span>
          </div>

          {/* Email card */}
          <div
            className={cn(
              "rounded-lg p-3 border",
              isOutbound
                ? "bg-primary/5 border-primary/20"
                : "bg-card border-border"
            )}
          >
            {item.subject && (
              <div className="flex items-center gap-2 mb-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium text-sm">{item.subject}</span>
              </div>
            )}

            <p
              className={cn(
                "text-sm whitespace-pre-wrap",
                !expanded && isLong && "line-clamp-3"
              )}
            >
              {item.body}
            </p>

            {isLong && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 h-6 text-xs"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Read more
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Status */}
          {isOutbound && (
            <div className="flex items-center justify-end gap-1 mt-1 px-2">
              {getStatusIcon()}
              <span className="text-[10px] text-muted-foreground">
                {item.status}
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // SMS/WhatsApp message bubble
  return (
    <div className={cn("flex", isOutbound && "justify-end")}>
      <div className={cn("max-w-[75%] space-y-1", isOutbound && "items-end")}>
        {/* Direction label */}
        <div
          className={cn(
            "flex items-center gap-1.5 text-[10px] text-muted-foreground px-2",
            isOutbound && "justify-end"
          )}
        >
          {getChannelIcon()}
          {!isOutbound && <span>← INBOUND</span>}
          {isOutbound && <span>OUTBOUND →</span>}
          <span>({formatTime(item.timestamp)})</span>
        </div>

        {/* Message bubble */}
        <div
          className={cn(
            "rounded-2xl p-3 shadow-sm",
            isOutbound
              ? "bg-gradient-to-br from-primary to-primary/90 text-white rounded-br-sm"
              : "bg-card border border-border rounded-bl-sm"
          )}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{item.body}</p>
        </div>

        {/* Status for outbound */}
        {isOutbound && (
          <div className="flex items-center justify-end gap-1 px-2">
            {getStatusIcon()}
            <span className="text-[10px] text-muted-foreground">
              {item.status}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
