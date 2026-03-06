"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "./sidebar"
import { Topbar } from "./topbar"
import { MobileNav } from "./mobile-nav"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { QuickAddTask } from "@/components/tasks/quick-add-task"
import { cn } from "@/lib/utils"

interface AppLayoutProps {
  children: React.ReactNode
}

// Memoized components to prevent re-renders during navigation
const MemoizedSidebar = React.memo(Sidebar)
const MemoizedTopbar = React.memo(Topbar)
const MemoizedMobileNav = React.memo(MobileNav)

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)
  const [isTransitioning, setIsTransitioning] = React.useState(false)
  const prevPathRef = React.useRef(pathname)

  // Smooth page transitions - only trigger on actual page changes
  React.useEffect(() => {
    if (prevPathRef.current !== pathname) {
      setIsTransitioning(true)
      const timeout = setTimeout(() => setIsTransitioning(false), 120)
      prevPathRef.current = pathname
      return () => clearTimeout(timeout)
    }
  }, [pathname])

  // Memoize toggle function to prevent sidebar re-renders
  const handleSidebarToggle = React.useCallback(() => {
    setSidebarCollapsed(prev => !prev)
  }, [])

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0a0a0f]">
        {/* Navigation stays mounted and stable */}
        <MemoizedTopbar sidebarCollapsed={sidebarCollapsed} />
        <MemoizedSidebar
          collapsed={sidebarCollapsed}
          onToggle={handleSidebarToggle}
        />
        
        {/* Only content transitions */}
        <main
          className={cn(
            "pt-14 pb-[4.5rem] md:pb-6 transition-all duration-200 min-h-[100dvh]",
            sidebarCollapsed ? "md:ml-16" : "md:ml-64"
          )}
        >
          <div 
            className={cn(
              "p-3 md:p-6 transition-opacity duration-120 ease-out",
              isTransitioning ? "opacity-0 scale-[0.99]" : "opacity-100 scale-100"
            )}
            style={{ transformOrigin: 'top center' }}
          >
            {children}
          </div>
        </main>
        
        <MemoizedMobileNav />
        
        {/* Floating Add Task Button */}
        <QuickAddTask />
      </div>
    </ProtectedRoute>
  )
}
