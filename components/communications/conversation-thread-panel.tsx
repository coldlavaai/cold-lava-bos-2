"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { UnifiedCommunicationItem } from "@/lib/api/types"
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
  ChevronLeft,
  FileText,
  ExternalLink,
  Image as ImageIcon,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ComposeArea } from "./compose-area"
import { ActiveCallPanel } from "@/components/calls/active-call-panel"
import { useCall } from "@/lib/contexts/call-context"

interface ConversationThreadPanelProps {
  customer: {
    id: string
    name: string
    email: string | null
    phone: string | null
  } | null
  items: UnifiedCommunicationItem[]
  isLoading: boolean
  isSending: boolean
  onSend: (params: {
    channel: "sms" | "email" | "whatsapp"
    body: string
    subject?: string
    integrationId?: string
    provider?: "gmail" | "outlook"
    signatureId?: string
  }) => void
  onBack?: () => void
  showBackButton?: boolean
  emailIntegrations?: Array<{
    id: string
    provider: string
    email_address: string
    display_name: string | null
  }>
  emailSignatures?: Array<{
    id: string
    name: string
    html_content: string
    text_content: string | null
    is_default: boolean
  }>
}

export function ConversationThreadPanel({
  customer,
  items,
  isLoading,
  isSending,
  onSend,
  onBack,
  showBackButton,
  emailIntegrations = [],
  emailSignatures = [],
}: ConversationThreadPanelProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const { deviceState, callState, activeCall, startOutboundCall } = useCall()

  // Is there an active call for this customer?
  const hasActiveCall =
    callState !== "none" &&
    (activeCall?.customerId === customer?.id ||
      (customer?.phone &&
        (activeCall?.to === customer.phone || activeCall?.from === customer.phone)))
  const [expandedMessages, setExpandedMessages] = React.useState<Set<string>>(new Set())

  // Auto-scroll to bottom when items change
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [items])

  const toggleExpanded = (id: string) => {
    setExpandedMessages((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Group items by date - must be before any conditional returns (rules of hooks)
  const groupedItems = React.useMemo(() => {
    // Sort items by timestamp ascending (oldest first, newest last)
    const sortedItems = [...items].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    const groups = new Map<string, UnifiedCommunicationItem[]>()

    for (const item of sortedItems) {
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

  if (!customer) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 text-white/10" />
          <p className="text-sm font-medium text-white/40">Select a customer</p>
          <p className="text-xs text-white/25 mt-1">
            Choose from the list to view their conversation
          </p>
        </div>
      </div>
    )
  }

  const initials = customer.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2)

  return (
    <div className="flex flex-col h-full">
      {/* Customer header */}
      <div className="comms-glass-header px-4 py-3">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <button
              type="button"
              onClick={onBack}
              className="p-1 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-colors lg:hidden"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center text-white text-xs font-semibold shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-white truncate">
              {customer.name}
            </h3>
            <div className="flex items-center gap-2 text-[11px] text-white/40">
              {customer.email && <span className="truncate">{customer.email}</span>}
              {customer.email && customer.phone && <span>·</span>}
              {customer.phone && <span className="shrink-0">{customer.phone}</span>}
            </div>
          </div>

          {/* Call button — only when customer has a phone number */}
          {customer.phone && (
            <button
              type="button"
              onClick={() =>
                startOutboundCall(customer.phone!, customer.name, customer.id)
              }
              disabled={deviceState !== "ready" || callState !== "none"}
              title={
                deviceState !== "ready"
                  ? "Call system connecting…"
                  : callState !== "none"
                  ? "Call in progress"
                  : `Call ${customer.name}`
              }
              className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            >
              <Phone className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Message timeline */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto comms-scrollbar p-4 space-y-5"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin h-6 w-6 border-2 border-[hsl(var(--accent))] border-t-transparent rounded-full" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageSquare className="h-10 w-10 mx-auto mb-2 text-white/10" />
              <p className="text-xs font-medium text-white/40">No messages yet</p>
              <p className="text-[10px] text-white/25 mt-1">
                Send a message to start the conversation
              </p>
            </div>
          </div>
        ) : (
          Array.from(groupedItems.entries()).map(([dateLabel, dateItems]) => (
            <div key={dateLabel}>
              {/* Date separator */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-white/[0.06]" />
                <span className="text-[10px] font-medium text-white/30 px-2">
                  {dateLabel}
                </span>
                <div className="h-px flex-1 bg-white/[0.06]" />
              </div>

              {/* Messages */}
              <div className="space-y-3">
                {dateItems.map((item) => (
                  <MessageBubble
                    key={item.id}
                    item={item}
                    isExpanded={expandedMessages.has(item.id)}
                    onToggleExpand={() => toggleExpanded(item.id)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Active call controls replace compose area during a call */}
      {hasActiveCall ? (
        <ActiveCallPanel
          customerId={customer.id}
          customerPhone={customer.phone}
        />
      ) : (
        <ComposeArea
          onSend={onSend}
          isSending={isSending}
          customerHasPhone={!!customer.phone}
          customerHasEmail={!!customer.email}
          emailIntegrations={emailIntegrations}
          emailSignatures={emailSignatures}
        />
      )}
    </div>
  )
}

// ============================================================================
// Message Bubble Component
// ============================================================================

function MessageBubble({
  item,
  isExpanded,
  onToggleExpand,
}: {
  item: UnifiedCommunicationItem
  isExpanded: boolean
  onToggleExpand: () => void
}) {
  const isOutbound = item.direction === "outbound"
  const [showSignature, setShowSignature] = React.useState(false)

  const formatTime = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    })

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const StatusIcon = () => {
    if (!isOutbound || !item.status) return null
    switch (item.status) {
      case "queued":
        return <Clock className="h-3 w-3 text-white/30 animate-pulse" />
      case "sent":
        return <Check className="h-3 w-3 text-white/50" />
      case "delivered":
        return <CheckCheck className="h-3 w-3 text-cyan-400/80" />
      case "failed":
        return <XCircle className="h-3 w-3 text-red-400/90" />
      default:
        return null
    }
  }

  const getStatusLabel = () => {
    if (!isOutbound || !item.status) return null
    switch (item.status) {
      case "queued":
        return "Sending..."
      case "sent":
        return "Sent"
      case "delivered":
        return "Delivered"
      case "failed":
        return "Failed"
      default:
        return item.status
    }
  }

  const getChannelRing = () => {
    switch (item.type) {
      case "sms":
        return "ring-2 ring-cyan-400/60"
      case "whatsapp":
        return "ring-2 ring-emerald-400/60"
      case "email":
        return "ring-2 ring-orange-400/60"
      default:
        return ""
    }
  }

  const getChannelGlassBg = () => {
    if (!isOutbound) {
      return "bg-white/[0.05] border border-white/[0.08]"
    }

    // Glassmorphic outbound bubbles with channel-specific subtle tint
    switch (item.type) {
      case "sms":
        return "bg-cyan-500/[0.08] border border-cyan-400/20"
      case "whatsapp":
        return "bg-emerald-500/[0.08] border border-emerald-400/20"
      case "email":
        return "bg-orange-500/[0.08] border border-orange-400/20"
      default:
        return "bg-white/[0.05] border border-white/[0.08]"
    }
  }

  const getChannelIcon = () => {
    switch (item.type) {
      case "sms":
        return <MessageSquare className="h-2.5 w-2.5 text-cyan-400" />
      case "email":
        return <Mail className="h-2.5 w-2.5 text-white/40" />
      case "whatsapp":
        return <MessageSquare className="h-2.5 w-2.5 text-emerald-400" />
      case "call":
        return <Phone className="h-2.5 w-2.5 text-white/40" />
      default:
        return <MessageSquare className="h-2.5 w-2.5 text-white/40" />
    }
  }

  // ---- Call Recording Card ----
  if (item.type === "call" && item.call_recording) {
    const callStatus: "completed" | "no-answer" | "failed" =
      item.call_recording.duration_seconds > 0 ? "completed" : "no-answer"

    const statusConfig = {
      completed: { label: "Completed", color: "text-emerald-400", bg: "bg-emerald-400/10" },
      "no-answer": { label: "No Answer", color: "text-amber-400", bg: "bg-amber-400/10" },
      failed: { label: "Failed", color: "text-red-400", bg: "bg-red-400/10" },
    }[callStatus]

    const isOutbound = item.call_recording.direction === "outbound"

    return (
      <div className={cn(
        "flex animate-in fade-in slide-in-from-bottom-2 duration-200",
        isOutbound ? "justify-end" : "justify-start"
      )}>
        <div
          className={cn(
            "w-full max-w-md p-3.5 rounded-2xl",
            isOutbound
              ? "bg-gradient-to-br from-slate-900/85 via-slate-900/75 to-black/80 ring-2 ring-violet-400/20"
              : "bg-gradient-to-br from-slate-800/85 via-slate-800/75 to-slate-900/80 ring-2 ring-violet-400/20",
            "text-white shadow-[0_14px_34px_-22px_rgba(0,0,0,0.9)]",
            "backdrop-blur-xl"
          )}
        >
          {/* Header row: icon + direction + status + time */}
          <div className="flex items-center gap-2 mb-2">
            <div className="h-6 w-6 rounded-full bg-violet-500/15 flex items-center justify-center shrink-0">
              <Phone className="h-3 w-3 text-violet-400" />
            </div>
            <span className="font-medium text-xs text-white/90">
              {isOutbound ? "Outbound Call" : "Inbound Call"}
            </span>
            <span className={cn("px-1.5 py-0.5 rounded-full text-[9px] font-medium", statusConfig.bg, statusConfig.color)}>
              {statusConfig.label}
            </span>
            <span className="text-[10px] text-white/30 ml-auto">
              {formatTime(item.timestamp)}
            </span>
          </div>

          {/* Duration + provider meta */}
          <div className="flex items-center gap-3 text-[10px] text-white/40 mb-2.5">
            {callStatus === "completed" && (
              <span className="flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" />
                {formatDuration(item.call_recording.duration_seconds)}
              </span>
            )}
            {item.call_recording.provider && (
              <span className="capitalize">{item.call_recording.provider}</span>
            )}
          </div>

          {item.call_recording.summary && (
            <p className="text-xs text-white/70 mb-3 leading-relaxed">
              {item.call_recording.summary}
            </p>
          )}

          {/* Audio player (HTML5) */}
          {item.call_recording.audio_url && (
            <div className="mb-3 rounded-xl bg-white/[0.04] border border-white/[0.08] p-1.5">
              <audio
                src={`/api/media/twilio?url=${encodeURIComponent(item.call_recording.audio_url)}`}
                controls
                preload="metadata"
                className="w-full h-8 [&::-webkit-media-controls-panel]:bg-transparent"
                style={{ colorScheme: "dark" }}
              />
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {item.call_recording.has_transcript && (
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-[10px] text-white/60 hover:text-white/80 transition-colors"
                  >
                    <FileText className="h-2.5 w-2.5" />
                    Transcript
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-slate-950 border-white/10 text-white">
                  <DialogHeader>
                    <DialogTitle className="text-white">Call Transcript</DialogTitle>
                  </DialogHeader>
                  <div className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">
                    {item.body}
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {item.call_recording.action_items_count > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))] text-[10px] font-medium">
                {item.call_recording.action_items_count} Actions
              </span>
            )}

            {item.call_recording.provider_meeting_url && (
              <a
                href={item.call_recording.provider_meeting_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-[10px] text-white/60 hover:text-white/80 transition-colors ml-auto"
              >
                <ExternalLink className="h-2.5 w-2.5" />
                {item.call_recording.provider}
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ---- Email Card ----
  if (item.type === "email") {
    const hasHtml = !!item.body_html
    const isLong = hasHtml ? item.body_html!.length > 500 : item.body.length > 250

    // Sanitize HTML for safe rendering: strip scripts, event handlers, iframes, forms
    const sanitizeHtml = (html: string): string => {
      return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<iframe\b[^>]*>.*?<\/iframe>/gi, '')
        .replace(/<form\b[^>]*>.*?<\/form>/gi, '')
        .replace(/<object\b[^>]*>.*?<\/object>/gi, '')
        .replace(/<embed\b[^>]*>/gi, '')
        .replace(/\s*on\w+\s*=\s*"[^"]*"/gi, '')
        .replace(/\s*on\w+\s*=\s*'[^']*'/gi, '')
        .replace(/javascript\s*:/gi, '')
    }

    // Detect signature separators for collapse
    const signatureSeparators = [
      /^--\s*$/m,
      /^Best regards/im,
      /^Kind regards/im,
      /^Regards,/im,
      /^Thanks,/im,
      /^Thank you,/im,
      /^Cheers,/im,
      /^Sent from my/im,
      /^Get Outlook for/im,
    ]

    const splitBodyAndSignature = (text: string) => {
      for (const sep of signatureSeparators) {
        const match = text.match(sep)
        if (match && match.index !== undefined && match.index > 20) {
          return {
            mainBody: text.substring(0, match.index).trimEnd(),
            signature: text.substring(match.index),
          }
        }
      }
      return { mainBody: text, signature: null }
    }

    const { mainBody, signature } = splitBodyAndSignature(item.body)

    return (
      <div className={cn("flex", isOutbound && "justify-end")}>
        <div className={cn("max-w-[85%] lg:max-w-[75%]")}>
          {/* Direction label */}
          <div
            className={cn(
              "flex items-center gap-1.5 text-[9px] text-white/25 mb-1 px-3",
              isOutbound && "justify-end"
            )}
          >
            {getChannelIcon()}
            <span>
              {isOutbound ? "SENT" : "RECEIVED"}
              {item.from_email && !isOutbound && ` · ${item.from_email}`}
              {" · "}
              {formatTime(item.timestamp)}
            </span>
          </div>

          {/* Email card */}
          <div
            className={cn(
              "rounded-2xl p-3.5 backdrop-blur-xl",
              "bg-gradient-to-br from-slate-900/85 via-slate-900/75 to-black/80",
              "shadow-[0_14px_34px_-22px_rgba(0,0,0,0.9)]",
              getChannelRing(),
              isOutbound && "rounded-br-sm",
              !isOutbound && "rounded-bl-sm"
            )}
          >
            {item.subject && (
              <div className="flex items-center gap-2 mb-2">
                <Mail className="h-3 w-3 text-white/40 shrink-0" />
                <span className="font-medium text-xs text-white/90 truncate">
                  {item.subject}
                </span>
              </div>
            )}

            {/* Render HTML or plain text */}
            {hasHtml && isExpanded ? (
              <div
                className="text-xs text-white/70 break-words leading-relaxed email-html-content"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(item.body_html!),
                }}
              />
            ) : (
              <div
                className={cn(
                  "text-xs text-white/70 whitespace-pre-wrap break-words leading-relaxed",
                  !isExpanded && isLong && "line-clamp-4"
                )}
              >
                {isExpanded ? item.body : mainBody}
              </div>
            )}

            {/* Collapsed signature */}
            {signature && isExpanded && !hasHtml && (
              <div className="mt-2">
                <button
                  type="button"
                  className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/50 transition-colors"
                  onClick={() => setShowSignature(!showSignature)}
                >
                  {showSignature ? (
                    <>
                      <ChevronUp className="h-2.5 w-2.5" />
                      Hide signature
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-2.5 w-2.5" />
                      Show signature
                    </>
                  )}
                </button>
                {showSignature && (
                  <div className="mt-1 pt-1 border-t border-white/[0.06] text-[10px] text-white/40 whitespace-pre-wrap">
                    {signature}
                  </div>
                )}
              </div>
            )}

            {isLong && (
              <button
                type="button"
                className="flex items-center gap-1 mt-2 text-[10px] text-[hsl(var(--accent))]/70 hover:text-[hsl(var(--accent))] transition-colors"
                onClick={onToggleExpand}
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-2.5 w-2.5" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-2.5 w-2.5" />
                    {hasHtml ? "Show full email" : "Read more"}
                  </>
                )}
              </button>
            )}
          </div>

          {/* Status */}
          {isOutbound && (
            <div className="flex items-center justify-end gap-1 mt-0.5 px-3">
              <StatusIcon />
              <span className="text-[9px] text-white/40 font-medium">{getStatusLabel()}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ---- SMS / WhatsApp Bubble ----
  return (
    <div className={cn(
      "flex animate-in fade-in slide-in-from-bottom-2 duration-200",
      isOutbound && "justify-end"
    )}>
      <div className={cn("max-w-[80%] lg:max-w-[70%]")}>
        {/* Direction label */}
        <div
          className={cn(
            "flex items-center gap-1.5 text-[9px] text-white/25 mb-1 px-3",
            isOutbound && "justify-end"
          )}
        >
          {getChannelIcon()}
          <span>
            {isOutbound ? "SENT" : "RECEIVED"} · {formatTime(item.timestamp)}
          </span>
        </div>

        {/* WhatsApp media */}
        {item.media && item.media.length > 0 && (
          <div className="mb-1.5 space-y-1.5 px-1">
            {item.media.map((media, i) => {
              // Images
              if (media.content_type.startsWith("image/")) {
                return (
                  <div
                    key={i}
                    className={cn(
                      "rounded-xl overflow-hidden max-w-[280px]",
                      getChannelRing(),
                      isOutbound && "ml-auto"
                    )}
                  >
                    <img
                      src={media.url}
                      alt={media.filename || "Image"}
                      className="w-full h-auto"
                      loading="lazy"
                    />
                  </div>
                )
              }

              // Videos
              if (media.content_type.startsWith("video/")) {
                return (
                  <div
                    key={i}
                    className={cn(
                      "rounded-xl overflow-hidden max-w-[360px]",
                      getChannelRing(),
                      isOutbound && "ml-auto"
                    )}
                  >
                    <video
                      src={media.url}
                      controls
                      className="w-full h-auto"
                      preload="metadata"
                    />
                  </div>
                )
              }

              // Audio/Voice notes
              if (media.content_type.startsWith("audio/")) {
                return (
                  <div
                    key={i}
                    className={cn(
                      "rounded-xl p-2 bg-white/[0.04] border border-white/[0.08]",
                      getChannelRing(),
                      isOutbound && "ml-auto"
                    )}
                  >
                    <audio src={media.url} controls className="w-full max-w-[280px]" />
                  </div>
                )
              }

              // Other files (documents, etc)
              return (
                <a
                  key={i}
                  href={media.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white/60 hover:text-white/80 transition-colors",
                    isOutbound && "ml-auto justify-end"
                  )}
                >
                  <ImageIcon className="h-3 w-3" />
                  {media.filename || "Attachment"}
                </a>
              )
            })}
          </div>
        )}

        {/* Message bubble */}
        {item.body && (!item.media || item.media.length === 0) && (
          <div
            className={cn(
              "rounded-2xl p-3 backdrop-blur-xl",
              getChannelGlassBg(),
              getChannelRing(),
              isOutbound ? "rounded-br-sm" : "rounded-bl-sm",
              "text-white/90"
            )}
          >
            <p className="text-xs whitespace-pre-wrap break-words leading-relaxed">
              {item.body}
            </p>
          </div>
        )}

        {/* Status */}
        {isOutbound && (
          <div className="flex items-center justify-end gap-1 mt-0.5 px-3">
            <StatusIcon />
            <span className="text-[9px] text-white/40 font-medium">{getStatusLabel()}</span>
          </div>
        )}
      </div>
    </div>
  )
}
