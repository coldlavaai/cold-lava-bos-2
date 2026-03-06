"use client"

/**
 * ActiveCallPanel — rendered inside the Communications thread panel in place
 * of ComposeArea while there is an active call for the current customer.
 *
 * Props:
 *   customerPhone — the customer's phone number (for matching inbound calls)
 *   customerId    — the customer's ID (for matching outbound calls)
 */

import * as React from "react"
import { Mic, MicOff, PhoneOff, Volume2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useCall, formatCallDuration } from "@/lib/contexts/call-context"

interface ActiveCallPanelProps {
  customerId: string
  customerPhone?: string | null
}

export function ActiveCallPanel({ customerId, customerPhone }: ActiveCallPanelProps) {
  const { callState, activeCall, isMuted, duration, hangUp, toggleMute } = useCall()

  // Is this call for the current customer?
  const isThisCustomer =
    activeCall?.customerId === customerId ||
    (customerPhone && (activeCall?.to === customerPhone || activeCall?.from === customerPhone))

  if (!isThisCustomer || callState === "none") return null

  return (
    <div className="border-t border-white/[0.08] bg-white/[0.02] backdrop-blur-xl p-4">
      {/* Status bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {callState === "connected" ? (
            <>
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm font-medium text-white/90">
                {formatCallDuration(duration)}
              </span>
            </>
          ) : (
            <>
              <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-sm font-medium text-white/70 animate-pulse">
                {callState === "ringing-out" ? "Calling..." : "Incoming call"}
              </span>
            </>
          )}
        </div>
        {callState === "connected" && (
          <span className="text-[10px] text-white/30 flex items-center gap-1">
            <Volume2 className="h-3 w-3 text-red-400/70" />
            Recording
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        {callState === "connected" && (
          <Button
            onClick={toggleMute}
            size="icon"
            variant="outline"
            className={cn(
              "h-10 w-10 rounded-full border-white/20 hover:border-white/40",
              isMuted && "bg-red-500/20 border-red-500/50 text-red-400"
            )}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
        )}

        <Button
          onClick={hangUp}
          size="icon"
          className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-500 text-white"
          title="End call"
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
