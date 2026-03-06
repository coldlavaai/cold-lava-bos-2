"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDown, Filter, SortAsc } from "lucide-react"

interface Tab {
  id: string
  label: string
  count?: number
  color?: string
}

interface PageSubBarProps {
  title?: string
  tabs?: Tab[]
  activeTab?: string
  onTabChange?: (tabId: string) => void
  showFilters?: boolean
  showSort?: boolean
  sortLabel?: string
  onSortClick?: () => void
  onFilterClick?: () => void
  children?: React.ReactNode
  className?: string
}

export function PageSubBar({
  title,
  tabs,
  activeTab,
  onTabChange,
  showFilters = false,
  showSort = false,
  sortLabel = "Created Time",
  onSortClick,
  onFilterClick,
  children,
  className,
}: PageSubBarProps) {
  return (
    <div className={cn(
      "sticky top-14 z-20 bg-[#0f1117] border-b border-white/[0.06]",
      className
    )}>
      <div className="flex items-center justify-between px-4 h-11">
        {/* Left side - Title or Tabs */}
        <div className="flex items-center gap-4">
          {title && (
            <h1 className="text-sm font-medium text-white">{title}</h1>
          )}
          
          {tabs && tabs.length > 0 && (
            <div className="flex items-center gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onTabChange?.(tab.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    activeTab === tab.id
                      ? "bg-white/20 text-white"
                      : "text-white/40 hover:text-white/80 hover:bg-white/10"
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    {tab.color && (
                      <span 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: tab.color }}
                      />
                    )}
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[10px]",
                        activeTab === tab.id ? "bg-white/20" : "bg-white/10"
                      )}>
                        {tab.count}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          {children}
          
          {showSort && (
            <button
              onClick={onSortClick}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/40 hover:text-white transition-colors"
            >
              <span className="text-white/30">Sort By</span>
              <span className="text-white/70">{sortLabel}</span>
              <ChevronDown className="h-3 w-3" />
            </button>
          )}
          
          {showFilters && (
            <button
              onClick={onFilterClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Filters</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Simpler variant for pages without tabs
interface SimplePageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
}

export function SimplePageHeader({
  title,
  subtitle,
  actions,
  className,
}: SimplePageHeaderProps) {
  return (
    <div className={cn(
      "flex items-center justify-between pb-4 mb-4 border-b border-white/[0.08]",
      className
    )}>
      <div>
        <h1 className="text-xl font-semibold text-white tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-white/50 mt-0.5">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}
