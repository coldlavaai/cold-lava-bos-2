"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { 
  Home, 
  Briefcase, 
  Calendar, 
  Users, 
  Plus,
  MoreHorizontal,
  Wrench,
  Package,
  MessageSquare,
  ClipboardCheck,
  Settings,
  BarChart3,
  X,
  CheckSquare,
  Building2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const primaryNavItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/jobs", label: "Pipeline", icon: Briefcase },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/customers", label: "Customers", icon: Users },
]

const moreNavItems = [
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/communications", label: "Messages", icon: MessageSquare },
  { href: "/installations", label: "Clients", icon: Building2 },
  // { href: "/equipment", label: "Equipment", icon: Package }, // Removed from sidebar
  { href: "/settings", label: "Settings", icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [showMore, setShowMore] = React.useState(false)
  const [showQuickAdd, setShowQuickAdd] = React.useState(false)

  // Check if current page is in "more" menu
  const isMoreActive = moreNavItems.some(item => pathname.startsWith(item.href))

  // Close menus when navigating
  React.useEffect(() => {
    setShowMore(false)
    setShowQuickAdd(false)
  }, [pathname])

  // Prevent body scroll when menu is open
  React.useEffect(() => {
    if (showMore || showQuickAdd) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [showMore, showQuickAdd])

  return (
    <>
      {/* Backdrop for menus - premium blur */}
      {(showMore || showQuickAdd) && (
        <div 
          className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-in fade-in duration-200"
          onClick={() => {
            setShowMore(false)
            setShowQuickAdd(false)
          }}
        />
      )}

      {/* More Menu Sheet - Premium Dark Glass */}
      {showMore && (
        <div className="md:hidden fixed bottom-[4.5rem] left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border-t border-white/[0.08] rounded-t-3xl animate-slide-up shadow-2xl">
          {/* iOS drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>
          <div className="p-4 pt-2 max-h-[60vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg text-white">More</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-white/[0.06]"
                onClick={() => setShowMore(false)}
              >
                <X className="h-4 w-4 text-white/50" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {moreNavItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all active:scale-95",
                      isActive
                        ? "bg-gradient-to-br from-primary to-primary/90 text-white shadow-lg shadow-primary/25"
                        : "bg-white/[0.06] hover:bg-white/[0.10] text-white/70"
                    )}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Menu Sheet - Premium Dark Glass */}
      {showQuickAdd && (
        <div className="md:hidden fixed bottom-[4.5rem] left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border-t border-white/[0.08] rounded-t-3xl animate-slide-up shadow-2xl">
          {/* iOS drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>
          <div className="p-4 pt-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg text-white">Quick Add</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-white/[0.06]"
                onClick={() => setShowQuickAdd(false)}
              >
                <X className="h-4 w-4 text-white/50" />
              </Button>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setShowQuickAdd(false)
                  router.push('/jobs?new=true')
                }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all active:scale-[0.98] group"
              >
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:from-primary/30 group-hover:to-primary/20 transition-colors">
                  <Briefcase className="h-6 w-6 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-white">New Job</p>
                  <p className="text-xs text-white/50">Create a new job</p>
                </div>
              </button>
              <button
                onClick={() => {
                  setShowQuickAdd(false)
                  router.push('/customers?new=true')
                }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all active:scale-[0.98] group"
              >
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 flex items-center justify-center group-hover:from-emerald-500/30 group-hover:to-emerald-500/20 transition-colors">
                  <Users className="h-6 w-6 text-emerald-400" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-white">New Customer</p>
                  <p className="text-xs text-white/50">Add a new customer record</p>
                </div>
              </button>
              <button
                onClick={() => {
                  setShowQuickAdd(false)
                  router.push('/calendar?new=true')
                }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all active:scale-[0.98] group"
              >
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/10 flex items-center justify-center group-hover:from-cyan-500/30 group-hover:to-cyan-500/20 transition-colors">
                  <Calendar className="h-6 w-6 text-cyan-400" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-white">New Appointment</p>
                  <p className="text-xs text-white/50">Schedule a site visit or appointment</p>
                </div>
              </button>
              <button
                onClick={() => {
                  setShowQuickAdd(false)
                  // Dispatch event for QuickAddTask to open
                  window.dispatchEvent(new CustomEvent('openQuickAddTask'))
                }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all active:scale-[0.98] group"
              >
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center group-hover:from-blue-500/30 group-hover:to-blue-500/20 transition-colors">
                  <CheckSquare className="h-6 w-6 text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-white">New Task</p>
                  <p className="text-xs text-white/50">Create a task, call, or to-do</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar - Premium Dark Glass */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-xl border-t border-white/[0.08] safe-area-bottom shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.3)]">
        <div className="flex items-center h-[4.5rem] px-1">
          {primaryNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 h-full py-2 transition-all active:scale-95",
                  "min-w-[64px] touch-manipulation",
                  isActive ? "text-primary" : "text-slate-400"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-9 h-9 rounded-xl transition-all",
                  isActive && "bg-primary/10 shadow-sm"
                )}>
                  <Icon className={cn("h-5 w-5 transition-all", isActive && "stroke-[2.5] scale-110")} />
                </div>
                <span className={cn(
                  "text-[10px] font-medium transition-colors",
                  isActive ? "text-primary font-semibold" : "text-white/50"
                )}>{item.label}</span>
              </Link>
            )
          })}

          {/* Center FAB for Quick Add - Premium gradient */}
          <div className="flex flex-col items-center justify-center flex-1 h-full">
            <Button 
              size="icon" 
              className={cn(
                "rounded-full h-14 w-14 shadow-xl transition-all duration-300 active:scale-95",
                showQuickAdd 
                  ? "rotate-45 bg-slate-800 hover:bg-slate-700 shadow-slate-400/30" 
                  : "bg-gradient-to-br from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-primary/30"
              )}
              onClick={() => {
                setShowQuickAdd(!showQuickAdd)
                setShowMore(false)
              }}
            >
              <Plus className="h-7 w-7" />
            </Button>
          </div>

          {/* More button */}
          <button
            onClick={() => {
              setShowMore(!showMore)
              setShowQuickAdd(false)
            }}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 h-full py-2 transition-all active:scale-95",
              "min-w-[64px] touch-manipulation",
              (showMore || isMoreActive) ? "text-primary" : "text-slate-400"
            )}
          >
            <div className={cn(
              "flex items-center justify-center w-9 h-9 rounded-xl transition-all",
              (showMore || isMoreActive) && "bg-primary/10 shadow-sm"
            )}>
              <MoreHorizontal className={cn("h-5 w-5 transition-all", (showMore || isMoreActive) && "stroke-[2.5] scale-110")} />
            </div>
            <span className={cn(
              "text-[10px] font-medium transition-colors",
              (showMore || isMoreActive) ? "text-primary font-semibold" : "text-white/50"
            )}>More</span>
          </button>
        </div>
      </nav>
    </>
  )
}
