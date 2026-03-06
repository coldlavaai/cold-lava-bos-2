/**
 * Session 102: Customer Portal - Expired Link Page
 * Shown when magic link token has expired (default: 1 hour)
 */

// Force dynamic rendering - portal pages use cookies for session validation
export const dynamic = 'force-dynamic'

import * as React from "react"
import { Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default function ExpiredLinkPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center">
          <Clock className="h-16 w-16 mx-auto mb-4 text-warning" />
          <h1 className="text-2xl font-semibold mb-2">Link Expired</h1>
          <p className="text-muted-foreground mb-6">
            This portal access link has expired. For security, magic links
            are only valid for 1 hour.
          </p>
          <p className="text-sm text-muted-foreground">
            Please contact your service provider to request a new access link.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
