"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  GitBranch,
  BarChart3,
  Calendar,
  CheckSquare,
  MessageSquare,
  Phone,
  Users,
  Building2,
  Star,
  ScrollText,
  DollarSign,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Pipeline", icon: GitBranch },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/communications", label: "Comms", icon: MessageSquare },
  { href: "/dbr", label: "DBR", icon: Phone },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/installations", label: "Clients", icon: Building2 },
  { href: "/reviews", label: "Reviews", icon: Star },
  { href: "/scripts", label: "Scripts", icon: ScrollText },
]

const bottomNavItems: NavItem[] = [
  { href: "/accounting", label: "Accounting", icon: DollarSign },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleMouseEnter = React.useCallback((href: string) => {
    router.prefetch(href)
  }, [router])

  return (
    <aside
      className={cn(
        "fixed left-0 top-14 z-30 h-[calc(100vh-3.5rem)] transition-all duration-300 flex flex-col",
        "hidden md:flex",
        // Match deck: rgba(3,3,5,0.95), border-right: 1px solid rgba(6,182,212,0.1)
        "bg-[rgba(3,3,5,0.95)] backdrop-blur-[20px]",
        "border-r border-cyan-500/10",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Brand header — "COLD LAVA / 2026" monospace style */}
      {!collapsed && (
        <div className="px-6 pt-5 pb-4 border-b border-white/[0.05]">
          <div className="font-mono text-[0.8rem] uppercase tracking-[0.2em] text-cyan-400/50">
            Cold Lava / 2026
          </div>
          <div className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-white/20 mt-1.5">
            Business OS
          </div>
        </div>
      )}
      {collapsed && (
        <div className="flex items-center justify-center pt-4 pb-3 border-b border-white/[0.05]">
          <span className="font-mono text-[0.65rem] font-bold text-cyan-400/50 tracking-wider">CL</span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin pt-3">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch={false}
                  onMouseEnter={() => handleMouseEnter(item.href)}
                  className={cn(
                    // Base: monospace, no rounding, left border indicator
                    "flex items-center gap-3 px-6 py-2 text-[0.8rem] font-mono tracking-[0.05em]",
                    "transition-all duration-300 border-l-2",
                    isActive
                      ? "text-cyan-400 border-l-cyan-400 bg-cyan-400/[0.05]"
                      : "text-white/50 border-l-transparent hover:text-white/60 hover:bg-cyan-400/[0.03]",
                    collapsed && "justify-center px-0"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-all duration-300",
                    isActive ? "text-cyan-400 opacity-100" : "opacity-[0.45] group-hover:opacity-60"
                  )} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Divider */}
        <div className="my-3 mx-6 h-px bg-white/[0.05]" />

        {/* Bottom items */}
        <ul className="space-y-0.5">
          {bottomNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch={false}
                  onMouseEnter={() => handleMouseEnter(item.href)}
                  className={cn(
                    "flex items-center gap-3 px-6 py-2 text-[0.8rem] font-mono tracking-[0.05em]",
                    "transition-all duration-300 border-l-2",
                    isActive
                      ? "text-cyan-400 border-l-cyan-400 bg-cyan-400/[0.05]"
                      : "text-white/50 border-l-transparent hover:text-white/60 hover:bg-cyan-400/[0.03]",
                    collapsed && "justify-center px-0"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-all duration-300",
                    isActive ? "text-cyan-400 opacity-100" : "opacity-[0.45]"
                  )} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer — deck style */}
      <div className="border-t border-white/[0.05] px-6 py-3">
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.1em] text-white/[0.15]">
          {collapsed ? "CL" : "Cold Lava × BOS"}
        </span>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="h-10 flex items-center justify-center border-t border-white/[0.05] hover:bg-cyan-400/[0.03] transition-colors"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4 text-white/30" />
        ) : (
          <ChevronLeft className="h-4 w-4 text-white/30" />
        )}
      </button>
    </aside>
  )
}
