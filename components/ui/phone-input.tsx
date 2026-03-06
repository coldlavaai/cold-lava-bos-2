"use client"

import * as React from "react"
import { Input } from "./input"
import { cn } from "@/lib/utils"
import { Phone } from "lucide-react"

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value?: string
  onChange?: (value: string) => void
  countryCode?: string
}

export function PhoneInput({
  value = "",
  onChange,
  countryCode = "+44",
  className,
  ...props
}: PhoneInputProps) {
  // Format UK phone number
  const formatPhone = (input: string): string => {
    // Remove all non-digits
    const digits = input.replace(/\D/g, "")
    
    // Remove leading 0 or country code
    let cleaned = digits
    if (cleaned.startsWith("44")) {
      cleaned = cleaned.slice(2)
    }
    if (cleaned.startsWith("0")) {
      cleaned = cleaned.slice(1)
    }
    
    // Format based on length
    if (cleaned.length <= 4) {
      return cleaned
    } else if (cleaned.length <= 7) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`
    } else {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 11)}`
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value)
    onChange?.(formatted)
  }

  return (
    <div className="relative flex">
      <div className="flex items-center gap-1.5 px-3 border border-r-0 rounded-l-md bg-muted text-muted-foreground text-sm">
        <Phone className="h-4 w-4" />
        <span>{countryCode}</span>
      </div>
      <Input
        type="tel"
        value={value}
        onChange={handleChange}
        className={cn("rounded-l-none", className)}
        placeholder="7123 456 789"
        maxLength={14}
        {...props}
      />
    </div>
  )
}
