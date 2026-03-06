"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Search,
  RefreshCw,
  Plus,
  MessageSquare,
  Mail,
  Phone,
  AlertCircle,
} from "lucide-react"
import { CustomerCommunicationSummary } from "@/lib/api/types"
import { CustomerCommunicationCard } from "./customer-communication-card"

interface CustomerListPanelProps {
  customers: CustomerCommunicationSummary[]
  isLoading: boolean
  error: Error | null
  selectedCustomerId: string | null
  searchQuery: string
  selectedChannel: string
  onSearchChange: (query: string) => void
  onChannelChange: (channel: string) => void
  onCustomerClick: (customerId: string) => void
  onRefresh: () => void
  onNewConversation: () => void
  isSyncing?: boolean
}

export function CustomerListPanel({
  customers,
  isLoading,
  error,
  selectedCustomerId,
  searchQuery,
  selectedChannel,
  onSearchChange,
  onChannelChange,
  onCustomerClick,
  onRefresh,
  onNewConversation,
  isSyncing,
}: CustomerListPanelProps) {
  const channelFilters = [
    { value: "all", label: "All" },
    { value: "sms", label: "SMS", icon: MessageSquare, color: "text-blue-400" },
    { value: "email", label: "Email", icon: Mail, color: "text-white/60" },
    { value: "whatsapp", label: "WA", icon: MessageSquare, color: "text-emerald-400" },
    { value: "call", label: "Calls", icon: Phone, color: "text-white/60" },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="comms-glass-header px-3 py-3 space-y-2.5">
        {/* Title row */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white tracking-tight">
            Communications
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onRefresh}
              className={cn(
                "p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all",
                isSyncing && "animate-spin"
              )}
              title="Sync messages"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onNewConversation}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium comms-accent-btn transition-all hover:opacity-90"
              title="New conversation"
            >
              <Plus className="h-3 w-3" />
              <span className="hidden xl:inline">New</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30" />
          <input
            type="search"
            placeholder="Search customers..."
            className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[hsl(var(--accent))]/30"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Channel filters */}
        <div className="flex items-center gap-1">
          {channelFilters.map((filter) => {
            const isActive = selectedChannel === filter.value
            return (
              <button
                key={filter.value}
                type="button"
                className={cn(
                  "px-2 py-1 rounded text-[10px] font-medium transition-all",
                  isActive
                    ? "bg-white/[0.12] text-white"
                    : "text-white/40 hover:text-white/60 hover:bg-white/[0.04]"
                )}
                onClick={() => onChannelChange(filter.value)}
              >
                {filter.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Customer list */}
      <div className="flex-1 overflow-y-auto comms-scrollbar">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-400/50" />
            <p className="text-xs text-red-400/70">Failed to load</p>
            <button
              type="button"
              onClick={onRefresh}
              className="mt-2 text-[10px] text-[hsl(var(--accent))] hover:underline"
            >
              Retry
            </button>
          </div>
        ) : customers.length > 0 ? (
          <div className="divide-y divide-white/[0.04]">
            {customers.map((customer) => (
              <CustomerCommunicationCard
                key={customer.customer_id}
                customer={customer}
                isSelected={selectedCustomerId === customer.customer_id}
                onClick={() => onCustomerClick(customer.customer_id)}
              />
            ))}
          </div>
        ) : (
          <div className="p-6 text-center">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-white/20" />
            <p className="text-xs font-medium text-white/50">No conversations</p>
            <p className="text-[10px] text-white/30 mt-1">
              {searchQuery ? "Try a different search" : "Start by sending a message"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
