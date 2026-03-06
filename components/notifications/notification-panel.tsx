"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { X, CheckCheck, Bell, Clock, AlertTriangle, Rss } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDismissNotification,
  type Notification,
} from "@/lib/api/hooks"
import { formatDistanceToNow, format, isToday, isTomorrow } from "date-fns"

interface NotificationPanelProps {
  open: boolean
  onClose: () => void
  unreadByType?: {
    feed: number
    reminder: number
    system: number
  }
}

// ---- Notification Item for Feeds ----
function FeedItem({
  notification,
  onRead,
  onClick,
}: {
  notification: Notification
  onRead: (id: string) => void
  onClick: (n: Notification) => void
}) {
  const initials = notification.actor_name
    ? notification.actor_name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?"

  return (
    <button
      onClick={() => {
        if (!notification.is_read) onRead(notification.id)
        onClick(notification)
      }}
      className={cn(
        "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors border-b border-white/[0.06] last:border-0"
      )}
    >
      {/* Avatar */}
      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold">
        {notification.icon || initials}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm leading-snug",
            notification.is_read ? "text-white/60" : "text-white font-medium"
          )}
        >
          {notification.actor_name && (
            <span className="font-semibold text-white">
              {notification.actor_name}{" "}
            </span>
          )}
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-xs text-white/40 mt-0.5 line-clamp-1">
            {notification.body}
          </p>
        )}
        <p className="text-xs text-white/30 mt-1">
          {formatDistanceToNow(new Date(notification.created_at), {
            addSuffix: true,
          })}
        </p>
      </div>

      {/* Unread dot */}
      {!notification.is_read && (
        <div className="h-2.5 w-2.5 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
      )}
    </button>
  )
}

// ---- Notification Item for Reminders ----
function ReminderItem({
  notification,
  onDismiss,
  onClick,
}: {
  notification: Notification
  onDismiss: (id: string) => void
  onClick: (n: Notification) => void
}) {
  const scheduledDate = notification.scheduled_at
    ? new Date(notification.scheduled_at)
    : null

  const formatSchedule = () => {
    if (!scheduledDate) return null
    if (isToday(scheduledDate)) return `Today at ${format(scheduledDate, "h:mm a")}`
    if (isTomorrow(scheduledDate)) return `Tomorrow at ${format(scheduledDate, "h:mm a")}`
    return format(scheduledDate, "MMM d 'at' h:mm a")
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 border-b border-white/[0.06] last:border-0"
      )}
    >
      {/* Icon */}
      <div className="h-9 w-9 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
        <Clock className="h-4 w-4 text-blue-400" />
      </div>

      {/* Content */}
      <button
        onClick={() => onClick(notification)}
        className="flex-1 min-w-0 text-left"
      >
        <p
          className={cn(
            "text-sm leading-snug",
            notification.is_read ? "text-white/60" : "text-white font-medium"
          )}
        >
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-xs text-white/40 mt-0.5 line-clamp-1">
            {notification.body}
          </p>
        )}
        {scheduledDate && (
          <p className="text-xs text-blue-400 mt-1 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatSchedule()}
          </p>
        )}
      </button>

      {/* Dismiss */}
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation()
          onDismiss(notification.id)
        }}
        className="h-7 px-2 text-xs text-white/40 hover:text-white hover:bg-white/[0.08] flex-shrink-0"
      >
        Dismiss
      </Button>
    </div>
  )
}

// ---- Notification Item for System ----
function SystemItem({
  notification,
  onRead,
  onClick,
}: {
  notification: Notification
  onRead: (id: string) => void
  onClick: (n: Notification) => void
}) {
  return (
    <button
      onClick={() => {
        if (!notification.is_read) onRead(notification.id)
        onClick(notification)
      }}
      className={cn(
        "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors border-b border-white/[0.06] last:border-0"
      )}
    >
      {/* Icon */}
      <div className="h-9 w-9 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
        <AlertTriangle className="h-4 w-4 text-amber-400" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm leading-snug",
            notification.is_read ? "text-white/60" : "text-white font-medium"
          )}
        >
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-xs text-white/40 mt-0.5 line-clamp-2">
            {notification.body}
          </p>
        )}
        <p className="text-xs text-white/30 mt-1">
          {formatDistanceToNow(new Date(notification.created_at), {
            addSuffix: true,
          })}
        </p>
      </div>

      {!notification.is_read && (
        <div className="h-2.5 w-2.5 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />
      )}
    </button>
  )
}

