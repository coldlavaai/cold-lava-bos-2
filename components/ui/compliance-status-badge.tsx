import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type ComplianceStatus = 'ready' | 'in_progress' | 'not_started' | 'dno_pending'

export interface ComplianceStatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: ComplianceStatus | null | undefined
  /**
   * Size variant for the badge
   * @default 'default'
   */
  size?: 'sm' | 'default' | 'lg'
  /**
   * Show icon alongside text
   * @default false
   */
  showIcon?: boolean
}

/**
 * Maps compliance status to badge variant and display text.
 * Used by JobCard and compliance reports to show job compliance state.
 *
 * Status mapping (aligned with Session 58 4-tier system):
 * - ready: All critical compliance fields complete
 * - dno_pending: All fields except DNO reference (waiting on DNO)
 * - in_progress: Some critical fields filled
 * - not_started: No compliance data entered
 */
function ComplianceStatusBadge({
  status,
  size = 'default',
  showIcon = false,
  className,
  ...props
}: ComplianceStatusBadgeProps) {
  // Guard: Return null if no status provided (shouldn't happen but be defensive)
  if (!status) {
    return null
  }

  const config = getStatusConfig(status)

  const sizeClasses = {
    sm: 'text-[0.6rem] h-4 px-1',
    default: 'text-xs h-5 px-1.5',
    lg: 'text-sm h-6 px-2',
  }

  return (
    <Badge
      variant={config.variant}
      className={cn(sizeClasses[size], className)}
      data-testid={`compliance-badge-${status}`}
      {...props}
    >
      {showIcon && <span className="mr-1">{config.icon}</span>}
      {config.text}
    </Badge>
  )
}

/**
 * Get display configuration for a compliance status.
 * Centralizes mapping logic for consistency across the app.
 */
function getStatusConfig(status: ComplianceStatus) {
  switch (status) {
    case 'ready':
      return {
        variant: 'success' as const,
        text: 'Ready',
        icon: '✓',
        description: 'All critical compliance fields complete',
      }
    case 'dno_pending':
      return {
        variant: 'warning' as const,
        text: 'DNO Pending',
        icon: '⏳',
        description: 'Awaiting DNO reference',
      }
    case 'in_progress':
      return {
        variant: 'secondary' as const,
        text: 'In Progress',
        icon: '◐',
        description: 'Some critical fields filled',
      }
    case 'not_started':
      return {
        variant: 'destructive' as const,
        text: 'Not Started',
        icon: '○',
        description: 'No compliance data entered',
      }
  }
}

export { ComplianceStatusBadge, getStatusConfig }
