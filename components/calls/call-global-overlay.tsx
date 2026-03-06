"use client"

/**
 * CallGlobalOverlay — renders ONLY when the user is NOT on /communications.
 *
 * Shows:
 *   - An inbound call banner (centered, below topbar) when callState === "ringing-in"
 *   - An active call pill (centered, above mobile nav) when callState === "connected"
 *
 * When the user IS on /communications, nothing renders — the thread panel handles it.
 */

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { Phone, PhoneOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useCall, formatCallDuration } from "@/lib/contexts/call-context"

export function CallGlobalOverlay() {
  const pathname = usePathname()
  const router = useRouter()
  const { callState, activeCall, acceptInbound, rejectInbound, duration } = useCall()

  // On /communications the thread panel handles call UI — don't double-render
  const isOnCommsPage = pathname?.startsWith("/communications")
  if (isOnCommsPage) return null

  // Nothing active — render nothing
  // ringing-in and connected are handled by IncomingCallOverlay (mounted in layout)
  if (callState === "none" || callState === "ringing-out" || callState === "ringing-in" || callState === "connected") return null

  // ── Inbound call banner ────────────────────────────────────────────────────
  if (callState === "ringing-in") {
    const caller = activeCall?.name || activeCall?.from || "Unknown caller"
    return (
      <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-2 duration-200">
        <div
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl",
            "bg-slate-900/95 border border-white/10 backdrop-blur-xl",
            "text-white text-sm font-medium"
          )}
        >
          <Phone className="h-4 w-4 text-teal-400 animate-bounce shrink-0" />
          <span className="mr-2">
            Incoming call · <span className="text-white/70">{caller}</span>
          </span>
          <Button
            onClick={rejectInbound}
            size="sm"
            className="h-7 rounded-full bg-red-600 hover:bg-red-500 text-white px-3"
          >
            <PhoneOff className="h-3.5 w-3.5" />
          </Button>
          <Button
            onClick={() => {
              acceptInbound()
              // Navigate to comms so the thread panel takes over
              const customerId = activeCall?.customerId
              const url = customerId
                ? `/communications?customer_id=${customerId}&callActive=true`
                : "/communications?callActive=true"
              router.push(url)
            }}
            size="sm"
            className="h-7 rounded-full bg-green-600 hover:bg-green-500 text-white px-3"
          >
            <Phone className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    )
  }

  // ── Active call pill ───────────────────────────────────────────────────────
  if (callState === "connected") {
    const name = activeCall?.name || activeCall?.to || activeCall?.from || "Active call"
    const customerId = activeCall?.customerId
    const returnUrl = customerId
      ? `/communications?customer_id=${customerId}&callActive=true`
      : "/communications?callActive=true"

    return (
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 md:bottom-6">
        <button
          onClick={() => router.push(returnUrl)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full shadow-xl",
            "bg-green-600 hover:bg-green-500 text-white text-sm font-medium",
            "transition-colors cursor-pointer"
          )}
        >
          <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
          {formatCallDuration(duration)}
          <span className="text-white/80 text-xs">· {name} · Return</span>
        </button>
      </div>
    )
  }

  return null
}
