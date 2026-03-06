"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Send, Mail, MessageSquare, Loader2, Settings } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import Link from "next/link"

interface ChannelComposeProps {
  onSend: (params: { channel: "sms" | "email"; body: string; subject?: string }) => void
  isSending?: boolean
  customerHasPhone?: boolean
  customerHasEmail?: boolean
  smsConfigured?: boolean
  emailConfigured?: boolean
}

export function ChannelCompose({
  onSend,
  isSending,
  customerHasPhone = true,
  customerHasEmail = true,
  smsConfigured = true,
  emailConfigured = true,
}: ChannelComposeProps) {
  // Determine which channel to default to
  const defaultChannel = React.useMemo(() => {
    if (smsConfigured && customerHasPhone) return "sms"
    if (emailConfigured && customerHasEmail) return "email"
    if (customerHasPhone) return "sms"
    return "email"
  }, [smsConfigured, emailConfigured, customerHasPhone, customerHasEmail])

  const [channel, setChannel] = React.useState<"sms" | "email">(defaultChannel)
  const [message, setMessage] = React.useState("")
  const [subject, setSubject] = React.useState("")

  // Update channel if default changes
  React.useEffect(() => {
    setChannel(defaultChannel)
  }, [defaultChannel])

  const handleSend = () => {
    if (!message.trim()) return

    onSend({
      channel,
      body: message.trim(),
      subject: channel === "email" ? subject.trim() || undefined : undefined,
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

  // Can send if: integration configured AND customer has contact info
  const canSendSms = smsConfigured && customerHasPhone
  const canSendEmail = emailConfigured && customerHasEmail

  // Determine why a channel is disabled (for tooltip)
  const getSmsDisabledReason = () => {
    if (!smsConfigured) return "SMS not configured"
    if (!customerHasPhone) return "Customer has no phone number"
    return null
  }

  const getEmailDisabledReason = () => {
    if (!emailConfigured) return "Email not configured"
    if (!customerHasEmail) return "Customer has no email address"
    return null
  }

  const smsDisabledReason = getSmsDisabledReason()
  const emailDisabledReason = getEmailDisabledReason()

  const renderChannelButton = (
    channelType: "sms" | "email",
    icon: React.ReactNode,
    label: string,
    canSend: boolean,
    disabledReason: string | null
  ) => {
    const button = (
      <Button
        type="button"
        variant={channel === channelType ? "default" : "outline"}
        size="sm"
        className="gap-1.5"
        onClick={() => setChannel(channelType)}
        disabled={!canSend}
        data-testid={`channel-${channelType}-button`}
      >
        {icon}
        {label}
      </Button>
    )

    // Wrap in tooltip if disabled
    if (disabledReason) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span>{button}</span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{disabledReason}</p>
            {!smsConfigured || !emailConfigured ? (
              <Link
                href="/settings/integrations"
                className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
              >
                <Settings className="h-3 w-3" />
                Configure in Settings
              </Link>
            ) : null}
          </TooltipContent>
        </Tooltip>
      )
    }

    return button
  }

  return (
    <TooltipProvider>
      <div className="border-t border-border bg-card p-3 space-y-3" data-testid="channel-compose">
        {/* Channel selector */}
        <div className="flex items-center gap-2">
          {renderChannelButton(
            "sms",
            <MessageSquare className="h-3.5 w-3.5" />,
            "SMS",
            canSendSms,
            smsDisabledReason
          )}
          {renderChannelButton(
            "email",
            <Mail className="h-3.5 w-3.5" />,
            "Email",
            canSendEmail,
            emailDisabledReason
          )}

          {!canSendSms && !canSendEmail && (
            <span className="text-xs text-muted-foreground ml-2">
              {!smsConfigured && !emailConfigured
                ? "No channels configured"
                : "Customer has no contact info"}
            </span>
          )}
        </div>

      {/* Subject field for email */}
      {channel === "email" && (
        <div className="space-y-1">
          <Label htmlFor="subject" className="text-xs">
            Subject
          </Label>
          <Input
            id="subject"
            placeholder="Email subject..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      )}

      {/* Message textarea and send button */}
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <Textarea
            placeholder={
              channel === "sms"
                ? "Type your SMS message..."
                : "Type your email message..."
            }
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[60px] max-h-[120px] resize-none text-sm"
            disabled={isSending}
            data-testid="message-input"
          />
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>
              {channel === "sms" && (
                <>
                  {message.length} chars
                  {message.length > 160 && (
                    <span className="text-amber-600 ml-1">
                      ({Math.ceil(message.length / 160)} segments)
                    </span>
                  )}
                </>
              )}
            </span>
            <span>Enter to send • Shift+Enter for new line</span>
          </div>
        </div>

        <Button
          onClick={handleSend}
          disabled={!message.trim() || isSending || (!canSendSms && !canSendEmail)}
          className="gap-1.5 h-10"
          data-testid="send-button"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Send
        </Button>
      </div>
      </div>
    </TooltipProvider>
  )
}
