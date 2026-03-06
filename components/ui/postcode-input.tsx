"use client"

import * as React from "react"
import { Input } from "./input"
import { cn } from "@/lib/utils"
import { MapPin, Check, AlertCircle, Loader2 } from "lucide-react"

interface PostcodeInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value?: string
  onChange?: (value: string) => void
  onValidate?: (isValid: boolean, postcode: string) => void
  showValidation?: boolean
}

// UK postcode regex (simplified but covers most cases)
const UK_POSTCODE_REGEX = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i

export function PostcodeInput({
  value = "",
  onChange,
  onValidate,
  showValidation = true,
  className,
  ...props
}: PostcodeInputProps) {
  const [isValidating, setIsValidating] = React.useState(false)
  const [isValid, setIsValid] = React.useState<boolean | null>(null)

  // Format postcode (uppercase, add space)
  const formatPostcode = (input: string): string => {
    const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, "")
    
    // Add space before last 3 characters if long enough
    if (cleaned.length > 4) {
      const inward = cleaned.slice(-3)
      const outward = cleaned.slice(0, -3)
      return `${outward} ${inward}`
    }
    
    return cleaned
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPostcode(e.target.value)
    onChange?.(formatted)
    setIsValid(null)
  }

  const handleBlur = () => {
    if (!value || value.length < 5) {
      setIsValid(null)
      return
    }

    setIsValidating(true)
    
    // Simple validation (could be enhanced with API lookup)
    setTimeout(() => {
      const valid = UK_POSTCODE_REGEX.test(value)
      setIsValid(valid)
      setIsValidating(false)
      onValidate?.(valid, value)
    }, 300)
  }

  const getStatusIcon = () => {
    if (isValidating) {
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
    }
    if (isValid === true) {
      return <Check className="h-4 w-4 text-green-500" />
    }
    if (isValid === false) {
      return <AlertCircle className="h-4 w-4 text-red-500" />
    }
    return null
  }

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn(
          "pl-9 uppercase",
          showValidation && "pr-9",
          isValid === false && "border-red-500 focus-visible:ring-red-500",
          isValid === true && "border-green-500 focus-visible:ring-green-500",
          className
        )}
        placeholder="SW1A 1AA"
        maxLength={8}
        {...props}
      />
      {showValidation && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {getStatusIcon()}
        </div>
      )}
    </div>
  )
}
