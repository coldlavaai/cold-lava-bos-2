import * as React from "react"
import { cn } from "@/lib/utils"

interface CircularProgressProps {
  value: number
  max?: number
  size?: "sm" | "md" | "lg"
  showValue?: boolean
  className?: string
  strokeWidth?: number
  color?: "default" | "success" | "warning" | "danger"
}

const sizeMap = {
  sm: 32,
  md: 48,
  lg: 64,
}

const colorMap = {
  default: "stroke-primary",
  success: "stroke-green-500",
  warning: "stroke-amber-500",
  danger: "stroke-red-500",
}

export function CircularProgress({
  value,
  max = 100,
  size = "md",
  showValue = true,
  className,
  strokeWidth = 4,
  color = "default",
}: CircularProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  const pixelSize = sizeMap[size]
  const radius = (pixelSize - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className={cn("relative inline-flex", className)}>
      <svg
        width={pixelSize}
        height={pixelSize}
        viewBox={`0 0 ${pixelSize} ${pixelSize}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={pixelSize / 2}
          cy={pixelSize / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        {/* Progress circle */}
        <circle
          cx={pixelSize / 2}
          cy={pixelSize / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(colorMap[color], "transition-all duration-300 ease-out")}
        />
      </svg>
      {showValue && (
        <span className={cn(
          "absolute inset-0 flex items-center justify-center font-medium",
          size === "sm" && "text-xs",
          size === "md" && "text-sm",
          size === "lg" && "text-base"
        )}>
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  )
}
