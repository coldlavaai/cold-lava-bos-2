import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  trend?: {
    value: number
    label?: string
  }
  className?: string
  variant?: "default" | "success" | "warning" | "danger"
}

const variantStyles = {
  default: "bg-white/[0.04] border-white/[0.08]",
  success: "bg-emerald-500/10 border-emerald-500/20",
  warning: "bg-amber-500/10 border-amber-500/20",
  danger: "bg-red-500/10 border-red-500/20",
}

const iconStyles = {
  default: "bg-primary/10 text-primary",
  success: "bg-emerald-500/15 text-emerald-400",
  warning: "bg-amber-500/15 text-amber-400",
  danger: "bg-red-500/15 text-red-400",
}

export function StatsCard({
  title,
  value,
  description,
  icon,
  trend,
  className,
  variant = "default",
}: StatsCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null
    if (trend.value > 0) return <TrendingUp className="h-3 w-3" />
    if (trend.value < 0) return <TrendingDown className="h-3 w-3" />
    return <Minus className="h-3 w-3" />
  }

  const getTrendColor = () => {
    if (!trend) return ""
    if (trend.value > 0) return "text-green-600"
    if (trend.value < 0) return "text-red-600"
    return "text-muted-foreground"
  }

  return (
    <Card className={cn(variantStyles[variant], className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground font-medium truncate">
              {title}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-2xl font-bold tracking-tight">
                {value}
              </p>
              {trend && (
                <span className={cn("flex items-center gap-0.5 text-xs font-medium", getTrendColor())}>
                  {getTrendIcon()}
                  {Math.abs(trend.value)}%
                  {trend.label && <span className="text-muted-foreground ml-1">{trend.label}</span>}
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
          {icon && (
            <div className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
              iconStyles[variant]
            )}>
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
