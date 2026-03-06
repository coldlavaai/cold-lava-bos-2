"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, User, Settings, LogOut, ChevronDown } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/lib/auth/auth-provider"
import { cn } from "@/lib/utils"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { GlobalSearch } from "@/components/global-search"

interface TopbarProps {
  sidebarCollapsed: boolean
}

export function Topbar({ sidebarCollapsed }: TopbarProps) {
  const router = useRouter()
  const { user, role, signOut } = useAuth()
  const [showUserMenu, setShowUserMenu] = React.useState(false)
  // Ref for click outside detection
  const userMenuRef = React.useRef<HTMLDivElement>(null)

  const getUserInitials = () => {
    if (!user?.full_name) return user?.email?.substring(0, 2).toUpperCase() || "U"
    return user.full_name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const getDisplayName = () => {
    if (user?.full_name) return user.full_name
    return user?.email?.split("@")[0] || "User"
  }

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is outside user menu dropdown
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14">
      {/* Main topbar — ultra-dark, matching deck aesthetic */}
      <div className="h-full bg-[rgba(3,3,5,0.95)] backdrop-blur-[20px] border-b border-cyan-500/10 flex items-center">
        {/* Logo section - Fixed width matching sidebar on desktop, compact on mobile */}
        <Link 
          href="/"
          className={cn(
            "h-full flex items-center border-r border-cyan-500/10 hover:bg-cyan-400/[0.03] transition-colors shrink-0",
            "px-3 md:px-6",
            "md:w-auto",
            sidebarCollapsed ? "md:w-16 md:justify-center md:px-0" : "md:w-60"
          )}
        >
          {/* Mobile: always show compact logo */}
          <div className="flex items-baseline gap-2 md:hidden">
            <span className="font-mono text-[0.85rem] font-bold tracking-tight text-white/90">
              COLD<span className="text-cyan-400">LAVA</span>
            </span>
          </div>
          {/* Desktop: responsive to sidebar state */}
          <div className="hidden md:flex items-baseline gap-2">
            {sidebarCollapsed ? (
              <span className="font-mono text-[0.75rem] font-bold text-cyan-400/60 tracking-wider">CL</span>
            ) : (
              <>
                <span className="font-mono text-[0.85rem] font-bold tracking-tight text-white/90">
                  COLD<span className="text-cyan-400">LAVA</span>
                </span>
                <span className="font-mono text-[0.6rem] text-white/20 tracking-[0.15em] uppercase">BOS</span>
              </>
            )}
          </div>
        </Link>

        {/* Center section - Search (takes remaining space) */}
        <div className="flex-1 flex items-center px-4">
          <div className="w-full max-w-xl">
            <GlobalSearch />
          </div>
        </div>

        {/* Right section - Actions */}
        <div className="flex items-center gap-2 px-4">
          {/* Notifications - Using real API data */}
          <div className="text-white/50 hover:text-white">
            <NotificationBell />
          </div>

          {/* User menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-cyan-400/[0.03] transition-all duration-300"
            >
              <Avatar className="h-7 w-7 ring-1 ring-cyan-400/20">
                <AvatarFallback className="bg-cyan-400/10 text-cyan-400/80 text-[0.65rem] font-mono font-bold">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <span className="text-[0.8rem] font-mono text-white/60 hidden md:inline max-w-[100px] truncate">
                {getDisplayName()}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-white/30 hidden md:block" />
            </button>

            {/* User dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-[rgba(3,3,5,0.95)] backdrop-blur-[20px] rounded-lg shadow-2xl shadow-black/60 border border-cyan-500/10 overflow-hidden z-50">
                <div className="p-4 border-b border-white/[0.05]">
                  <p className="font-mono text-[0.8rem] font-medium text-white/90">{getDisplayName()}</p>
                  <p className="font-mono text-[0.7rem] text-white/30 mt-0.5 truncate">{user?.email}</p>
                  <span className="inline-flex mt-2 px-2 py-0.5 rounded text-[0.65rem] font-mono font-medium tracking-wider uppercase bg-cyan-400/[0.08] text-cyan-400/70 border border-cyan-400/10">
                    {role || "User"}
                  </span>
                </div>
                <div className="p-1.5">
                  <button
                    className="w-full flex items-center gap-3 px-3 py-2 text-[0.8rem] font-mono text-white/60 hover:text-white/80 hover:bg-cyan-400/[0.03] rounded transition-all"
                    onClick={() => {
                      setShowUserMenu(false)
                      router.push("/settings/profile")
                    }}
                  >
                    <User className="h-4 w-4 opacity-50" />
                    <span>Profile</span>
                  </button>
                  <button
                    className="w-full flex items-center gap-3 px-3 py-2 text-[0.8rem] font-mono text-white/60 hover:text-white/80 hover:bg-cyan-400/[0.03] rounded transition-all"
                    onClick={() => {
                      setShowUserMenu(false)
                      router.push("/settings")
                    }}
                  >
                    <Settings className="h-4 w-4 opacity-50" />
                    <span>Settings</span>
                  </button>
                  <div className="my-1.5 h-px bg-white/[0.05]" />
                  <button
                    onClick={() => signOut()}
                    className="w-full flex items-center gap-3 px-3 py-2 text-[0.8rem] font-mono text-red-400/70 hover:text-red-400 hover:bg-red-500/[0.05] rounded transition-all"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
