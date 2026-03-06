"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Premium Icon Container with glass morphism
interface PremiumIconProps {
  children: React.ReactNode
  variant?: "solar" | "success" | "info" | "warning" | "purple" | "slate"
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
  glow?: boolean
}

const variantStyles = {
  solar: {
    bg: "bg-gradient-to-br from-cyan-400/20 via-teal-400/15 to-cyan-500/20",
    border: "border-cyan-400/30",
    shadow: "shadow-cyan-500/20",
    iconColor: "text-cyan-400",
    glow: "shadow-[0_0_30px_rgba(6,182,212,0.3)]",
  },
  success: {
    bg: "bg-gradient-to-br from-emerald-400/20 via-green-400/15 to-emerald-500/20",
    border: "border-emerald-400/30",
    shadow: "shadow-emerald-500/20",
    iconColor: "text-emerald-400",
    glow: "shadow-[0_0_30px_rgba(16,185,129,0.3)]",
  },
  info: {
    bg: "bg-gradient-to-br from-blue-400/20 via-cyan-400/15 to-blue-500/20",
    border: "border-blue-400/30",
    shadow: "shadow-blue-500/20",
    iconColor: "text-blue-400",
    glow: "shadow-[0_0_30px_rgba(59,130,246,0.3)]",
  },
  warning: {
    bg: "bg-gradient-to-br from-amber-400/20 via-yellow-400/15 to-amber-500/20",
    border: "border-amber-400/30",
    shadow: "shadow-amber-500/20",
    iconColor: "text-amber-400",
    glow: "shadow-[0_0_30px_rgba(245,158,11,0.3)]",
  },
  purple: {
    bg: "bg-gradient-to-br from-purple-400/20 via-violet-400/15 to-purple-500/20",
    border: "border-purple-400/30",
    shadow: "shadow-purple-500/20",
    iconColor: "text-purple-400",
    glow: "shadow-[0_0_30px_rgba(147,51,234,0.3)]",
  },
  slate: {
    bg: "bg-gradient-to-br from-slate-400/20 via-gray-400/15 to-slate-500/20",
    border: "border-slate-400/30",
    shadow: "shadow-slate-500/20",
    iconColor: "text-slate-400",
    glow: "shadow-[0_0_30px_rgba(100,116,139,0.3)]",
  },
}

const sizeStyles = {
  sm: "p-2 rounded-lg",
  md: "p-2.5 rounded-xl",
  lg: "p-3 rounded-xl",
  xl: "p-4 rounded-2xl",
}

const iconSizes = {
  sm: "[&>svg]:h-4 [&>svg]:w-4",
  md: "[&>svg]:h-5 [&>svg]:w-5",
  lg: "[&>svg]:h-6 [&>svg]:w-6",
  xl: "[&>svg]:h-8 [&>svg]:w-8",
}

export function PremiumIcon({
  children,
  variant = "solar",
  size = "md",
  className,
  glow = false,
}: PremiumIconProps) {
  const styles = variantStyles[variant]

  return (
    <div
      className={cn(
        // Base styles
        "relative inline-flex items-center justify-center",
        "backdrop-blur-xl border",
        "transition-all duration-300 ease-out",
        "hover:scale-105 hover:border-opacity-50",
        // Variant styles
        styles.bg,
        styles.border,
        styles.iconColor,
        // Size
        sizeStyles[size],
        iconSizes[size],
        // Glow effect
        glow && styles.glow,
        className
      )}
    >
      {/* Inner glass reflection */}
      <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
      
      {/* Icon */}
      <span className="relative z-10">
        {children}
      </span>
    </div>
  )
}

// Pre-built themed icons for common use cases
export function SolarPipelineIcon({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" | "xl" }) {
  return (
    <PremiumIcon variant="solar" size={size} className={className}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    </PremiumIcon>
  )
}

export function SolarTargetIcon({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" | "xl" }) {
  return (
    <PremiumIcon variant="warning" size={size} className={className}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    </PremiumIcon>
  )
}

export function SolarCompletedIcon({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" | "xl" }) {
  return (
    <PremiumIcon variant="success" size={size} className={className}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    </PremiumIcon>
  )
}

export function SolarMessageIcon({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" | "xl" }) {
  return (
    <PremiumIcon variant="info" size={size} className={className}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </PremiumIcon>
  )
}

export function SolarPhoneIcon({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" | "xl" }) {
  return (
    <PremiumIcon variant="purple" size={size} className={className}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    </PremiumIcon>
  )
}

export function SolarSparkleIcon({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" | "xl" }) {
  return (
    <PremiumIcon variant="solar" size={size} glow className={className}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        <path d="M5 3v4" />
        <path d="M19 17v4" />
        <path d="M3 5h4" />
        <path d="M17 19h4" />
      </svg>
    </PremiumIcon>
  )
}

export function SolarCalendarIcon({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" | "xl" }) {
  return (
    <PremiumIcon variant="info" size={size} className={className}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
        <line x1="16" x2="16" y1="2" y2="6" />
        <line x1="8" x2="8" y1="2" y2="6" />
        <line x1="3" x2="21" y1="10" y2="10" />
      </svg>
    </PremiumIcon>
  )
}

export function SolarUsersIcon({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" | "xl" }) {
  return (
    <PremiumIcon variant="slate" size={size} className={className}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    </PremiumIcon>
  )
}

export function SolarBoltIcon({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" | "xl" }) {
  return (
    <PremiumIcon variant="success" size={size} className={className}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    </PremiumIcon>
  )
}

export function SolarTrendingIcon({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" | "xl" }) {
  return (
    <PremiumIcon variant="info" size={size} className={className}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    </PremiumIcon>
  )
}
