"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface DataTableSkeletonProps {
  columns?: number
  rows?: number
  showHeader?: boolean
  className?: string
}

export function DataTableSkeleton({
  columns = 4,
  rows = 5,
  showHeader = true,
  className,
}: DataTableSkeletonProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="rounded-lg border border-border overflow-hidden">
        {/* Header */}
        {showHeader && (
          <div className="bg-muted/50 border-b border-border">
            <div className="flex gap-4 p-4">
              {Array.from({ length: columns }).map((_, i) => (
                <div
                  key={`header-${i}`}
                  className="h-4 rounded animate-skeleton bg-muted flex-1"
                  style={{ maxWidth: i === 0 ? "150px" : undefined }}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Rows */}
        <div className="divide-y divide-border">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={`row-${rowIndex}`} className="flex items-center gap-4 p-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <div
                  key={`cell-${rowIndex}-${colIndex}`}
                  className={cn(
                    "h-4 rounded animate-skeleton bg-muted",
                    colIndex === 0 ? "w-32" : "flex-1"
                  )}
                  style={{
                    animationDelay: `${(rowIndex * columns + colIndex) * 50}ms`,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
