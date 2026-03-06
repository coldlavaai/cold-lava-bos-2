/**
 * Session 102: Customer Portal - Layout
 * Public layout for customer portal (no authentication required, session-based access)
 */

import * as React from "react"
import { redirect as _redirect } from "next/navigation"
import { getPortalSession } from "@/lib/portal/session"
import { Building2, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Validate session on every portal page load
  const sessionData = await getPortalSession()

  // If no valid session, redirect to invalid link page
  // Exception: Allow access to /portal/invalid-link and /portal/expired-link without session
  const _currentPath = "unknown" // We'll handle this via middleware instead

  return (
    <div className="min-h-screen bg-background">
      {/* Portal Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Customer Portal</h1>
              {sessionData && (
                <p className="text-sm text-muted-foreground">
                  {sessionData.customer.first_name} {sessionData.customer.last_name}
                </p>
              )}
            </div>
          </div>

          {sessionData && (
            <form action="/api/portal/logout" method="POST">
              <Button variant="ghost" size="sm" type="submit">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </form>
          )}
        </div>
      </header>

      {/* Portal Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Portal Footer */}
      <footer className="border-t border-border mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 Cold Lava BOS. Secure customer portal.</p>
        </div>
      </footer>
    </div>
  )
}
