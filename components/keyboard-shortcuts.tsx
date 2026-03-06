"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

interface Shortcut {
  keys: string[]
  description: string
  action?: () => void
  href?: string
}

interface ShortcutGroup {
  name: string
  shortcuts: Shortcut[]
}

export function KeyboardShortcuts() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)

  const shortcutGroups: ShortcutGroup[] = React.useMemo(() => [
    {
      name: "Navigation",
      shortcuts: [
        { keys: ["g", "d"], description: "Go to Dashboard", href: "/" },
        { keys: ["g", "j"], description: "Go to Jobs", href: "/jobs" },
        { keys: ["g", "c"], description: "Go to Customers", href: "/customers" },
        { keys: ["g", "a"], description: "Go to Calendar", href: "/calendar" },
        { keys: ["g", "m"], description: "Go to Communications", href: "/communications" },
        { keys: ["g", "s"], description: "Go to Settings", href: "/settings" },
      ],
    },
    {
      name: "Actions",
      shortcuts: [
        { keys: ["n", "j"], description: "New Job", action: () => {
          // Trigger new job dialog - could use global state
          window.dispatchEvent(new CustomEvent("keyboard:new-job"))
        }},
        { keys: ["n", "c"], description: "New Customer", action: () => {
          window.dispatchEvent(new CustomEvent("keyboard:new-customer"))
        }},
        { keys: ["n", "a"], description: "New Appointment", action: () => {
          window.dispatchEvent(new CustomEvent("keyboard:new-appointment"))
        }},
      ],
    },
    {
      name: "General",
      shortcuts: [
        { keys: ["?"], description: "Show keyboard shortcuts", action: () => setOpen(true) },
        { keys: ["/"], description: "Focus search", action: () => {
          document.querySelector<HTMLInputElement>('[data-search-input]')?.focus()
        }},
        { keys: ["Escape"], description: "Close dialog / Cancel", action: () => setOpen(false) },
      ],
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [])

  // Track key sequence for multi-key shortcuts
  const keySequence = React.useRef<string[]>([])
  const keyTimeout = React.useRef<NodeJS.Timeout | null>(null)

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      const target = e.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return
      }

      // Clear sequence timeout
      if (keyTimeout.current) {
        clearTimeout(keyTimeout.current)
      }

      // Add key to sequence
      keySequence.current.push(e.key.toLowerCase())

      // Check for matching shortcuts
      for (const group of shortcutGroups) {
        for (const shortcut of group.shortcuts) {
          const keysMatch = shortcut.keys.every(
            (key, i) => keySequence.current[i]?.toLowerCase() === key.toLowerCase()
          )

          if (keysMatch && shortcut.keys.length === keySequence.current.length) {
            e.preventDefault()
            if (shortcut.action) {
              shortcut.action()
            } else if (shortcut.href) {
              router.push(shortcut.href)
            }
            keySequence.current = []
            return
          }
        }
      }

      // Reset sequence after 1 second
      keyTimeout.current = setTimeout(() => {
        keySequence.current = []
      }, 1000)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [router, shortcutGroups])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Navigate faster with keyboard shortcuts
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {shortcutGroups.map((group) => (
            <div key={group.name}>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                {group.name}
              </h4>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, j) => (
                        <React.Fragment key={j}>
                          <Badge variant="outline" className="font-mono text-xs px-2">
                            {key}
                          </Badge>
                          {j < shortcut.keys.length - 1 && (
                            <span className="text-muted-foreground text-xs">then</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
