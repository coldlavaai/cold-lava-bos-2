import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number in pence to a GBP currency string
 * @param pence - Amount in pence (e.g., 15000 = £150.00)
 * @returns Formatted currency string (e.g., "£150.00")
 */
export function formatCurrency(pence: number | null | undefined): string {
  if (pence == null) return '£0.00'
  const pounds = pence / 100
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(pounds)
}
