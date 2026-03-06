"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Plus,
  Phone,
  ClipboardList,
  CheckSquare,
  Calendar,
  Flag,
  Loader2,
} from "lucide-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface QuickAddTaskProps {
  linkedEntityType?: string
  linkedEntityId?: string
  className?: string
}

const TASK_TYPES = [
  { value: 'call', label: 'Phone Call', icon: Phone, color: 'bg-teal-500' },
  { value: 'follow_up', label: 'Follow-Up', icon: ClipboardList, color: 'bg-cyan-600' },
  { value: 'todo', label: 'To-Do', icon: CheckSquare, color: 'bg-teal-600' },
]

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'text-white/50' },
  { value: 'medium', label: 'Medium', color: 'text-teal-400' },
  { value: 'high', label: 'High', color: 'text-red-500' },
]

export function QuickAddTask({ linkedEntityType, linkedEntityId, className }: QuickAddTaskProps) {
  const queryClient = useQueryClient()
  const [open, setOpen] = React.useState(false)
  const [taskType, setTaskType] = React.useState<string>('todo')
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [dueDate, setDueDate] = React.useState('')
  const [priority, setPriority] = React.useState('medium')

  // Listen for external trigger to open the task sheet (from mobile nav)
  React.useEffect(() => {
    const handleOpenTask = () => setOpen(true)
    window.addEventListener('openQuickAddTask', handleOpenTask)
    return () => window.removeEventListener('openQuickAddTask', handleOpenTask)
  }, [])

  const createMutation = useMutation({
    mutationFn: async (data: {
      title: string
      description?: string
      due_date?: string
      priority: string
      task_type?: string
      linked_entity_type?: string
      linked_entity_id?: string
    }) => {
      return api.post('/tasks', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Task created!')
      resetForm()
      setOpen(false)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create task')
    },
  })

  const resetForm = () => {
    setTaskType('todo')
    setTitle('')
    setDescription('')
    setDueDate('')
    setPriority('medium')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('Please enter a task title')
      return
    }

    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      due_date: dueDate || undefined,
      priority,
      task_type: taskType,
      linked_entity_type: linkedEntityType,
      linked_entity_id: linkedEntityId,
    })
  }

  const selectedType = TASK_TYPES.find(t => t.value === taskType)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          className={cn(
            "fixed bottom-20 md:bottom-6 right-4 md:right-6 h-14 w-14 rounded-full shadow-lg z-50",
            "bg-primary hover:bg-primary/90 hover:scale-105 transition-all",
            className
          )}
        >
          <Plus className="h-6 w-6" />
          <span className="sr-only">Add Task</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Quick Add Task</SheetTitle>
          <SheetDescription>
            Create a new task, call, or follow-up
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Task Type Selector */}
          <div className="space-y-2">
            <Label>Task Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {TASK_TYPES.map((type) => {
                const Icon = type.icon
                const isSelected = taskType === type.value
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setTaskType(type.value)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30 hover:bg-muted/50"
                    )}
                  >
                    <div className={cn("p-2 rounded-lg text-white", type.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className={cn("text-xs font-medium", isSelected && "text-primary")}>
                      {type.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              {selectedType?.label || 'Task'} Title *
            </Label>
            <Input
              id="title"
              placeholder={
                taskType === 'call' ? "e.g., Call lead back" :
                taskType === 'follow_up' ? "e.g., Send mockup to prospect" :
                "e.g., Prep demo for client"
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Notes (optional)</Label>
            <Textarea
              id="description"
              placeholder="Add any details or notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Due Date & Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="due_date" className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Due Date
              </Label>
              <Input
                id="due_date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Flag className="h-3.5 w-3.5" />
                Priority
              </Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className={p.color}>{p.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <SheetFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Task
                </>
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
