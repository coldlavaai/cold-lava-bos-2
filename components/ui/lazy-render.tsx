"use client"

import * as React from "react"

interface LazyRenderProps {
  children: React.ReactNode
  /** Height to reserve before content is rendered */
  minHeight?: number | string
  /** Root margin for intersection observer */
  rootMargin?: string
  /** Whether to render immediately (for first N items) */
  immediate?: boolean
  /** Placeholder to show while not rendered */
  placeholder?: React.ReactNode
  className?: string
}

/**
 * Lazy renders children when they enter the viewport.
 * Useful for long lists where items below the fold don't need to render immediately.
 */
export function LazyRender({
  children,
  minHeight = 80,
  rootMargin = "200px", // Start rendering 200px before entering viewport
  immediate = false,
  placeholder,
  className,
}: LazyRenderProps) {
  const [isVisible, setIsVisible] = React.useState(immediate)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (immediate || isVisible) return

    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [immediate, isVisible, rootMargin])

  if (isVisible) {
    return <>{children}</>
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{ minHeight }}
    >
      {placeholder}
    </div>
  )
}
