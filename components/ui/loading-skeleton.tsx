import * as React from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface LoadingSkeletonProps {
  variant?: "card" | "table" | "list" | "text"
  count?: number
  className?: string
}

export function LoadingSkeleton({
  variant = "card",
  count = 1,
  className,
}: LoadingSkeletonProps) {
  if (variant === "card") {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} className={cn("animate-skeleton", className)}>
            <CardHeader>
              <div className="h-4 w-32 bg-muted rounded animate-skeleton mb-2"></div>
              <div className="h-3 w-48 bg-muted rounded animate-skeleton"></div>
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-muted rounded animate-skeleton"></div>
            </CardContent>
          </Card>
        ))}
      </>
    )
  }

  if (variant === "table") {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
            <div className="h-10 w-10 bg-muted rounded-full animate-skeleton"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 bg-muted rounded animate-skeleton"></div>
              <div className="h-3 w-1/2 bg-muted rounded animate-skeleton"></div>
            </div>
            <div className="h-8 w-20 bg-muted rounded animate-skeleton"></div>
          </div>
        ))}
      </div>
    )
  }

  if (variant === "list") {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
            <div className="h-10 w-10 bg-muted rounded animate-skeleton mt-1"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 bg-muted rounded animate-skeleton"></div>
              <div className="h-3 w-full bg-muted rounded animate-skeleton"></div>
              <div className="h-3 w-1/3 bg-muted rounded animate-skeleton"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // variant === "text"
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-full bg-muted rounded animate-skeleton"></div>
          <div className="h-4 w-5/6 bg-muted rounded animate-skeleton"></div>
        </div>
      ))}
    </div>
  )
}
