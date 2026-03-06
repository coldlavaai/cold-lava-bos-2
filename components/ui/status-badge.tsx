import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Circle,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Flame,
} from "lucide-react"

export type JobStatus =
  | "lead"
  | "contacted"
  | "survey_scheduled"
  | "quoted"
  | "won"
  | "lost"
  | "installed"

export type TaskPriority = "low" | "medium" | "high" | "urgent"

export type TaskStatus = "todo" | "in_progress" | "completed" | "cancelled"

interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: string
  type?: "job" | "task" | "priority"
  withIcon?: boolean
}

const jobStatusConfig: Record<
  JobStatus,
  { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" | "info" | "outline"; icon: React.ComponentType<{ className?: string }> }
> = {
  lead: { label: "Lead", variant: "outline", icon: Circle },
  contacted: { label: "Contacted", variant: "info", icon: Circle },
  survey_scheduled: { label: "Survey Scheduled", variant: "secondary", icon: Clock },
  quoted: { label: "Quoted", variant: "warning", icon: Clock },
  won: { label: "Won", variant: "success", icon: CheckCircle2 },
  lost: { label: "Lost", variant: "destructive", icon: XCircle },
  installed: { label: "Installed", variant: "success", icon: CheckCircle2 },
}

const taskPriorityConfig: Record<
  TaskPriority,
  { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" | "glow"; icon: React.ComponentType<{ className?: string }> }
> = {
  low: { label: "Low", variant: "default", icon: Circle },
  medium: { label: "Medium", variant: "secondary", icon: Circle },
  high: { label: "High", variant: "warning", icon: AlertCircle },
  urgent: { label: "Urgent", variant: "glow", icon: Flame },
}

const taskStatusConfig: Record<
  TaskStatus,
  { label: string; variant: "default" | "secondary" | "success" | "destructive"; icon: React.ComponentType<{ className?: string }> }
> = {
  todo: { label: "To Do", variant: "default", icon: Circle },
  in_progress: { label: "In Progress", variant: "secondary", icon: Clock },
  completed: { label: "Completed", variant: "success", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", variant: "destructive", icon: XCircle },
}

export function StatusBadge({
  status,
  type = "job",
  withIcon = true,
  className,
  ...props
}: StatusBadgeProps) {
  let config: { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" | "info" | "outline" | "glow"; icon: React.ComponentType<{ className?: string }> }

  if (type === "job") {
    config = jobStatusConfig[status as JobStatus] || {
      label: status,
      variant: "default",
      icon: Circle,
    }
  } else if (type === "priority") {
    config = taskPriorityConfig[status as TaskPriority] || {
      label: status,
      variant: "default",
      icon: Circle,
    }
  } else {
    config = taskStatusConfig[status as TaskStatus] || {
      label: status,
      variant: "default",
      icon: Circle,
    }
  }

  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={cn("gap-1", className)} {...props}>
      {withIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  )
}
