"use client"

import { cn } from "@/lib/utils"

/**
 * Global loading state - shows while pages are loading
 * This keeps the chrome (sidebar/topbar) visible during transitions
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100/50">
      {/* Skeleton for topbar area */}
      <div className="fixed top-0 left-0 right-0 z-40 h-14 bg-slate-900" />
      
      {/* Skeleton for sidebar */}
      <div className="fixed left-0 top-14 z-30 h-[calc(100vh-3.5rem)] w-64 bg-slate-950 hidden md:block" />
      
      {/* Main content skeleton */}
      <main className="pt-14 md:ml-64 min-h-[100dvh]">
        <div className="p-3 md:p-6">
          {/* Page content skeleton */}
          <div className="space-y-4 animate-pulse">
            {/* Header skeleton */}
            <div className="h-8 bg-slate-200 rounded-lg w-48" />
            
            {/* Cards skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-slate-200 rounded-xl" />
              ))}
            </div>
            
            {/* Content skeleton */}
            <div className="h-64 bg-slate-200 rounded-xl" />
          </div>
        </div>
      </main>
    </div>
  )
}
