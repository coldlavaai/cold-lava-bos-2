"use client"

import * as React from "react"
import { X, Plus, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUpdateJob } from "@/lib/api/hooks"
import { toast } from "sonner"

const PRESET_TAGS = [
  "Called x1",
  "Called x2",
  "Left voicemail",
  "Follow up",
  "Interested",
  "Not interested",
  "Demo sent",
  "No answer",
] as const

// Tag colour palette — deterministic by tag string
const TAG_COLOURS: Record<string, { bg: string; text: string; border: string }> = {
  "Called x1":      { bg: "bg-yellow-500/15",  text: "text-yellow-300",  border: "border-yellow-500/25" },
  "Called x2":      { bg: "bg-orange-500/15",  text: "text-orange-300",  border: "border-orange-500/25" },
  "Left voicemail": { bg: "bg-purple-500/15",  text: "text-purple-300",  border: "border-purple-500/25" },
  "Follow up":      { bg: "bg-blue-500/15",    text: "text-blue-300",    border: "border-blue-500/25" },
  "Interested":     { bg: "bg-emerald-500/15", text: "text-emerald-300", border: "border-emerald-500/25" },
  "Not interested": { bg: "bg-red-500/15",     text: "text-red-300",     border: "border-red-500/25" },
  "Demo sent":      { bg: "bg-cyan-500/15",    text: "text-cyan-300",    border: "border-cyan-500/25" },
  "No answer":      { bg: "bg-gray-500/15",    text: "text-gray-300",    border: "border-gray-500/25" },
  // System tags
  "HOT":                { bg: "bg-red-600/20",    text: "text-red-300",    border: "border-red-600/30" },
  "CALLBACK_REQUIRED":  { bg: "bg-amber-600/20",  text: "text-amber-300",  border: "border-amber-600/30" },
}

// Hash-based fallback colour
function hashColour(tag: string): { bg: string; text: string; border: string } {
  const colours = [
    { bg: "bg-pink-500/15",    text: "text-pink-300",    border: "border-pink-500/25" },
    { bg: "bg-indigo-500/15",  text: "text-indigo-300",  border: "border-indigo-500/25" },
    { bg: "bg-teal-500/15",    text: "text-teal-300",    border: "border-teal-500/25" },
    { bg: "bg-lime-500/15",    text: "text-lime-300",    border: "border-lime-500/25" },
    { bg: "bg-fuchsia-500/15", text: "text-fuchsia-300", border: "border-fuchsia-500/25" },
    { bg: "bg-sky-500/15",     text: "text-sky-300",     border: "border-sky-500/25" },
    { bg: "bg-rose-500/15",    text: "text-rose-300",    border: "border-rose-500/25" },
    { bg: "bg-violet-500/15",  text: "text-violet-300",  border: "border-violet-500/25" },
  ]
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = ((hash << 5) - hash + tag.charCodeAt(i)) | 0
  return colours[Math.abs(hash) % colours.length]
}

export function getTagColour(tag: string) {
  return TAG_COLOURS[tag] || hashColour(tag)
}

// ── Read-only tag pills for pipeline cards ──────────────────────────
interface TagPillsProps {
  tags: string[] | null
  maxVisible?: number
  size?: "xs" | "sm"
}

export function TagPills({ tags, maxVisible = 3, size = "xs" }: TagPillsProps) {
  if (!tags || tags.length === 0) return null

  // Filter out system tags that are already shown as emoji badges
  const displayTags = tags.filter(t => t !== "HOT" && t !== "CALLBACK_REQUIRED")
  if (displayTags.length === 0) return null

  const visible = displayTags.slice(0, maxVisible)
  const overflow = displayTags.length - maxVisible

  return (
    <div className="flex flex-wrap gap-0.5">
      {visible.map(tag => {
        const c = getTagColour(tag)
        return (
          <span
            key={tag}
            className={cn(
              "inline-flex items-center rounded-full border font-medium leading-none",
              c.bg, c.text, c.border,
              size === "xs" ? "px-1.5 py-[2px] text-[0.55rem]" : "px-2 py-0.5 text-[0.65rem]"
            )}
          >
            {tag}
          </span>
        )
      })}
      {overflow > 0 && (
        <span className={cn(
          "inline-flex items-center rounded-full border font-medium leading-none text-muted-foreground bg-white/5 border-white/10",
          size === "xs" ? "px-1.5 py-[2px] text-[0.55rem]" : "px-2 py-0.5 text-[0.65rem]"
        )}>
          +{overflow}
        </span>
      )}
    </div>
  )
}