// ---- Empty State ----
function EmptyState({ type }: { type: string }) {
  const config = {
    feed: { icon: Rss, text: "No activity yet" },
    reminder: { icon: Clock, text: "No reminders" },
    system: { icon: AlertTriangle, text: "No system notifications" },
  }[type] || { icon: Bell, text: "No notifications" }

  const Icon = config.icon

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Icon className="h-10 w-10 text-white/20 mb-3" />
      <p className="text-sm text-white/40">{config.text}</p>
    </div>
  )
}

// ---- Tab Content ----
function TabContent({
  type,
  onClose,
}: {
  type: string
  onClose: () => void
}) {
  const router = useRouter()
  const { data: response, isLoading } = useNotifications({ type, limit: 50 })
  const markRead = useMarkNotificationRead()
  const dismiss = useDismissNotification()

  const notifications = (response as unknown as { data: Notification[] })?.data || []

  const handleClick = (n: Notification) => {
    const target = n.link || (n.entity_type && n.entity_id ? `/${n.entity_type}s/${n.entity_id}` : null)
    if (target) {
      onClose()
      router.push(target)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3 animate-pulse">
            <div className="h-9 w-9 rounded-full bg-white/[0.08]" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-white/[0.08] rounded w-3/4" />
              <div className="h-2 bg-white/[0.06] rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (notifications.length === 0) {
    return <EmptyState type={type} />
  }

  return (
    <ScrollArea className="h-[360px]">
      {type === "feed" &&
        notifications.map((n) => (
          <FeedItem
            key={n.id}
            notification={n}
            onRead={(id) => markRead.mutate(id)}
            onClick={handleClick}
          />
        ))}
      {type === "reminder" &&
        notifications.map((n) => (
          <ReminderItem
            key={n.id}
            notification={n}
            onDismiss={(id) => dismiss.mutate(id)}
            onClick={handleClick}
          />
        ))}
      {type === "system" &&
        notifications.map((n) => (
          <SystemItem
            key={n.id}
            notification={n}
            onRead={(id) => markRead.mutate(id)}
            onClick={handleClick}
          />
        ))}
    </ScrollArea>
  )
}

// ---- Main Panel ----
export function NotificationPanel({
  open,
  onClose,
  unreadByType,
}: NotificationPanelProps) {
  const [activeTab, setActiveTab] = React.useState("feed")
  const markAllRead = useMarkAllNotificationsRead()
  const panelRef = React.useRef<HTMLDivElement>(null)

  // Close on click outside
  React.useEffect(() => {
    if (!open) return

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        // Don't close if clicking the bell trigger
        const target = e.target as HTMLElement
        if (target.closest('[data-notification-trigger]')) return
        onClose()
      }
    }

    // Delay to avoid immediate close from the opening click
    const timeout = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside)
    }, 0)

    return () => {
      clearTimeout(timeout)
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open, onClose])

  // Close on Escape
  React.useEffect(() => {
    if (!open) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [open, onClose])

  if (!open) return null

  const tabBadge = (type: "feed" | "reminder" | "system") => {
    const count = unreadByType?.[type] || 0
    if (count === 0) return null
    return (
      <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
        {count > 99 ? "99+" : count}
      </span>
    )
  }

  return (
    <div
      ref={panelRef}
      className={cn(
        "absolute right-0 top-full mt-2 w-[400px] max-w-[calc(100vw-1rem)]",
        "bg-slate-900/98 backdrop-blur-xl rounded-2xl shadow-2xl",
        "border border-white/[0.1]",
        "z-50 overflow-hidden",
        "animate-in fade-in slide-in-from-top-2 duration-200"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
        <h3 className="text-sm font-semibold text-white">Notifications</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => markAllRead.mutate(activeTab)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Mark all as read
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 rounded-none bg-transparent border-b border-white/[0.08] h-10 p-0">
          <TabsTrigger
            value="feed"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-transparent data-[state=active]:text-white text-white/50 text-xs font-medium h-full"
          >
            Feeds{tabBadge("feed")}
          </TabsTrigger>
          <TabsTrigger
            value="reminder"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-transparent data-[state=active]:text-white text-white/50 text-xs font-medium h-full"
          >
            Reminders{tabBadge("reminder")}
          </TabsTrigger>
          <TabsTrigger
            value="system"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-transparent data-[state=active]:text-white text-white/50 text-xs font-medium h-full"
          >
            System{tabBadge("system")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="mt-0">
          <TabContent type="feed" onClose={onClose} />
        </TabsContent>
        <TabsContent value="reminder" className="mt-0">
          <TabContent type="reminder" onClose={onClose} />
        </TabsContent>
        <TabsContent value="system" className="mt-0">
          <TabContent type="system" onClose={onClose} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
