"use client"

import { WifiOff } from "lucide-react"
import { useOnlineStatus } from "@/hooks/use-online-status"

/**
 * Banner shown when user is offline
 * Session 109: PWA Offline Support
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-yellow-500 text-yellow-950 py-2 px-4 z-50">
      <div className="flex items-center justify-center gap-2 text-sm font-medium">
        <WifiOff className="h-4 w-4" />
        <span>You're offline. Some features may be unavailable.</span>
      </div>
    </div>
  )
}
