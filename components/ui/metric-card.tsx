import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown } from "lucide-react"

export interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  trend?: {
    value: number
    direction: "up" | "down"
    label?: string
  }
  variant?: "default" | "primary" | "success" | "warning" | "secondary"
  loading?: boolean
  className?: string
}

const variantStyles = {
  default: "bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.12] hover:shadow-xl hover:shadow-black/30 transition-all duration-300",
  primary: "bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] hover:border-primary/40 hover:shadow-xl hover:shadow-primary/15 transition-all duration-300",
  success: "bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] hover:border-success/40 hover:shadow-xl hover:shadow-success/15 transition-all duration-300",
  warning: "bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] hover:border-amber-400/40 hover:shadow-xl hover:shadow-amber-500/15 transition-all duration-300",
  secondary: "bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] hover:border-secondary/40 hover:shadow-xl hover:shadow-secondary/15 transition-all duration-300",
}

const variantTextColors = {
  default: "text-foreground",
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  secondary: "text-secondary",
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = "default",
  loading = false,
  className,
}: MetricCardProps) {
  if (loading) {
    return (
      <Card data-testid="metric-card" className={cn(variantStyles[variant], "animate-skeleton", className)}>
        <CardHeader className="pb-3">
          <CardDescription className="flex items-center gap-2">
            {icon && <div className="opacity-50">{icon}</div>}
            <div className="h-4 w-24 bg-muted rounded animate-skeleton"></div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-10 w-32 bg-muted rounded animate-skeleton mb-2"></div>
          <div className="h-3 w-20 bg-muted rounded animate-skeleton"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      data-testid="metric-card"
      className={cn(
        variantStyles[variant],
        "transition-all duration-200 hover:-translate-y-0.5",
        className
      )}
    >
      <CardHeader className="pb-3">
        <CardDescription className="flex items-center gap-2">
          {icon && <div className="opacity-70">{icon}</div>}
          {title}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "text-3xl font-display font-bold mb-1",
            variantTextColors[variant]
          )}
        >
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            {trend.direction === "up" ? (
              <TrendingUp className="h-3 w-3 text-success" />
            ) : (
              <TrendingDown className="h-3 w-3 text-destructive" />
            )}
            <span
              className={cn(
                "text-xs font-medium",
                trend.direction === "up" ? "text-success" : "text-destructive"
              )}
            >
              {trend.value > 0 ? "+" : ""}
              {trend.value}%
            </span>
            {trend.label && (
              <span className="text-xs text-muted-foreground ml-1">
                {trend.label}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
