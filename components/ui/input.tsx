import * as React from "react"
import { cn } from "@/lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 md:h-10 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl px-3.5 py-2",
          "text-base md:text-sm text-white/85 shadow-sm shadow-black/20",
          "transition-all duration-200 ease-out",
          "placeholder:text-white/40",
          "hover:border-white/[0.12] hover:bg-white/[0.06]",
          "focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 focus:bg-white/[0.06]",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-white/[0.02] disabled:hover:border-white/[0.08]",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-white/70",
          "touch-manipulation",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
