"use client"

/**
 * CallContext — Global Twilio Device lifecycle + call state.
 *
 * The Twilio Device registers once when the dashboard mounts and survives
 * all page navigations. Call state is shared via context so the Communications
 * tab can render full call controls and the global overlay can show a minimal
 * banner/pill when the user is elsewhere.
 *
 * Consuming components:
 *   import { useCall } from "@/lib/contexts/call-context"
 *   const { deviceState, callState, startOutboundCall, ... } = useCall()
 */

import * as React from "react"
import { toast } from "sonner"

// Dynamic imports — Twilio SDK is browser-only
type TwilioDevice = import("@twilio/voice-sdk").Device
type TwilioCall = import("@twilio/voice-sdk").Call

// ── Types ─────────────────────────────────────────────────────────────────────

export type DeviceState = "idle" | "initialising" | "ready" | "error"
export type CallState = "none" | "ringing-out" | "ringing-in" | "connected"

export interface ActiveCallInfo {
  to?: string
  from?: string
  name?: string
  customerId?: string
  direction: "outbound" | "inbound"
  startedAt?: Date
}

export interface CallContextValue {
  deviceState: DeviceState
  callState: CallState
  activeCall: ActiveCallInfo | null
  isMuted: boolean
  isSilenced: boolean
  duration: number // seconds elapsed since call connected
  startOutboundCall: (to: string, name?: string, customerId?: string) => Promise<void>
  acceptInbound: () => void
  rejectInbound: () => void
  silenceInbound: () => void
  hangUp: () => void
  toggleMute: () => void
}

// ── Context ───────────────────────────────────────────────────────────────────

const CallContext = React.createContext<CallContextValue | null>(null)

export function useCall(): CallContextValue {
  const ctx = React.useContext(CallContext)
  if (!ctx) throw new Error("useCall must be used within a CallProvider")
  return ctx
}

// ── Utilities ─────────────────────────────────────────────────────────────────

