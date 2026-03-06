"use client"

import * as React from "react"
import { Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUnreadCount } from "@/lib/api/hooks"
import { NotificationPanel } from "./notification-panel"
import { createClient } from "@/lib/supabase/client"
import { useQueryClient } from "@tanstack/react-query"

export function NotificationBell() {
  const [open, setOpen] = React.useState(false)
  const { data: meta } = useUnreadCount()
  const queryClient = useQueryClient()

  const unreadCount = meta?.unread_count || 0
  const unreadByType = meta?.unread_by_type || { feed: 0, reminder: 0, system: 0 }

  // Real-time subscription to notifications table
  React.useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table: "notifications",
        },
        () => {
          // Invalidate all notification queries to refetch
          queryClient.invalidateQueries({ queryKey: ["notifications"] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return (
    <div className="relative">
      <button
        data-notification-trigger
        onClick={() => setOpen(!open)}
        className={cn(
          "relative p-2 rounded-lg transition-colors",
          open
            ? "bg-white/[0.08] text-white"
            : "text-slate-400 hover:text-white hover:bg-white/[0.06]"
        )}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-red-500 text-[10px] font-bold text-white leading-none ring-2 ring-slate-900">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <NotificationPanel
        open={open}
        onClose={() => setOpen(false)}
        unreadByType={unreadByType}
      />
    </div>
  )
}
