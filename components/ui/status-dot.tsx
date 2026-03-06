import * as React from "react"
import { cn } from "@/lib/utils"

interface StatusDotProps {
  status: "online" | "offline" | "busy" | "away" | "success" | "warning" | "error"
  size?: "sm" | "md" | "lg"
  pulse?: boolean
  className?: string
}

const statusColors = {
  online: "bg-green-500",
  offline: "bg-white/30",
  busy: "bg-red-500",
  away: "bg-amber-500",
  success: "bg-green-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
}

const sizeClasses = {
  sm: "h-2 w-2",
  md: "h-3 w-3",
  lg: "h-4 w-4",
}

export function StatusDot({
  status,
  size = "md",
  pulse = false,
  className,
}: StatusDotProps) {
  return (
    <span
      className={cn(
        "inline-block rounded-full",
        statusColors[status],
        sizeClasses[size],
        pulse && "animate-pulse",
        className
      )}
    />
  )
}
