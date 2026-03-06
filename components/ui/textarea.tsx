import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-lg border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl px-3.5 py-3",
        "text-base md:text-sm text-white/85 shadow-sm shadow-black/20",
        "transition-all duration-200 ease-out resize-none",
        "placeholder:text-white/40",
        "hover:border-white/[0.12] hover:bg-white/[0.06]",
        "focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 focus:bg-white/[0.06]",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-white/[0.02]",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
