"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  AlertTriangle, 
  Clock, 
  Shield, 
  FileText, 
  Zap,
  ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { differenceInDays, isPast } from "date-fns"

interface Deadline {
  id: string
  type: "mcs" | "dno" | "part_p" | "seg" | "other"
  title: string
  jobNumber: string
  jobId: string
  dueDate: string
  customerName?: string
}

interface DeadlineWarningsProps {
  deadlines?: Deadline[]
  isLoading?: boolean
  className?: string
}

const typeConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  mcs: { icon: <Shield className="h-4 w-4" />, label: "MCS Certificate", color: "text-red-600" },
  dno: { icon: <Zap className="h-4 w-4" />, label: "DNO Application", color: "text-orange-600" },
  part_p: { icon: <FileText className="h-4 w-4" />, label: "Part P", color: "text-amber-600" },
  seg: { icon: <Zap className="h-4 w-4" />, label: "SEG Registration", color: "text-yellow-600" },
  other: { icon: <Clock className="h-4 w-4" />, label: "Deadline", color: "text-muted-foreground" },
}

function getUrgencyBadge(dueDate: string) {
  const date = new Date(dueDate)
  const days = differenceInDays(date, new Date())
  
  if (isPast(date)) {
    return <Badge variant="destructive" className="shrink-0">Overdue</Badge>
  }
  if (days <= 1) {
    return <Badge variant="destructive" className="shrink-0">Due today</Badge>
  }
  if (days <= 3) {
    return <Badge className="bg-orange-500/10 text-orange-700 border-orange-500/20 shrink-0">{days} days left</Badge>
  }
  if (days <= 7) {
    return <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 shrink-0">{days} days left</Badge>
  }
  return <Badge variant="outline" className="shrink-0">{days} days left</Badge>
}

export function DeadlineWarnings({ deadlines = [], isLoading, className }: DeadlineWarningsProps) {
  // Sort by urgency (most urgent first)
  const sortedDeadlines = React.useMemo(() => {
    return [...deadlines].sort((a, b) => {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    })
  }, [deadlines])

  const urgentCount = sortedDeadlines.filter(d => {
    const days = differenceInDays(new Date(d.dueDate), new Date())
    return days <= 3 || isPast(new Date(d.dueDate))
  }).length

  if (isLoading) {
    return (
      <Card className={cn("border-orange-500/20", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-orange-600">
            <AlertTriangle className="h-4 w-4" />
            Compliance Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-10 w-10 rounded bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-muted rounded" />
                  <div className="h-3 w-1/2 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (sortedDeadlines.length === 0) {
    return (
      <Card className={cn("border-green-500/20", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-green-600">
            <Shield className="h-4 w-4" />
            Compliance Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Shield className="h-10 w-10 mx-auto mb-2 text-green-500/50" />
            <p className="text-sm font-medium text-green-600">All caught up!</p>
            <p className="text-xs text-muted-foreground mt-1">No upcoming compliance deadlines</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(
      urgentCount > 0 ? "border-orange-500/20" : "border-border",
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className={cn(
            "text-base flex items-center gap-2",
            urgentCount > 0 ? "text-orange-600" : "text-foreground"
          )}>
            <AlertTriangle className="h-4 w-4" />
            Compliance Deadlines
            {urgentCount > 0 && (
              <Badge variant="destructive" className="ml-2">{urgentCount} urgent</Badge>
            )}
          </CardTitle>
          <Link href="/compliance">
            <Button variant="ghost" size="sm" className="h-8">
              View all
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedDeadlines.slice(0, 5).map((deadline) => {
            const config = typeConfig[deadline.type] || typeConfig.other
            const isOverdue = isPast(new Date(deadline.dueDate))
            
            return (
              <Link
                key={deadline.id}
                href={`/jobs/${deadline.jobId}`}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                  isOverdue 
                    ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 hover:border-red-300"
                    : "bg-card border-border hover:border-primary/20 hover:bg-muted/50"
                )}
              >
                <div className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
                  isOverdue ? "bg-red-100 dark:bg-red-900/30" : "bg-muted"
                )}>
                  <span className={config.color}>{config.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{config.label}</p>
                    {getUrgencyBadge(deadline.dueDate)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {deadline.jobNumber}
                    {deadline.customerName && ` • ${deadline.customerName}`}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </Link>
            )
          })}
        </div>
        {sortedDeadlines.length > 5 && (
          <div className="mt-3 pt-3 border-t text-center">
            <Link href="/compliance" className="text-sm text-primary hover:underline">
              View {sortedDeadlines.length - 5} more deadlines
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
