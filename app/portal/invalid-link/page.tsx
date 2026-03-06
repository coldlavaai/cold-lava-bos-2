/**
 * Session 102: Customer Portal - Invalid Link Page
 * Shown when magic link token is invalid or already used
 */

// Force dynamic rendering - portal pages use cookies for session validation
export const dynamic = 'force-dynamic'

import * as React from "react"
import { AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default function InvalidLinkPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-destructive" />
          <h1 className="text-2xl font-semibold mb-2">Invalid Link</h1>
          <p className="text-muted-foreground mb-6">
            This portal access link is invalid or has already been used.
            Each magic link can only be used once.
          </p>
          <p className="text-sm text-muted-foreground">
            Please contact your service provider to request a new access link.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
