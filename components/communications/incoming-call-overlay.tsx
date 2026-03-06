"use client"

/**
 * IncomingCallOverlay — Global call notification UI.
 *
 * Shows on ANY page in the dashboard:
 *   - Incoming call: Top-right slide-out card with caller info, accept/silence buttons
 *   - Active call: Floating pill with timer, mute, hang up controls
 *
 * Customer lookup: When an inbound call arrives, tries to match the phone number
 * to an existing customer using the /api/customers?search= endpoint.
 */

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Phone,
  PhoneOff,
  PhoneIncoming,
  Mic,
  MicOff,
  User,
  VolumeX,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useCall, formatCallDuration } from "@/lib/contexts/call-context"

interface CallerInfo {
  name: string | null
  customerId: string | null
  phone: string
}

export function IncomingCallOverlay() {
  const router = useRouter()
  const {
    callState,
    activeCall,
    acceptInbound,
    rejectInbound,
    silenceInbound,
    isSilenced,
    hangUp,
    toggleMute,
    isMuted,
    duration,
  } = useCall()

  const [callerInfo, setCallerInfo] = React.useState<CallerInfo | null>(null)
  const [lookupDone, setLookupDone] = React.useState(false)
  const [visible, setVisible] = React.useState(false)

  // ── Customer lookup for inbound calls ──────────────────────────────────────

  React.useEffect(() => {
    if (callState !== "ringing-in" || !activeCall?.from) {
      setCallerInfo(null)
      setLookupDone(false)
      return
    }

    const phone = activeCall.from
    setCallerInfo({ name: null, customerId: null, phone })
    setLookupDone(false)

    const controller = new AbortController()

    async function lookupCustomer() {
      try {
        const searchPhone = phone.replace(/^\+/, "")
        const res = await fetch(
          `/api/customers?search=${encodeURIComponent(searchPhone)}&limit=1`,
          { signal: controller.signal }
        )
        if (res.ok) {
          const json = await res.json()
          const customers = json.data || json.customers || []
          if (customers.length > 0) {
            setCallerInfo({
              name: customers[0].name,
              customerId: customers[0].id,
              phone,
            })
          }
        }
      } catch {
        // Abort or network error — ignore
      } finally {
        setLookupDone(true)
      }
    }

    lookupCustomer()
    return () => controller.abort()
  }, [callState, activeCall?.from])

  // ── Slide-in animation trigger ─────────────────────────────────────────────

  React.useEffect(() => {
    if (callState === "ringing-in") {
      // Small delay to trigger CSS transition
      const t = setTimeout(() => setVisible(true), 20)
      return () => clearTimeout(t)
    } else {
      setVisible(false)
    }
  }, [callState])

  // ── Nothing to show ────────────────────────────────────────────────────────

  if (callState === "none" || callState === "ringing-out") return null

  // ── Format phone number for display ────────────────────────────────────────

  const formatPhone = (phone: string) => {
    if (phone.startsWith("+44") && phone.length === 13) {
      return `+44 ${phone.slice(3, 7)} ${phone.slice(7)}`
    }
    return phone
  }

  // ── Incoming Call — Top-right slide-out card ───────────────────────────────

  if (callState === "ringing-in") {
    const displayPhone = activeCall?.from
      ? formatPhone(activeCall.from)
      : "Unknown"
    const displayName =
      activeCall?.name || callerInfo?.name || null
    const customerId = activeCall?.customerId || callerInfo?.customerId || null

    return (
      <div
        className={cn(
          "fixed top-[4.5rem] right-4 z-[100] w-[320px]",
          "transition-all duration-300 ease-out",
          visible
            ? "translate-x-0 opacity-100"
            : "translate-x-[120%] opacity-0"
        )}
      >
        <div
          className={cn(
            "rounded-2xl overflow-hidden",
            "bg-slate-900/95 backdrop-blur-xl",
            "border border-white/[0.08] ring-1 ring-green-500/20",
            "shadow-2xl shadow-black/50",
            isSilenced && "opacity-70"
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 pt-4 pb-3">
            {/* Pulsing indicator + avatar */}
            <div className="relative shrink-0">
              {!isSilenced && (
                <>
                  <div className="absolute inset-0 -m-1.5 rounded-full bg-green-500/20 animate-ping" />
                  <div className="absolute inset-0 -m-1 rounded-full bg-green-500/10 animate-pulse" />
                </>
              )}
              <div
                className={cn(
                  "relative h-11 w-11 rounded-full flex items-center justify-center",
                  "bg-gradient-to-br from-slate-800 to-slate-900",
                  "border border-green-500/30"
                )}
              >
                {displayName ? (
                  <span className="text-sm font-bold text-white">
                    {displayName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </span>
                ) : (
                  <User className="h-5 w-5 text-white/60" />
                )}
              </div>
            </div>

            {/* Caller info */}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-green-400/80">
                {isSilenced ? "Silenced" : "Incoming Call"}
              </p>
              {displayName ? (
                <>
                  <p className="text-sm font-semibold text-white truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-white/40 truncate">{displayPhone}</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-white truncate">
                    {displayPhone}
                  </p>
                  {!lookupDone && (
                    <p className="text-[10px] text-white/30">Looking up…</p>
                  )}
                  {lookupDone && (
                    <p className="text-[10px] text-white/30">Unknown caller</p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 px-4 pb-4">
            {/* Accept */}
            <button
              onClick={() => {
                acceptInbound()
                const url = customerId
                  ? `/communications?customer_id=${customerId}&callActive=true`
                  : "/communications?callActive=true"
                router.push(url)
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 h-10 rounded-xl",
                "bg-green-600 hover:bg-green-500 text-white text-sm font-medium",
                "shadow-lg shadow-green-600/20",
                "transition-all active:scale-[0.98]",
                !isSilenced && "animate-pulse"
              )}
            >
              <Phone className="h-4 w-4" />
              Accept
            </button>

            {/* Decline — sends to voicemail */}
            <button
              onClick={rejectInbound}
              className={cn(
                "flex items-center justify-center gap-2 h-10 px-4 rounded-xl",
                "bg-red-600/80 hover:bg-red-500 text-white text-sm font-medium",
                "shadow-lg shadow-red-600/20",
                "transition-all active:scale-[0.98]"
              )}
              title="Decline — sends caller to voicemail"
            >
              <PhoneOff className="h-4 w-4" />
            </button>

            {/* Silence / Un-silence toggle */}
            <button
              onClick={silenceInbound}
              className={cn(
                "flex items-center justify-center h-10 w-10 rounded-xl",
                "transition-all active:scale-[0.98]",
                isSilenced
                  ? "bg-teal-500/20 text-teal-400 hover:bg-teal-500/30"
                  : "bg-white/[0.06] text-white/60 hover:bg-white/[0.1] hover:text-white"
              )}
              title={isSilenced ? "Un-silence ringing" : "Silence ringing"}
            >
              <VolumeX className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Active call — Floating pill ────────────────────────────────────────────

  if (callState === "connected") {
    const name =
      activeCall?.name || activeCall?.to || activeCall?.from || "Active call"
    const customerId = activeCall?.customerId || callerInfo?.customerId
    const returnUrl = customerId
      ? `/communications?customer_id=${customerId}&callActive=true`
      : "/communications?callActive=true"

    return (
      <div className="fixed top-16 right-4 z-[100] animate-in slide-in-from-top-2 fade-in duration-300">
        <div
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-2xl",
            "bg-slate-900/95 border border-white/[0.08] backdrop-blur-xl",
            "shadow-2xl shadow-black/40"
          )}
        >
          {/* Live indicator */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative shrink-0">
              <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
              <div className="absolute inset-0 h-2.5 w-2.5 rounded-full bg-green-500 animate-ping opacity-75" />
            </div>
            <span className="text-sm font-mono font-medium text-white tabular-nums">
              {formatCallDuration(duration)}
            </span>
          </div>

          {/* Divider */}
          <div className="h-5 w-px bg-white/[0.08]" />

          {/* Name */}
          <button
            onClick={() => router.push(returnUrl)}
            className="text-xs text-white/60 hover:text-white truncate max-w-[140px] transition-colors"
          >
            {name}
          </button>

          {/* Divider */}
          <div className="h-5 w-px bg-white/[0.08]" />

          {/* Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleMute}
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center transition-colors",
                isMuted
                  ? "bg-teal-500/20 text-teal-400 hover:bg-teal-500/30"
                  : "bg-white/[0.06] text-white/60 hover:bg-white/[0.1] hover:text-white"
              )}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <MicOff className="h-3.5 w-3.5" />
              ) : (
                <Mic className="h-3.5 w-3.5" />
              )}
            </button>

            <button
              onClick={hangUp}
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center",
                "bg-red-600 hover:bg-red-500 text-white transition-colors"
              )}
              title="Hang up"
            >
              <PhoneOff className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
