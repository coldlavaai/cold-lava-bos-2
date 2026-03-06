import * as React from "react"
import { cn } from "@/lib/utils"

interface HighlightProps {
  text: string
  query: string
  className?: string
  highlightClassName?: string
}

/**
 * Highlight matching text within a string
 * Useful for search results
 */
export function Highlight({
  text,
  query,
  className,
  highlightClassName,
}: HighlightProps) {
  if (!query.trim()) {
    return <span className={className}>{text}</span>
  }

  const regex = new RegExp(`(${escapeRegex(query)})`, "gi")
  const parts = text.split(regex)

  return (
    <span className={className}>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className={cn(
              "bg-yellow-200 dark:bg-yellow-900 text-inherit rounded-sm px-0.5",
              highlightClassName
            )}
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  )
}

function escapeRegex(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
