"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { MobileNav } from "@/components/layout/mobile-nav"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { CallProvider } from "@/lib/contexts/call-context"
import { CallGlobalOverlay } from "@/components/calls/call-global-overlay"
import { IncomingCallOverlay } from "@/components/communications/incoming-call-overlay"
import { QuickAddTask } from "@/components/tasks/quick-add-task"
import { cn } from "@/lib/utils"

/**
 * Dashboard Layout - Shared layout for all dashboard pages
 * The sidebar and topbar stay mounted, only children swap
 * This creates an app-like feel instead of full page reloads
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)
  const [isTransitioning, setIsTransitioning] = React.useState(false)

  // Smooth content transitions
  React.useEffect(() => {
    setIsTransitioning(true)
    const timeout = setTimeout(() => setIsTransitioning(false), 150)
    return () => clearTimeout(timeout)
  }, [pathname])

  return (
    <ProtectedRoute>
      <CallProvider>
        <div className="min-h-screen bg-[#030305]">
          {/* These stay mounted across page navigations */}
          <Topbar sidebarCollapsed={sidebarCollapsed} />
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />

          {/* Only this content area changes */}
          <main
            className={cn(
              "pt-14 pb-[4.5rem] md:pb-6 transition-all duration-300 min-h-[100dvh]",
              sidebarCollapsed ? "md:ml-16" : "md:ml-60"
            )}
          >
            <div
              className={cn(
                "p-3 md:p-6 transition-opacity duration-150 ease-out",
                isTransitioning ? "opacity-0" : "opacity-100"
              )}
            >
              {children}
            </div>
          </main>

          <MobileNav />
          {/* Prominent incoming call + active call overlay — shows on ALL pages */}
          <IncomingCallOverlay />
          {/* Legacy global overlay kept as fallback for ringing-out state */}
          <CallGlobalOverlay />
          {/* Global quick-add task button — visible on all pages */}
          <QuickAddTask />
        </div>
      </CallProvider>
    </ProtectedRoute>
  )
}
