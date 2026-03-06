"use client"

import * as React from "react"
import { useTasks, useCompleteTask } from "@/lib/api/hooks"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CheckCircle2,
  Circle,
  CheckSquare,
  Calendar,
  Flag,
  Loader2,
  Link as LinkIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import Link from "next/link"

type ViewFilter = "all" | "today" | "week" | "overdue"
type StatusFilter = "pending" | "completed"

const PRIORITY_CONFIG = {
  high:   { label: "High",   className: "border-red-500/50 text-red-400 bg-red-500/10" },
  medium: { label: "Medium", className: "border-teal-500/50 text-teal-400 bg-teal-500/10" },
  low:    { label: "Low",    className: "border-slate-500/50 text-slate-400 bg-slate-500/10" },
} as const

function formatDueDate(dateStr: string | null | undefined): { label: string; overdue: boolean } {
  if (!dateStr) return { label: "", overdue: false }
  const date = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const overdue = date < today
  if (date.toDateString() === today.toDateString()) return { label: "Today", overdue: false }
  if (date.toDateString() === tomorrow.toDateString()) return { label: "Tomorrow", overdue: false }
  return {
    label: date.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    overdue,
  }
}

export default function TasksPage() {
  const [view, setView] = React.useState<ViewFilter>("all")
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("pending")

  const completeTask = useCompleteTask()

  const queryParams = React.useMemo(() => ({
    status: statusFilter,
    limit: 100,
    ...(view !== "all" ? { view } : {}),
  }), [view, statusFilter])

  const { data: tasks = [], isLoading } = useTasks(queryParams)

  const handleComplete = async (taskId: string) => {
    try {
      await completeTask.mutateAsync(taskId)
      toast.success("Task completed")
    } catch {
      toast.error("Failed to complete task")
    }
  }

  // Metrics for the header cards
  const { data: pendingAll = [] }  = useTasks({ status: "pending",   limit: 999 })
  const { data: overdueAll = [] }  = useTasks({ status: "pending",   view: "overdue", limit: 999 })
  const { data: todayAll = [] }    = useTasks({ status: "pending",   view: "today",   limit: 999 })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border bg-background px-3 md:px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Tasks</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage calls, surveys and to-dos</p>
          </div>
        </div>

        {/* Metric chips */}
        <div className="flex gap-3 mt-4">
          <div className="flex items-center gap-1.5 text-sm">
            <span className="font-semibold text-foreground">{pendingAll.length}</span>
            <span className="text-muted-foreground">pending</span>
          </div>
          {overdueAll.length > 0 && (
            <div className="flex items-center gap-1.5 text-sm">
              <span className="font-semibold text-red-400">{overdueAll.length}</span>
              <span className="text-muted-foreground">overdue</span>
            </div>
          )}
          {todayAll.length > 0 && (
            <div className="flex items-center gap-1.5 text-sm">
              <span className="font-semibold text-teal-400">{todayAll.length}</span>
              <span className="text-muted-foreground">due today</span>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-border bg-background px-3 md:px-6 py-3 flex flex-wrap items-center gap-2 md:gap-4">
        <Tabs value={view} onValueChange={(v) => setView(v as ViewFilter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="overdue" className="data-[state=active]:text-red-400">
              Overdue
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant={statusFilter === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("pending")}
          >
            Pending
          </Button>
          <Button
            variant={statusFilter === "completed" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("completed")}
          >
            Done
          </Button>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto px-3 md:px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">
              {statusFilter === "completed" ? "No completed tasks" : "No tasks here"}
            </p>
            {statusFilter === "pending" && (
              <p className="text-xs text-muted-foreground/70 mt-1">
                Use the + button to create your first task
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2 max-w-3xl">
            {tasks.map((task) => {
              const priorityConfig = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG]
                ?? PRIORITY_CONFIG.medium
              const due = formatDueDate(task.due_date)
              const isCompleted = task.status === "completed"

              return (
                <Card
                  key={task.id}
                  className={cn(
                    "transition-all",
                    isCompleted && "opacity-60"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Complete button */}
                      {!isCompleted ? (
                        <button
                          onClick={() => handleComplete(task.id)}
                          disabled={completeTask.isPending}
                          className="mt-0.5 text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                          title="Mark complete"
                        >
                          <Circle className="h-5 w-5" />
                        </button>
                      ) : (
                        <CheckCircle2 className="h-5 w-5 mt-0.5 text-green-500 flex-shrink-0" />
                      )}

                      {/* Task icon */}
                      <div className="p-1.5 rounded bg-teal-500/20 text-teal-400 flex-shrink-0">
                        <CheckSquare className="h-3.5 w-3.5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium leading-snug",
                          isCompleted && "line-through text-muted-foreground"
                        )}>
                          {task.title}
                        </p>

                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {/* Priority */}
                          <Badge variant="outline" className={cn("text-xs px-1.5 py-0", priorityConfig.className)}>
                            <Flag className="h-2.5 w-2.5 mr-1" />
                            {priorityConfig.label}
                          </Badge>

                          {/* Due date */}
                          {due.label && (
                            <span className={cn(
                              "text-xs flex items-center gap-1",
                              due.overdue ? "text-red-400" : "text-muted-foreground"
                            )}>
                              <Calendar className="h-3 w-3" />
                              {due.label}
                            </span>
                          )}

                          {/* Linked entity */}
                          {task.linked_entity_type && task.linked_entity_id && (
                            <Link
                              href={`/${task.linked_entity_type === "job" ? "jobs" : task.linked_entity_type + "s"}/${task.linked_entity_id}`}
                              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <LinkIcon className="h-3 w-3" />
                              {task.linked_entity_type}
                            </Link>
                          )}

                          {/* Assignee */}
                          {task.assignee && (
                            <span className="text-xs text-muted-foreground">
                              → {task.assignee.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
