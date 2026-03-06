"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Send,
  Mail,
  MessageSquare,
  Loader2,
  Paperclip,
} from "lucide-react"

interface ComposeAreaProps {
  onSend: (params: {
    channel: "sms" | "email" | "whatsapp"
    body: string
    subject?: string
    integrationId?: string
    provider?: "gmail" | "outlook"
    signatureId?: string
  }) => void
  isSending?: boolean
  customerHasPhone?: boolean
  customerHasEmail?: boolean
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

export function ComposeArea({
  onSend,
  isSending,
  customerHasPhone = true,
  customerHasEmail = true,
  emailIntegrations = [],
  emailSignatures = [],
}: ComposeAreaProps) {
  const [channel, setChannel] = React.useState<"sms" | "email" | "whatsapp">(
    customerHasPhone ? "sms" : "email"
  )
  const [message, setMessage] = React.useState("")
  const [subject, setSubject] = React.useState("")
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const [selectedIntegrationId, setSelectedIntegrationId] = React.useState<string | null>(null)
  const [selectedSignatureId, setSelectedSignatureId] = React.useState<string | null>(null)

  // Auto-select default integration and signature
  React.useEffect(() => {
    if (emailIntegrations.length > 0 && !selectedIntegrationId) {
      setSelectedIntegrationId(emailIntegrations[0].id)
    }
  }, [emailIntegrations, selectedIntegrationId])

  React.useEffect(() => {
    const defaultSig = emailSignatures.find(s => s.is_default)
    if (defaultSig && !selectedSignatureId) {
      setSelectedSignatureId(defaultSig.id)
    }
  }, [emailSignatures, selectedSignatureId])

  // Reset channel when customer capabilities change
  React.useEffect(() => {
    if (channel === "sms" && !customerHasPhone) {
      setChannel("email")
    } else if (channel === "email" && !customerHasEmail) {
      setChannel(customerHasPhone ? "sms" : "email")
    }
  }, [customerHasPhone, customerHasEmail, channel])

  const handleSend = () => {
    if (!message.trim()) return

    const selectedIntegration = emailIntegrations.find(e => e.id === selectedIntegrationId)

    onSend({
      channel,
      body: message.trim(),
      subject: channel === "email" ? subject.trim() || undefined : undefined,
      integrationId: channel === "email" && selectedIntegration ? selectedIntegration.id : undefined,
      provider: channel === "email" && selectedIntegration ? (selectedIntegration.provider as "gmail" | "outlook") : undefined,
      signatureId: channel === "email" && selectedSignatureId ? selectedSignatureId : undefined,
    })

    setMessage("")
    setSubject("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const canSendSms = customerHasPhone
  const canSendEmail = customerHasEmail
  const canSendWhatsApp = customerHasPhone

  const smsSegments = channel === "sms" ? Math.ceil(message.length / 160) : 0

  const channels = [
    {
      value: "email" as const,
      label: "Email",
      icon: Mail,
      enabled: canSendEmail,
      color: "text-white/70",
      activeBg: "bg-white/[0.12]",
      ring: "ring-white/30",
    },
    {
      value: "sms" as const,
      label: "SMS",
      icon: MessageSquare,
      enabled: canSendSms,
      color: "text-blue-400",
      activeBg: "bg-blue-400/15",
      ring: "ring-blue-400/50",
    },
    {
      value: "whatsapp" as const,
      label: "WhatsApp",
      icon: MessageSquare,
      enabled: canSendWhatsApp,
      color: "text-emerald-400",
      activeBg: "bg-emerald-400/15",
      ring: "ring-emerald-400/50",
    },
  ]

  return (
    <div className="border-t border-white/[0.08] bg-white/[0.02] p-3 space-y-2.5">
      {/* Channel tabs */}
      <div className="flex items-center gap-1.5">
        {channels.map((ch) => {
          const Icon = ch.icon
          const isActive = channel === ch.value
          return (
            <button
              key={ch.value}
              type="button"
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                isActive
                  ? cn(ch.activeBg, ch.color, "ring-1", ch.ring)
                  : "text-white/40 hover:text-white/60 hover:bg-white/[0.04]",
                !ch.enabled && "opacity-30 cursor-not-allowed"
              )}
              onClick={() => ch.enabled && setChannel(ch.value)}
              disabled={!ch.enabled}
            >
              <Icon className="h-3 w-3" />
              {ch.label}
            </button>
          )
        })}

        {!canSendSms && !canSendEmail && (
          <span className="text-[10px] text-white/30 ml-2">
            No contact info available
          </span>
        )}
      </div>

      {/* Subject field for email */}
      {channel === "email" && (
        <input
          type="text"
          placeholder="Subject..."
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[hsl(var(--accent))]/40 focus:border-[hsl(var(--accent))]/30"
        />
      )}

      {/* From account and signature selectors for email */}
      {channel === "email" && emailIntegrations.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {/* From account selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-white/30 uppercase tracking-wide">From:</span>
            <select
              value={selectedIntegrationId || ""}
              onChange={(e) => setSelectedIntegrationId(e.target.value || null)}
              className="px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 focus:outline-none focus:ring-1 focus:ring-[hsl(var(--accent))]/40 appearance-none cursor-pointer"
            >
              <option value="" className="bg-slate-900">SendGrid (default)</option>
              {emailIntegrations.map((integration) => (
                <option key={integration.id} value={integration.id} className="bg-slate-900">
                  {integration.display_name || integration.email_address} ({integration.provider})
                </option>
              ))}
            </select>
          </div>

          {/* Signature selector */}
          {emailSignatures.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-white/30 uppercase tracking-wide">Sig:</span>
              <select
                value={selectedSignatureId || ""}
                onChange={(e) => setSelectedSignatureId(e.target.value || null)}
                className="px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 focus:outline-none focus:ring-1 focus:ring-[hsl(var(--accent))]/40 appearance-none cursor-pointer"
              >
                <option value="" className="bg-slate-900">No signature</option>
                {emailSignatures.map((sig) => (
                  <option key={sig.id} value={sig.id} className="bg-slate-900">
                    {sig.name}{sig.is_default ? " (default)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Message input + send */}
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            placeholder={
              channel === "sms"
                ? "Type SMS message..."
                : channel === "whatsapp"
                ? "Type WhatsApp message..."
                : "Type email message..."
            }
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/30 resize-none focus:outline-none focus:ring-1 focus:ring-[hsl(var(--accent))]/40 focus:border-[hsl(var(--accent))]/30 min-h-[56px] max-h-[120px]"
            disabled={isSending}
            data-testid="message-input"
          />
          {/* Bottom bar: character count + hint */}
          <div className="flex items-center justify-between mt-1 px-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="text-white/30 hover:text-white/50 transition-colors"
                title="Attach file (coming soon)"
              >
                <Paperclip className="h-3.5 w-3.5" />
              </button>
              {channel === "sms" && message.length > 0 && (
                <span className={cn(
                  "text-[10px]",
                  message.length > 160 ? "text-amber-400" : "text-white/30"
                )}>
                  {message.length}/160
                  {smsSegments > 1 && ` (${smsSegments} segments)`}
                </span>
              )}
            </div>
            <span className="text-[10px] text-white/25">
              Enter to send · Shift+Enter for new line
            </span>
          </div>
        </div>

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!message.trim() || isSending}
          className={cn(
            "flex items-center justify-center h-10 w-10 rounded-xl transition-all shrink-0",
            message.trim() && !isSending
              ? "comms-primary-btn shadow-lg shadow-[hsl(var(--primary))]/20 hover:shadow-[hsl(var(--primary))]/30"
              : "bg-white/[0.05] text-white/20 cursor-not-allowed"
          )}
          data-testid="send-button"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  )
}
