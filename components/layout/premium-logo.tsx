"use client"

import * as React from "react"

interface PremiumLogoProps {
  collapsed?: boolean
  className?: string
}

export function PremiumLogo({ collapsed = false, className = "" }: PremiumLogoProps) {
  if (collapsed) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="cl-icon-collapsed"
        >
          <defs>
            <linearGradient id="lavaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#0891b2" />
              <stop offset="100%" stopColor="#0e7490" />
            </linearGradient>
          </defs>
          {/* Geometric lava/mountain shape */}
          <circle cx="16" cy="16" r="10" fill="url(#lavaGradient)" opacity="0.15" />
          <circle cx="16" cy="16" r="7" fill="url(#lavaGradient)" />
          {/* CL monogram */}
          <text x="16" y="20" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="sans-serif">CL</text>
        </svg>
        <style jsx>{`
          .cl-icon-collapsed {
            filter: drop-shadow(0 2px 8px rgba(6, 182, 212, 0.3));
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Icon */}
      <svg
        width="36"
        height="36"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="cl-icon"
      >
        <defs>
          <linearGradient id="lavaGradientFull" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="50%" stopColor="#0891b2" />
            <stop offset="100%" stopColor="#0e7490" />
          </linearGradient>
          <linearGradient id="lavaAccentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>
        </defs>
        {/* Outer glow */}
        <circle cx="18" cy="18" r="14" fill="url(#lavaGradientFull)" opacity="0.12" />
        {/* Core circle */}
        <circle cx="18" cy="18" r="10" fill="url(#lavaGradientFull)" />
        {/* CL monogram */}
        <text x="18" y="22" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" fontFamily="sans-serif">CL</text>
      </svg>

      {/* Text branding with premium typography */}
      <div className="flex flex-col leading-none">
        <span className="logo-text text-2xl font-bold tracking-tight">
          Cold<span className="text-accent">Lava</span>
        </span>
        <span className="logo-tagline text-[10px] font-medium tracking-wider uppercase opacity-70">
          Business Operating System
        </span>
      </div>

      <style jsx>{`
        .cl-icon {
          filter: drop-shadow(0 2px 12px rgba(6, 182, 212, 0.4));
        }
        .logo-text {
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f8fafc 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-size: 200% 100%;
          animation: shimmer 3s ease-in-out infinite;
        }
        .logo-text .text-accent {
          background: linear-gradient(135deg, #06b6d4 0%, #14b8a6 50%, #0d9488 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .logo-tagline {
          color: #94a3b8;
          letter-spacing: 0.1em;
        }
        @keyframes shimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  )
}