// ── Full tag editor with presets + custom input ─────────────────────
interface TagEditorProps {
  jobId: string
  tags: string[] | null
  /** Compact mode for cards / inline use */
  compact?: boolean
}

export function TagEditor({ jobId, tags, compact = false }: TagEditorProps) {
  const updateJob = useUpdateJob()
  const [customTag, setCustomTag] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  const currentTags = tags || []

  // Close dropdown on outside click
  React.useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  const addTag = async (tag: string) => {
    const trimmed = tag.trim()
    if (!trimmed || currentTags.includes(trimmed)) return
    try {
      await updateJob.mutateAsync({ id: jobId, tags: [...currentTags, trimmed] })
      setCustomTag("")
    } catch {
      toast.error("Failed to add tag")
    }
  }

  const removeTag = async (tagToRemove: string) => {
    try {
      await updateJob.mutateAsync({ id: jobId, tags: currentTags.filter(t => t !== tagToRemove) })
    } catch {
      toast.error("Failed to remove tag")
    }
  }

  // Available presets (not already added)
  const availablePresets = PRESET_TAGS.filter(p => !currentTags.includes(p))

  return (
    <div
      className="flex flex-col gap-1.5"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Current tags */}
      {currentTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {currentTags.map(tag => {
            const c = getTagColour(tag)
            return (
              <span
                key={tag}
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full border font-medium group/tag",
                  c.bg, c.text, c.border,
                  compact ? "px-1.5 py-[2px] text-[0.6rem]" : "px-2 py-0.5 text-xs"
                )}
              >
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity"
                  aria-label={`Remove ${tag}`}
                >
                  <X className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
                </button>
              </span>
            )
          })}
        </div>
      )}

      {/* Add tag dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "inline-flex items-center gap-1 rounded-md border border-dashed border-white/10 text-muted-foreground",
            "hover:border-white/20 hover:text-white/70 transition-colors",
            compact ? "px-1.5 py-0.5 text-[0.6rem]" : "px-2 py-1 text-xs"
          )}
        >
          <Plus className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
          Tag
          <ChevronDown className={cn("transition-transform", compact ? "h-2.5 w-2.5" : "h-3 w-3", open && "rotate-180")} />
        </button>

        {open && (
          <div className={cn(
            "absolute z-50 mt-1 w-56 rounded-lg border border-white/10 bg-[#161622] shadow-xl shadow-black/40",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150"
          )}>
            {/* Presets */}
            {availablePresets.length > 0 && (
              <div className="p-1.5 border-b border-white/5">
                <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground px-2 py-1">Quick add</p>
                <div className="flex flex-wrap gap-1 px-1">
                  {availablePresets.map(preset => {
                    const c = getTagColour(preset)
                    return (
                      <button
                        key={preset}
                        onClick={() => addTag(preset)}
                        disabled={updateJob.isPending}
                        className={cn(
                          "inline-flex items-center rounded-full border font-medium px-2 py-0.5 text-[0.65rem]",
                          "transition-all hover:scale-105 active:scale-95",
                          "disabled:opacity-50",
                          c.bg, c.text, c.border,
                          `hover:${c.bg.replace("/15", "/25")}`
                        )}
                      >
                        <Plus className="h-2.5 w-2.5 mr-0.5" />
                        {preset}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Custom input */}
            <div className="p-2">
              <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground px-1 pb-1.5">Custom tag</p>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addTag(customTag)
                    }
                  }}
                  placeholder="Type anything…"
                  className={cn(
                    "flex-1 h-7 rounded-md border border-white/10 bg-white/5 px-2 text-xs text-white",
                    "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/30"
                  )}
                />
                <button
                  onClick={() => addTag(customTag)}
                  disabled={!customTag.trim() || updateJob.isPending}
                  className={cn(
                    "h-7 px-2 rounded-md text-xs font-medium transition-colors",
                    "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30",
                    "hover:bg-cyan-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
                  )}
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
