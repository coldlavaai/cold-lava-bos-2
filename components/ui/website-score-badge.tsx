"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Globe } from "lucide-react"

export interface WebsiteScoreBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  score: number | null | undefined
  size?: "sm" | "default" | "lg"
  showLabel?: boolean
  showIcon?: boolean
}

/**
 * Get colour classes for a website score.
 * - Red: under 40 (poor)
 * - Amber: 40-69 (needs work)
 * - Green: 70+ (good)
 */
function getScoreColor(score: number): {
  text: string
  bg: string
  ring: string
  label: string
} {
  if (score >= 70) {
    return {
      text: "text-emerald-400",
      bg: "bg-emerald-500/15",
      ring: "ring-emerald-500/30",
      label: "Good",
    }
  }
  if (score >= 40) {
    return {
      text: "text-amber-400",
      bg: "bg-amber-500/15",
      ring: "ring-amber-500/30",
      label: "Needs Work",
    }
  }
  return {
    text: "text-red-400",
    bg: "bg-red-500/15",
    ring: "ring-red-500/30",
    label: "Poor",
  }
}

export function WebsiteScoreBadge({
  score,
  size = "default",
  showLabel = false,
  showIcon = false,
  className,
  ...props
}: WebsiteScoreBadgeProps) {
  if (score == null) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-muted-foreground",
          size === "sm" ? "text-[0.6rem]" : size === "lg" ? "text-sm" : "text-xs",
          className
        )}
        {...props}
      >
        {showIcon && <Globe className={cn(size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3")} />}
        <span>No score</span>
      </span>
    )
  }

  const colors = getScoreColor(score)

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-semibold rounded-md ring-1",
        colors.text,
        colors.bg,
        colors.ring,
        size === "sm"
          ? "text-[0.6rem] px-1 py-0.5"
          : size === "lg"
          ? "text-sm px-2.5 py-1"
          : "text-xs px-1.5 py-0.5",
        className
      )}
      {...props}
    >
      {showIcon && <Globe className={cn(size === "sm" ? "h-2.5 w-2.5" : size === "lg" ? "h-4 w-4" : "h-3 w-3")} />}
      <span>{score}/100</span>
      {showLabel && <span className="font-normal opacity-70">· {colors.label}</span>}
    </span>
  )
}

/**
 * Inline website score text for compact views.
 */
export function WebsiteScoreText({
  score,
  className,
}: {
  score: number | null | undefined
  className?: string
}) {
  if (score == null) {
    return <span className={cn("text-muted-foreground", className)}>No score</span>
  }

  const colors = getScoreColor(score)
  return (
    <span className={cn("font-medium", colors.text, className)}>
      {score}/100
    </span>
  )
}

export { getScoreColor }
