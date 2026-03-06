"use client"

import * as React from "react"
import { Input } from "./input"
import { cn } from "@/lib/utils"

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value?: number
  onChange?: (value: number | undefined) => void
  currency?: string
  locale?: string
}

export function CurrencyInput({
  value,
  onChange,
  currency = "GBP",
  locale = "en-GB",
  className,
  ...props
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = React.useState("")

  // Format number to currency display
  const formatCurrency = React.useCallback((num: number) => {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
  }, [locale])

  // Parse display string to number
  const parseValue = (str: string): number | undefined => {
    const cleaned = str.replace(/[^0-9.]/g, "")
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? undefined : parsed
  }

  // Initialize display value
  React.useEffect(() => {
    if (value !== undefined) {
      setDisplayValue(formatCurrency(value))
    } else {
      setDisplayValue("")
    }
  }, [value, formatCurrency])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    setDisplayValue(inputValue)
    
    const parsed = parseValue(inputValue)
    onChange?.(parsed)
  }

  const handleBlur = () => {
    if (value !== undefined) {
      setDisplayValue(formatCurrency(value))
    }
  }

  const getCurrencySymbol = () => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).formatToParts(0).find(p => p.type === "currency")?.value || "£"
  }

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
        {getCurrencySymbol()}
      </span>
      <Input
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn("pl-7", className)}
        {...props}
      />
    </div>
  )
}
