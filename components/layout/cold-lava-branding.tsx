"use client"

import * as React from "react"
import Image from "next/image"

interface ColdLavaBrandingProps {
  collapsed?: boolean
  className?: string
}

export function ColdLavaBranding({ collapsed = false, className = "" }: ColdLavaBrandingProps) {
  if (collapsed) {
    // When collapsed, just show a minimal link - no custom icon
    return (
      <a
        href="https://coldlava.ai"
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center justify-center py-3 transition-all duration-200 hover:bg-white/[0.06] ${className}`}
        title="Powered by Cold Lava"
      >
        {/* Small version of the full logo */}
        <div className="w-10 h-6 flex items-center justify-center overflow-hidden">
          <Image
            src="/cold-lava-logo.png"
            alt="Cold Lava"
            width={40}
            height={12}
            className="object-contain opacity-50 hover:opacity-70 transition-opacity invert"
          />
        </div>
      </a>
    )
  }

  return (
    <a
      href="https://coldlava.ai"
      target="_blank"
      rel="noopener noreferrer"
      className={`block px-4 py-3.5 transition-all duration-200 hover:bg-white/[0.06] ${className}`}
    >
      <div className="flex flex-col items-center gap-2">
        {/* "Powered by" text */}
        <span className="text-[10px] font-medium tracking-[0.1em] uppercase text-slate-500">
          Powered by
        </span>

        {/* Full Cold Lava Logo - Centered */}
        <div className="relative w-full flex justify-center">
          <Image
            src="/cold-lava-logo.png"
            alt="Cold Lava"
            width={120}
            height={24}
            className="opacity-70 hover:opacity-90 transition-opacity invert"
            style={{
              height: '20px',
              width: 'auto',
              objectFit: 'contain',
            }}
          />
        </div>
      </div>
    </a>
  )
}
