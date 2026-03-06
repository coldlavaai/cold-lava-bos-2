"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Search,
  X,
  Send,
  Mail,
  MessageSquare,
  Loader2,
  User,
} from "lucide-react"
import { useCustomers } from "@/lib/api/hooks"
import type { Customer } from "@/lib/api/types"

interface NewConversationFormProps {
  onSend: (params: {
    customerId: string
    channel: "sms" | "email" | "whatsapp"
    body: string
    subject?: string
  }) => void
  onClose: () => void
  isSending?: boolean
}

export function NewConversationForm({
  onSend,
  onClose,
  isSending,
}: NewConversationFormProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null)
  const [channel, setChannel] = React.useState<"sms" | "email" | "whatsapp">("sms")
  const [message, setMessage] = React.useState("")
  const [subject, setSubject] = React.useState("")
  const [showDropdown, setShowDropdown] = React.useState(false)

  const { data: customersData } = useCustomers({
    search: searchQuery || undefined,
    limit: 10,
  })

  const customers = customersData?.data || []

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setSearchQuery("")
    setShowDropdown(false)
    // Default channel based on available contact info
    if (customer.phone) {
      setChannel("sms")
    } else if (customer.email) {
      setChannel("email")
    }
  }

  const handleSend = () => {
    if (!selectedCustomer || !message.trim()) return

    onSend({
      customerId: selectedCustomer.id,
      channel,
      body: message.trim(),
      subject: channel === "email" ? subject.trim() || undefined : undefined,
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const canSendSms = selectedCustomer?.phone != null
  const canSendEmail = selectedCustomer?.email != null
  const canSendWhatsApp = selectedCustomer?.phone != null

  const channels = [
    { value: "email" as const, label: "Email", icon: Mail, enabled: canSendEmail, color: "text-white/70", activeBg: "bg-white/[0.12]" },
    { value: "sms" as const, label: "SMS", icon: MessageSquare, enabled: canSendSms, color: "text-blue-400", activeBg: "bg-blue-400/15" },
    { value: "whatsapp" as const, label: "WhatsApp", icon: MessageSquare, enabled: canSendWhatsApp, color: "text-emerald-400", activeBg: "bg-emerald-400/15" },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="comms-glass-header px-4 py-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">New Conversation</h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {/* Customer search */}
        <div>
          <label className="text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1.5 block">
            To
          </label>
          {selectedCustomer ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08]">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center text-white text-[10px] font-semibold shrink-0">
                {selectedCustomer.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .substring(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">
                  {selectedCustomer.name}
                </p>
                <p className="text-[10px] text-white/40 truncate">
                  {selectedCustomer.email || selectedCustomer.phone || ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="p-1 rounded text-white/30 hover:text-white/60 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[hsl(var(--accent))]/30"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setShowDropdown(true)
                }}
                onFocus={() => setShowDropdown(true)}
              />

              {/* Dropdown */}
              {showDropdown && searchQuery.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl bg-slate-900 border border-white/[0.1] shadow-2xl max-h-48 overflow-y-auto comms-scrollbar">
                  {customers.length === 0 ? (
                    <div className="p-3 text-center text-[10px] text-white/30">
                      No customers found
                    </div>
                  ) : (
                    customers.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.06] transition-colors text-left"
                        onClick={() => handleSelectCustomer(customer)}
                      >
                        <User className="h-3.5 w-3.5 text-white/30 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-white/80 truncate">
                            {customer.name}
                          </p>
                          <p className="text-[10px] text-white/30 truncate">
                            {customer.email || customer.phone || ""}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Channel selector */}
        {selectedCustomer && (
          <div>
            <label className="text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1.5 block">
              Channel
            </label>
            <div className="flex items-center gap-1.5">
              {channels.map((ch) => {
                const Icon = ch.icon
                const isActive = channel === ch.value
                return (
                  <button
                    key={ch.value}
                    type="button"
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                      isActive
                        ? cn(ch.activeBg, ch.color)
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
            </div>
          </div>
        )}

        {/* Subject (email only) */}
        {selectedCustomer && channel === "email" && (
          <div>
            <label className="text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1.5 block">
              Subject
            </label>
            <input
              type="text"
              placeholder="Email subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[hsl(var(--accent))]/30"
            />
          </div>
        )}

        {/* Message */}
        {selectedCustomer && (
          <div className="flex-1 flex flex-col">
            <label className="text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1.5 block">
              Message
            </label>
            <textarea
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={4}
              className="flex-1 w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-white/30 resize-none focus:outline-none focus:ring-1 focus:ring-[hsl(var(--accent))]/30 min-h-[100px]"
              disabled={isSending}
            />

            {/* Send button */}
            <button
              type="button"
              onClick={handleSend}
              disabled={!message.trim() || !selectedCustomer || isSending}
              className={cn(
                "mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all",
                message.trim() && selectedCustomer && !isSending
                  ? "comms-primary-btn shadow-lg shadow-[hsl(var(--primary))]/20"
                  : "bg-white/[0.05] text-white/20 cursor-not-allowed"
              )}
            >
              {isSending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Send Message
            </button>
          </div>
        )}

        {/* Placeholder when no customer selected */}
        {!selectedCustomer && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <User className="h-10 w-10 mx-auto mb-2 text-white/10" />
              <p className="text-xs text-white/30">
                Search and select a customer to start
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
