"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface PageLoadingProps {
  message?: string
  className?: string
}

/**
 * Full-page loading state with animated logo
 * Use for route transitions and initial page loads
 */
export function PageLoading({ message = "Loading...", className }: PageLoadingProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center min-h-[400px] gap-4",
      className
    )}>
      {/* Animated logo/spinner */}
      <motion.div
        className="relative"
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <div className="h-12 w-12 rounded-full border-2 border-primary/20" />
        <div className="absolute inset-0 h-12 w-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </motion.div>

      {/* Loading message */}
      <motion.p
        className="text-sm text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {message}
      </motion.p>
    </div>
  )
}

/**
 * Inline loading spinner for smaller contexts
 */
export function InlineLoading({ 
  size = "md",
  className 
}: { 
  size?: "sm" | "md" | "lg"
  className?: string 
}) {
  const sizes = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  }

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <motion.div
        className={cn(sizes[size], "rounded-full border-2 border-primary border-t-transparent")}
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
      />
    </div>
  )
}

/**
 * Card loading skeleton with shimmer effect
 */
export function CardLoading({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card p-4 space-y-3", className)}>
      <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
      <div className="h-3 w-full bg-muted rounded animate-pulse" />
      <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
    </div>
  )
}

/**
 * Table row loading skeleton
 */
export function TableRowLoading({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <div className="h-4 bg-muted rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
        </td>
      ))}
    </tr>
  )
}

/**
 * List of loading skeletons
 */
export function ListLoading({ 
  count = 3,
  className 
}: { 
  count?: number
  className?: string 
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
          <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 bg-muted rounded animate-pulse" />
            <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Metric card loading skeleton
 */
export function MetricLoading({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      <div className="flex items-center gap-2 mb-2">
        <div className="h-8 w-8 rounded bg-muted animate-pulse" />
        <div className="h-3 w-20 bg-muted rounded animate-pulse" />
      </div>
      <div className="h-8 w-24 bg-muted rounded animate-pulse mb-1" />
      <div className="h-3 w-16 bg-muted rounded animate-pulse" />
    </div>
  )
}
