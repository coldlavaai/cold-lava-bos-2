"use client"

import * as React from "react"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface TextareaWithCounterProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxLength: number
  showWarningAt?: number
}

export const TextareaWithCounter = React.forwardRef<
  HTMLTextAreaElement,
  TextareaWithCounterProps
>(({ className, maxLength, showWarningAt = 0.9, value, onChange, ...props }, ref) => {
  const [length, setLength] = React.useState(String(value || "").length)
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLength(e.target.value.length)
    onChange?.(e)
  }

  const percentage = length / maxLength
  const isWarning = percentage >= showWarningAt
  const isOver = length > maxLength

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        className={cn(
          isOver && "border-destructive focus-visible:ring-destructive",
          className
        )}
        maxLength={maxLength}
        value={value}
        onChange={handleChange}
        {...props}
      />
      <div
        className={cn(
          "absolute bottom-2 right-2 text-xs",
          isOver ? "text-destructive" : isWarning ? "text-warning" : "text-muted-foreground"
        )}
      >
        {length}/{maxLength}
      </div>
    </div>
  )
})

TextareaWithCounter.displayName = "TextareaWithCounter"
