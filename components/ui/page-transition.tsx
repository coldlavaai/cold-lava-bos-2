"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

/**
 * Page transition wrapper with fade animation
 * Session 109: Apple-grade UI polish
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isTransitioning, setIsTransitioning] = React.useState(false)
  const [displayChildren, setDisplayChildren] = React.useState(children)

  React.useEffect(() => {
    setIsTransitioning(true)
    const timeout = setTimeout(() => {
      setDisplayChildren(children)
      setIsTransitioning(false)
    }, 150)
    return () => clearTimeout(timeout)
  }, [pathname, children])

  return (
    <div
      className={cn(
        "transition-all duration-150 ease-out",
        isTransitioning ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0"
      )}
    >
      {displayChildren}
    </div>
  )
}