export function formatCallDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0")
  const s = (seconds % 60).toString().padStart(2, "0")
  return `${m}:${s}`
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function CallProvider({ children }: { children: React.ReactNode }) {
  const [deviceState, setDeviceState] = React.useState<DeviceState>("idle")
  const [callState, setCallState] = React.useState<CallState>("none")
  const [activeCall, setActiveCall] = React.useState<ActiveCallInfo | null>(null)
  const [isMuted, setIsMuted] = React.useState(false)
  const [isSilenced, setIsSilenced] = React.useState(false)
  const [duration, setDuration] = React.useState(0)

  const deviceRef = React.useRef<TwilioDevice | null>(null)
  const callRef = React.useRef<TwilioCall | null>(null)
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Duration timer ──────────────────────────────────────────────────────────

  const startTimer = React.useCallback(() => {
    setDuration(0)
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
  }, [])

  const stopTimer = React.useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // ── Reset call state ────────────────────────────────────────────────────────

  const resetCall = React.useCallback(() => {
    stopTimer()
    callRef.current = null
    setActiveCall(null)
    setIsMuted(false)
    setIsSilenced(false)
    setDuration(0)
    setCallState("none")
  }, [stopTimer])

  // ── Device initialisation ───────────────────────────────────────────────────

  const initDevice = React.useCallback(async () => {
    setDeviceState("initialising")
    try {
      const res = await fetch("/api/calls/token", { method: "POST" })
      if (!res.ok) {
        // Voice not configured — fail silently, no UI shown
        const err = await res.json().catch(() => ({}))
        console.warn("[CallContext] Token unavailable:", err.error)
        setDeviceState("idle")
        return
      }

      const { token } = await res.json() as { token: string; identity: string }
      const { Device, Call } = await import("@twilio/voice-sdk")

      const device = new Device(token, {
        logLevel: "warn",
        codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
        edge: "dublin", // Ireland IE1 regional account
      })

      device.on("registered", () => setDeviceState("ready"))

      device.on("error", (err: Error & { code?: number; message?: string; twilioError?: { code: number; message: string } }) => {
        const code = err.code ?? err.twilioError?.code ?? "unknown"
        const msg = err.twilioError?.message ?? err.message ?? "unknown error"
        console.error("[CallContext] Device error full:", JSON.stringify(err, null, 2))
        setDeviceState("error")
        toast.error(`Call error ${code}: ${msg}`)
      })

      device.on("tokenWillExpire", async () => {
        const r = await fetch("/api/calls/token", { method: "POST" })
        if (r.ok) {
          const { token: newToken } = await r.json() as { token: string }
          device.updateToken(newToken)
        }
      })

      // Inbound call
      device.on("incoming", (call: TwilioCall) => {
        callRef.current = call
        const from = call.parameters.From || "Unknown"
        setActiveCall({ from, direction: "inbound" })
        setCallState("ringing-in")
        call.on("cancel", () => resetCall())
        call.on("disconnect", () => resetCall())
      })

      await device.register()
      deviceRef.current = device
    } catch (err) {
      console.error("[CallContext] Init error:", err)
      setDeviceState("idle")
    }
  }, [resetCall])

  React.useEffect(() => {
    initDevice()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      deviceRef.current?.destroy()
    }
  }, [initDevice])

  // ── Call actions ────────────────────────────────────────────────────────────

  const startOutboundCall = React.useCallback(
    async (to: string, name?: string, customerId?: string) => {
      if (!deviceRef.current || deviceState !== "ready") {
        toast.error("Call system not ready. Please wait a moment.")
        return
      }
      try {
        setCallState("ringing-out")
        setActiveCall({ to, name, customerId, direction: "outbound" })

        const call = await deviceRef.current.connect({ params: { To: to } })
        callRef.current = call

        call.on("accept", () => {
          setCallState("connected")
          setActiveCall(a => a ? { ...a, startedAt: new Date() } : a)
          startTimer()

          // Create call record immediately so it shows in timeline
          // The Twilio CallSid from the connected call is the parent SID
          const callSid = (call as unknown as { parameters?: { CallSid?: string } }).parameters?.CallSid
          if (callSid) {
            fetch("/api/call-recordings/create-live", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                provider_call_id: callSid,
                direction: "outbound",
                customer_phone: to,
                customer_id: customerId,
              }),
            }).catch(err => console.warn("[CallContext] Failed to create live call record:", err))
          }
        })
        call.on("disconnect", () => resetCall())
        call.on("cancel", () => resetCall())
        call.on("error", (err: Error) => {
          console.error("[CallContext] Call error:", err)
          toast.error("Call failed: " + err.message)
          resetCall()
        })
      } catch (err) {
        console.error("[CallContext] Connect error:", err)
        toast.error("Failed to start call")
        setCallState("none")
        setActiveCall(null)
      }
    },
    [deviceState, startTimer, resetCall]
  )

  const acceptInbound = React.useCallback(() => {
    const call = callRef.current
    call?.accept()
    setCallState("connected")
    setActiveCall(a => a ? { ...a, startedAt: new Date() } : a)
    startTimer()

    // Create inbound call record immediately
    const callSid = (call as unknown as { parameters?: { CallSid?: string } })?.parameters?.CallSid
    const fromNum = (call as unknown as { parameters?: { From?: string } })?.parameters?.From
    if (callSid) {
      fetch("/api/call-recordings/create-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider_call_id: callSid,
          direction: "inbound",
          customer_phone: fromNum,
        }),
      }).catch(err => console.warn("[CallContext] Failed to create live inbound record:", err))
    }
  }, [startTimer])

  const rejectInbound = React.useCallback(() => {
    callRef.current?.reject()
    resetCall()
  }, [resetCall])

  const silenceInbound = React.useCallback(() => {
    // Silence/un-silence the ringing notification without rejecting the call.
    // The caller keeps hearing ringing on their end — the call can still
    // be answered, or it will ring out to voicemail.
    setIsSilenced(prev => {
      const newVal = !prev
      // Mute/unmute the incoming audio on the Twilio Device
      try {
        const device = deviceRef.current
        if (device && device.audio) {
          device.audio.incoming(newVal ? false : true)
        }
      } catch (e) {
        console.warn("[CallContext] Could not toggle incoming audio:", e)
      }
      return newVal
    })
  }, [])

  const hangUp = React.useCallback(() => {
    callRef.current?.disconnect()
    resetCall()
  }, [resetCall])

  const toggleMute = React.useCallback(() => {
    if (!callRef.current) return
    const next = !isMuted
    callRef.current.mute(next)
    setIsMuted(next)
  }, [isMuted])

  // ── Context value ───────────────────────────────────────────────────────────

  const value = React.useMemo<CallContextValue>(
    () => ({
      deviceState,
      callState,
      activeCall,
      isMuted,
      isSilenced,
      duration,
      startOutboundCall,
      acceptInbound,
      rejectInbound,
      silenceInbound,
      hangUp,
      toggleMute,
    }),
    [
      deviceState,
      callState,
      activeCall,
      isMuted,
      isSilenced,
      duration,
      startOutboundCall,
      acceptInbound,
      rejectInbound,
      silenceInbound,
      hangUp,
      toggleMute,
    ]
  )

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>
}
