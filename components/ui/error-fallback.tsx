"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface ErrorFallbackProps {
  error?: Error | null
  message?: string
  description?: string
  onRetry?: () => void
  className?: string
  compact?: boolean
}

export function ErrorFallback({
  error,
  message = "Something went wrong",
  description = "We couldn't load this content. Please try again.",
  onRetry,
  className,
  compact = false,
}: ErrorFallbackProps) {
  if (compact) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <div className="text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive/50" />
          <p className="text-sm text-muted-foreground mb-3">{message}</p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <CardTitle className="text-lg">{message}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {(onRetry || error) && (
        <CardContent className="space-y-3">
          {process.env.NODE_ENV === "development" && error && (
            <div className="p-2 rounded bg-muted text-xs font-mono overflow-auto max-h-20">
              {error.message}
            </div>
          )}
          {onRetry && (
            <Button onClick={onRetry} className="w-full gap-2">
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  )
}
