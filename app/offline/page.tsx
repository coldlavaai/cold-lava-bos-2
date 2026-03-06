"use client"

import { WifiOff, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
          <WifiOff className="h-10 w-10 text-muted-foreground" />
        </div>
        
        <h1 className="text-2xl font-bold mb-2">You're Offline</h1>
        
        <p className="text-muted-foreground mb-6">
          It looks like you've lost your internet connection. Some features may be unavailable until you're back online.
        </p>

        <div className="space-y-3">
          <Button onClick={handleRetry} className="w-full gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          
          <p className="text-xs text-muted-foreground">
            Don't worry — any changes you've made will sync automatically when you're back online.
          </p>
        </div>

        <div className="mt-8 p-4 bg-muted/30 rounded-lg">
          <h2 className="font-medium text-sm mb-2">Available Offline:</h2>
          <ul className="text-sm text-muted-foreground space-y-1 text-left">
            <li>• View cached customer data</li>
            <li>• View cached job information</li>
            <li>• View your calendar</li>
            <li>• Draft new messages (will send when online)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
