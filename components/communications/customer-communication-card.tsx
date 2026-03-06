"use client"

import { CustomerCommunicationSummary } from "@/lib/api/types"
import { cn } from "@/lib/utils"
import { Mail, MessageSquare, Phone } from "lucide-react"

interface CustomerCommunicationCardProps {
  customer: CustomerCommunicationSummary
  isSelected: boolean
  onClick: () => void
}

export function CustomerCommunicationCard({
  customer,
  isSelected,
  onClick,
}: CustomerCommunicationCardProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Now"
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
  }

  const getActivityIcon = () => {
    switch (customer.last_activity_type) {
      case "sms":
        return <MessageSquare className="h-3 w-3 text-cyan-400" />
      case "email":
        return <Mail className="h-3 w-3 text-white/50" />
      case "whatsapp":
        return <MessageSquare className="h-3 w-3 text-emerald-400" />
      case "call":
        return <Phone className="h-3 w-3 text-white/50" />
      default:
        return <MessageSquare className="h-3 w-3 text-white/50" />
    }
  }

  const initials = customer.customer_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2)

  return (
    <div
      className={cn(
        "px-3 py-2.5 cursor-pointer transition-all duration-150",
        "hover:bg-white/[0.06]",
        "border-l-2 border-l-transparent",
        isSelected
          ? "bg-white/10 border-l-[hsl(var(--accent))] ring-1 ring-inset ring-[hsl(var(--accent))]/20"
          : "bg-white/[0.02]"
      )}
      onClick={onClick}
      data-testid="customer-card"
    >
      <div className="flex items-start gap-2.5">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div
            className={cn(
              "h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold",
              customer.total_unread_count > 0
                ? "bg-gradient-to-br from-[hsl(var(--accent))] to-[hsl(var(--primary))] text-white"
                : "bg-white/[0.08] text-white/60"
            )}
          >
            {initials}
          </div>
          {customer.total_unread_count > 0 && (
            <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[hsl(var(--accent))] ring-2 ring-slate-950" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name and time */}
          <div className="flex items-center justify-between gap-2">
            <p
              className={cn(
                "text-[13px] truncate",
                customer.total_unread_count > 0
                  ? "font-semibold text-white"
                  : "font-medium text-white/85"
              )}
            >
              {customer.customer_name}
            </p>
            <span className="text-[10px] text-white/40 whitespace-nowrap shrink-0">
              {formatTime(customer.last_activity_at)}
            </span>
          </div>

          {/* Preview with icon */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="shrink-0">{getActivityIcon()}</span>
            <p
              className={cn(
                "text-[11px] truncate flex-1",
                customer.total_unread_count > 0
                  ? "text-white/70"
                  : "text-white/40"
              )}
            >
              {customer.last_activity_preview || "No messages yet"}
            </p>
          </div>

          {/* Channel indicators + unread */}
          <div className="flex items-center gap-1 mt-1.5">
            {customer.has_sms && (
              <div className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-cyan-400/10 text-cyan-400">
                <MessageSquare className="h-2 w-2" />
                <span className="text-[9px] font-medium">SMS</span>
              </div>
            )}
            {customer.has_email && (
              <div className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-white/[0.06] text-white/50">
                <Mail className="h-2 w-2" />
                <span className="text-[9px] font-medium">Email</span>
              </div>
            )}
            {customer.has_whatsapp && (
              <div className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-emerald-400/10 text-emerald-400">
                <MessageSquare className="h-2 w-2" />
                <span className="text-[9px] font-medium">WA</span>
              </div>
            )}
            {customer.has_calls && (
              <div className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-white/[0.06] text-white/50">
                <Phone className="h-2 w-2" />
                <span className="text-[9px] font-medium">Calls</span>
              </div>
            )}
            {customer.total_unread_count > 0 && (
              <div className="ml-auto px-1.5 py-0.5 rounded-full bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))]">
                <span className="text-[9px] font-bold">{customer.total_unread_count}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
