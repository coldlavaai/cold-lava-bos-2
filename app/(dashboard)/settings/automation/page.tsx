"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Zap,
  Plus,
  Play,
  Trash2,
  Edit,
  CheckCircle2,
  Clock,
  Mail,
  MessageSquare,
  Bell,
  Calendar,
  FileText,
  Users,
  Phone,
  ArrowRight,
  GripVertical,
  Timer,
  PenLine,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ──────────────────────────────────────
// Types
// ──────────────────────────────────────

interface AutomationAction {
  type: string
  config: Record<string, unknown>
}

interface Automation {
  id: string
  name: string
  description: string | null
  is_active: boolean
  trigger_module: string
  trigger_event: string
  trigger_conditions: Record<string, unknown>
  actions: AutomationAction[]
  schedule_type: string | null
  schedule_config: Record<string, unknown> | null
  last_triggered_at: string | null
  trigger_count: number
  created_at: string
  updated_at: string
}

type FormAction = AutomationAction

interface AutomationForm {
  name: string
  description: string
  trigger_module: string
  trigger_event: string
  trigger_conditions: Record<string, unknown>
  actions: FormAction[]
  schedule_type: string
  schedule_config: Record<string, unknown>
  is_active: boolean
}

// ──────────────────────────────────────
// Constants
// ──────────────────────────────────────

const MODULES = [
  { value: "jobs", label: "Jobs", icon: FileText },
  { value: "customers", label: "Customers", icon: Users },
  { value: "appointments", label: "Appointments", icon: Calendar },
  { value: "call_recordings", label: "Call Recordings", icon: Phone },
] as const

const TRIGGER_EVENTS_BY_MODULE: Record<string, { value: string; label: string }[]> = {
  jobs: [
    { value: "create", label: "Created" },
    { value: "update", label: "Updated" },
    { value: "stage_change", label: "Stage Changed" },
  ],
  customers: [
    { value: "create", label: "Created" },
    { value: "update", label: "Updated" },
  ],
  appointments: [
    { value: "create", label: "Created" },
    { value: "time_based", label: "Time-based (X before/after)" },
  ],
  call_recordings: [
    { value: "create", label: "Created (New Call)" },
  ],
}

const ACTION_TYPES = [
  { value: "send_email", label: "Send Email", icon: Mail, description: "Send an email to customer or team" },
  { value: "create_task", label: "Create Task", icon: FileText, description: "Create a follow-up task" },
  { value: "update_field", label: "Update Field", icon: PenLine, description: "Update a field value on the record" },
  { value: "send_notification", label: "Send Notification", icon: Bell, description: "Notify team members" },
  { value: "wait", label: "Wait", icon: Timer, description: "Delay before next action" },
] as const

const MODULE_LABELS: Record<string, string> = {
  jobs: "Jobs",
  customers: "Customers",
  appointments: "Appointments",
  call_recordings: "Call Recordings",
}

const EVENT_LABELS: Record<string, string> = {
  create: "Created",
  update: "Updated",
  stage_change: "Stage Changed",
  field_change: "Field Changed",
  time_based: "Time-based",
}

const MODULE_ICONS: Record<string, React.ElementType> = {
  jobs: FileText,
  customers: Users,
  appointments: Calendar,
  call_recordings: Phone,
}

// ──────────────────────────────────────
// Empty form helper
// ──────────────────────────────────────

const emptyForm = (): AutomationForm => ({
  name: "",
  description: "",
  trigger_module: "",
  trigger_event: "",
  trigger_conditions: {},
  actions: [],
  schedule_type: "",
  schedule_config: {},
  is_active: true,
})

const formFromAutomation = (a: Automation): AutomationForm => ({
  name: a.name,
  description: a.description || "",
  trigger_module: a.trigger_module,
  trigger_event: a.trigger_event,
  trigger_conditions: a.trigger_conditions || {},
  actions: (a.actions || []) as FormAction[],
  schedule_type: a.schedule_type || "",
  schedule_config: a.schedule_config || {},
  is_active: a.is_active,
})

// ──────────────────────────────────────
// Action Config Sub-form
// ──────────────────────────────────────

function ActionConfigForm({
  action,
  onChange,
}: {
  action: FormAction
  onChange: (config: Record<string, unknown>) => void
}) {
  const c = action.config

  switch (action.type) {
    case "send_email":
      return (
        <div className="grid gap-3 pl-4 border-l-2 border-border/50">
          <div className="grid gap-1.5">
            <Label className="text-xs">Recipient</Label>
            <Select
              value={(c.to as string) || ""}
              onValueChange={(v) => onChange({ ...c, to: v })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select recipient..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="assigned_user">Assigned User</SelectItem>
                <SelectItem value="team">Entire Team</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Email Template</Label>
            <Select
              value={(c.template as string) || ""}
              onValueChange={(v) => onChange({ ...c, template: v })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select template..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="welcome">Welcome Email</SelectItem>
                <SelectItem value="follow_up">Follow-up</SelectItem>
                <SelectItem value="reminder">Reminder</SelectItem>
                <SelectItem value="survey">Survey Request</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {c.template === "custom" && (
            <div className="grid gap-1.5">
              <Label className="text-xs">Subject</Label>
              <Input
                className="h-8 text-xs"
                value={(c.subject as string) || ""}
                onChange={(e) => onChange({ ...c, subject: e.target.value })}
                placeholder="Email subject line"
              />
            </div>
          )}
        </div>
      )

    case "create_task":
      return (
        <div className="grid gap-3 pl-4 border-l-2 border-border/50">
          <div className="grid gap-1.5">
            <Label className="text-xs">Task Name</Label>
            <Input
              className="h-8 text-xs"
              value={(c.task_name as string) || ""}
              onChange={(e) => onChange({ ...c, task_name: e.target.value })}
              placeholder="e.g., Follow up with customer"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Assign To</Label>
            <Select
              value={(c.assignee as string) || ""}
              onValueChange={(v) => onChange({ ...c, assignee: v })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Assign to..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trigger_user">User who triggered</SelectItem>
                <SelectItem value="assigned_user">Assigned user on record</SelectItem>
                <SelectItem value="owner">Record owner</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Due Date (days from trigger)</Label>
            <Input
              className="h-8 text-xs"
              type="number"
              value={(c.due_offset_days as number) || 1}
              onChange={(e) => onChange({ ...c, due_offset_days: parseInt(e.target.value) || 1 })}
              min={0}
            />
          </div>
        </div>
      )

    case "update_field":
      return (
        <div className="grid gap-3 pl-4 border-l-2 border-border/50">
          <div className="grid gap-1.5">
            <Label className="text-xs">Field Name</Label>
            <Input
              className="h-8 text-xs"
              value={(c.field as string) || ""}
              onChange={(e) => onChange({ ...c, field: e.target.value })}
              placeholder="e.g., status, stage, priority"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">New Value</Label>
            <Input
              className="h-8 text-xs"
              value={(c.value as string) || ""}
              onChange={(e) => onChange({ ...c, value: e.target.value })}
              placeholder="New value to set"
            />
          </div>
        </div>
      )

    case "send_notification":
      return (
        <div className="grid gap-3 pl-4 border-l-2 border-border/50">
          <div className="grid gap-1.5">
            <Label className="text-xs">Notify</Label>
            <Select
              value={(c.notify_to as string) || ""}
              onValueChange={(v) => onChange({ ...c, notify_to: v })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Who to notify..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assigned_user">Assigned User</SelectItem>
                <SelectItem value="owner">Record Owner</SelectItem>
                <SelectItem value="all_team">All Team Members</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Message</Label>
            <Input
              className="h-8 text-xs"
              value={(c.message as string) || ""}
              onChange={(e) => onChange({ ...c, message: e.target.value })}
              placeholder="Notification message"
            />
          </div>
        </div>
      )

    case "wait":
      return (
        <div className="grid gap-3 pl-4 border-l-2 border-border/50">
          <div className="flex gap-2">
            <div className="grid gap-1.5 flex-1">
              <Label className="text-xs">Duration</Label>
              <Input
                className="h-8 text-xs"
                type="number"
                value={(c.duration as number) || 1}
                onChange={(e) => onChange({ ...c, duration: parseInt(e.target.value) || 1 })}
                min={1}
              />
            </div>
            <div className="grid gap-1.5 flex-1">
              <Label className="text-xs">Unit</Label>
              <Select
                value={(c.unit as string) || "hours"}
                onValueChange={(v) => onChange({ ...c, unit: v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )

    default:
      return null
  }
}

// ──────────────────────────────────────
// Main Page Component
// ──────────────────────────────────────

export default function AutomationPage() {
  const [automations, setAutomations] = React.useState<Automation[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [form, setForm] = React.useState<AutomationForm>(emptyForm())
  const [saving, setSaving] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  // ── Fetch automations ──
  const fetchAutomations = React.useCallback(async () => {
    try {
      const res = await fetch("/api/automations")
      if (!res.ok) throw new Error("Failed to fetch")
      const json = await res.json()
      setAutomations(json.data || [])
    } catch (err) {
      console.error("Error loading automations:", err)
      toast.error("Failed to load automations")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchAutomations()
  }, [fetchAutomations])

  // ── Open dialog for new/edit ──
  const openNew = () => {
    setEditingId(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  const openEdit = (a: Automation) => {
    setEditingId(a.id)
    setForm(formFromAutomation(a))
    setDialogOpen(true)
  }

  // ── Save (create/update) ──
  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required")
      return
    }
    if (!form.trigger_module) {
      toast.error("Please select a module")
      return
    }
    if (!form.trigger_event) {
      toast.error("Please select a trigger event")
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        trigger_module: form.trigger_module,
        trigger_event: form.trigger_event,
        trigger_conditions: form.trigger_conditions,
        actions: form.actions,
        schedule_type: form.schedule_type || null,
        schedule_config: form.trigger_event === "time_based" ? form.schedule_config : null,
        is_active: form.is_active,
      }

      const url = editingId ? `/api/automations/${editingId}` : "/api/automations"
      const method = editingId ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to save")
      }

      toast.success(editingId ? "Automation updated" : "Automation created")
      setDialogOpen(false)
      fetchAutomations()
    } catch (err) {
      console.error("Save error:", err)
      toast.error(err instanceof Error ? err.message : "Failed to save automation")
    } finally {
      setSaving(false)
    }
  }

  // ── Toggle active ──
  const handleToggle = async (id: string) => {
    try {
      const res = await fetch(`/api/automations/${id}/toggle`, { method: "POST" })
      if (!res.ok) throw new Error("Toggle failed")
      const json = await res.json()
      setAutomations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, is_active: json.data.is_active } : a))
      )
      toast.success(json.data.is_active ? "Automation enabled" : "Automation paused")
    } catch (err) {
      console.error("Toggle error:", err)
      toast.error("Failed to toggle automation")
    }
  }

  // ── Delete ──
  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/automations/${id}`, { method: "DELETE" })
      if (!res.ok && res.status !== 204) throw new Error("Delete failed")
      setAutomations((prev) => prev.filter((a) => a.id !== id))
      toast.success("Automation deleted")
    } catch (err) {
      console.error("Delete error:", err)
      toast.error("Failed to delete automation")
    } finally {
      setDeletingId(null)
    }
  }

  // ── Action management in form ──
  const addAction = (type: string) => {
    setForm((f) => ({
      ...f,
      actions: [...f.actions, { type, config: {} }],
    }))
  }

  const removeAction = (index: number) => {
    setForm((f) => ({
      ...f,
      actions: f.actions.filter((_, i) => i !== index),
    }))
  }

  const updateActionConfig = (index: number, config: Record<string, unknown>) => {
    setForm((f) => ({
      ...f,
      actions: f.actions.map((a, i) => (i === index ? { ...a, config } : a)),
    }))
  }

  // ── Helpers ──
  const formatDate = (d: string | null) => {
    if (!d) return "Never"
    return new Date(d).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const activeCount = automations.filter((a) => a.is_active).length
  const totalRuns = automations.reduce((s, a) => s + (a.trigger_count || 0), 0)

  const getActionIcon = (type: string) => {
    const found = ACTION_TYPES.find((a) => a.value === type)
    return found ? found.icon : Zap
  }

  const getActionLabel = (type: string) => {
    return ACTION_TYPES.find((a) => a.value === type)?.label || type
  }

  // ──────────────────────────────────────
  // Render
  // ──────────────────────────────────────

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div>
            <h1 className="text-xl font-display font-bold gradient-text-solar">
              Automations
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create workflows that run automatically when events occur
            </p>
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" />
            New Workflow
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold">{activeCount}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Play className="h-5 w-5 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Workflows</p>
                  <p className="text-2xl font-bold">{automations.length}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Executions</p>
                  <p className="text-2xl font-bold">{totalRuns}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Automations Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workflows</CardTitle>
            <CardDescription>Manage your automation workflows</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                <LoadingSkeleton className="h-16" />
                <LoadingSkeleton className="h-16" />
                <LoadingSkeleton className="h-16" />
              </div>
            ) : automations.length === 0 ? (
              <div className="p-8 text-center">
                <Zap className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium mb-1">No automations yet</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Create your first workflow to automate repetitive tasks
                </p>
                <Button onClick={openNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Workflow
                </Button>
              </div>
            ) : (
              <>
                {/* Table Header */}
                <div className="hidden md:grid grid-cols-[1fr_120px_140px_150px_100px_80px] gap-4 px-4 py-2 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <div>Name</div>
                  <div>Module</div>
                  <div>Execute On</div>
                  <div>Last Modified</div>
                  <div className="text-center">Actions</div>
                  <div className="text-center">Status</div>
                </div>
                <div className="divide-y divide-border">
                  {automations.map((automation) => {
                    const ModuleIcon = MODULE_ICONS[automation.trigger_module] || Zap
                    return (
                      <div
                        key={automation.id}
                        className={cn(
                          "grid grid-cols-1 md:grid-cols-[1fr_120px_140px_150px_100px_80px] gap-2 md:gap-4 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer items-center",
                          !automation.is_active && "opacity-60"
                        )}
                        onClick={() => openEdit(automation)}
                      >
                        {/* Name & Description */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{automation.name}</span>
                          </div>
                          {automation.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {automation.description}
                            </p>
                          )}
                        </div>

                        {/* Module */}
                        <div className="flex items-center gap-1.5">
                          <ModuleIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {MODULE_LABELS[automation.trigger_module] || automation.trigger_module}
                          </span>
                        </div>

                        {/* Execute On */}
                        <div>
                          <Badge variant="outline" className="text-xs font-normal">
                            {EVENT_LABELS[automation.trigger_event] || automation.trigger_event}
                          </Badge>
                        </div>

                        {/* Last Modified */}
                        <div className="text-xs text-muted-foreground">
                          {formatDate(automation.updated_at)}
                        </div>

                        {/* Actions count */}
                        <div className="text-center">
                          <Badge variant="secondary" className="text-xs">
                            {automation.actions?.length || 0} action{(automation.actions?.length || 0) !== 1 ? "s" : ""}
                          </Badge>
                        </div>

                        {/* Status Toggle */}
                        <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                          <Switch
                            checked={automation.is_active}
                            onCheckedChange={() => handleToggle(automation.id)}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Workflow Builder Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-teal-400" />
              {editingId ? "Edit Workflow" : "Create Workflow"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update your automation workflow configuration"
                : "Set up a new automation that runs when events occur"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* ── Step 1: Basic Info ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</div>
                Basic Information
              </div>
              <div className="grid gap-3 pl-8">
                <div className="grid gap-1.5">
                  <Label htmlFor="wf-name">Workflow Name</Label>
                  <Input
                    id="wf-name"
                    placeholder="e.g., Welcome Email on New Job"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="wf-desc">Description (optional)</Label>
                  <Textarea
                    id="wf-desc"
                    placeholder="What does this workflow do?"
                    className="min-h-[60px] resize-none"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* ── Step 2: Trigger ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</div>
                Trigger
              </div>
              <div className="grid gap-3 pl-8">
                <div className="grid gap-1.5">
                  <Label>Module</Label>
                  <Select
                    value={form.trigger_module}
                    onValueChange={(v) =>
                      setForm({ ...form, trigger_module: v, trigger_event: "" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select module..." />
                    </SelectTrigger>
                    <SelectContent>
                      {MODULES.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          <span className="flex items-center gap-2">
                            <m.icon className="h-4 w-4" />
                            {m.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {form.trigger_module && (
                  <div className="grid gap-1.5">
                    <Label>When</Label>
                    <Select
                      value={form.trigger_event}
                      onValueChange={(v) => setForm({ ...form, trigger_event: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select trigger event..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(TRIGGER_EVENTS_BY_MODULE[form.trigger_module] || []).map((ev) => (
                          <SelectItem key={ev.value} value={ev.value}>
                            {ev.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Conditions for stage_change */}
                {form.trigger_event === "stage_change" && (
                  <div className="grid gap-3 p-3 rounded-md border border-border/50 bg-muted/20">
                    <Label className="text-xs font-medium text-muted-foreground">Conditions</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="grid gap-1">
                        <Label className="text-xs">From Stage</Label>
                        <Input
                          className="h-8 text-xs"
                          placeholder="Any (*)"
                          value={(form.trigger_conditions.from as string) || ""}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              trigger_conditions: { ...form.trigger_conditions, field: "stage", from: e.target.value },
                            })
                          }
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">To Stage</Label>
                        <Input
                          className="h-8 text-xs"
                          placeholder="e.g., Appointment Booked"
                          value={(form.trigger_conditions.to as string) || ""}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              trigger_conditions: { ...form.trigger_conditions, field: "stage", to: e.target.value },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Time-based config */}
                {form.trigger_event === "time_based" && (
                  <div className="grid gap-3 p-3 rounded-md border border-border/50 bg-muted/20">
                    <Label className="text-xs font-medium text-muted-foreground">Schedule</Label>
                    <div className="grid gap-2">
                      <Select
                        value={form.schedule_type}
                        onValueChange={(v) => setForm({ ...form, schedule_type: v })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Schedule type..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="delay_after_event">Delay after event</SelectItem>
                          <SelectItem value="specific_time">At specific time relative to field</SelectItem>
                          <SelectItem value="recurring">Recurring</SelectItem>
                        </SelectContent>
                      </Select>
                      {form.schedule_type === "delay_after_event" && (
                        <div className="flex gap-2">
                          <Input
                            className="h-8 text-xs flex-1"
                            type="number"
                            placeholder="Duration"
                            value={(form.schedule_config.delay_minutes as number) || ""}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                schedule_config: { ...form.schedule_config, delay_minutes: parseInt(e.target.value) || 0 },
                              })
                            }
                          />
                          <span className="text-xs text-muted-foreground self-center">minutes</span>
                        </div>
                      )}
                      {form.schedule_type === "specific_time" && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="grid gap-1">
                            <Label className="text-xs">Date Field</Label>
                            <Input
                              className="h-8 text-xs"
                              placeholder="e.g., install_date"
                              value={(form.schedule_config.field as string) || ""}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  schedule_config: { ...form.schedule_config, field: e.target.value },
                                })
                              }
                            />
                          </div>
                          <div className="grid gap-1">
                            <Label className="text-xs">Offset (days)</Label>
                            <Input
                              className="h-8 text-xs"
                              type="number"
                              placeholder="e.g., -2 for 2 days before"
                              value={(form.schedule_config.offset_days as number) ?? ""}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  schedule_config: { ...form.schedule_config, offset_days: parseInt(e.target.value) || 0 },
                                })
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Generic field conditions for update events */}
                {form.trigger_event === "update" && (
                  <div className="grid gap-3 p-3 rounded-md border border-border/50 bg-muted/20">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Conditions (optional — leave blank to trigger on any update)
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="grid gap-1">
                        <Label className="text-xs">Field</Label>
                        <Input
                          className="h-8 text-xs"
                          placeholder="e.g., status"
                          value={(form.trigger_conditions.field as string) || ""}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              trigger_conditions: { ...form.trigger_conditions, field: e.target.value },
                            })
                          }
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">Operator</Label>
                        <Select
                          value={(form.trigger_conditions.operator as string) || "equals"}
                          onValueChange={(v) =>
                            setForm({
                              ...form,
                              trigger_conditions: { ...form.trigger_conditions, operator: v },
                            })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="equals">Equals</SelectItem>
                            <SelectItem value="not_equals">Not equals</SelectItem>
                            <SelectItem value="contains">Contains</SelectItem>
                            <SelectItem value="changed_to">Changed to</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">Value</Label>
                        <Input
                          className="h-8 text-xs"
                          placeholder="Value"
                          value={(form.trigger_conditions.value as string) || ""}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              trigger_conditions: { ...form.trigger_conditions, value: e.target.value },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Step 3: Actions ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">3</div>
                Actions
              </div>
              <div className="pl-8 space-y-3">
                {form.actions.length === 0 && (
                  <p className="text-xs text-muted-foreground py-2">
                    No actions added yet. Add at least one action below.
                  </p>
                )}

                {form.actions.map((action, idx) => {
                  const ActionIcon = getActionIcon(action.type)
                  return (
                    <div key={idx} className="space-y-2">
                      {idx > 0 && (
                        <div className="flex items-center gap-2 py-1">
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Then</span>
                        </div>
                      )}
                      <div className="border border-border rounded-lg p-3 space-y-3 bg-card">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                            <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center">
                              <ActionIcon className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <span className="text-sm font-medium">{getActionLabel(action.type)}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeAction(idx)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <ActionConfigForm
                          action={action}
                          onChange={(config) => updateActionConfig(idx, config)}
                        />
                      </div>
                    </div>
                  )
                })}

                {/* Add action buttons */}
                <div className="pt-2">
                  <Label className="text-xs text-muted-foreground mb-2 block">Add Action</Label>
                  <div className="flex flex-wrap gap-2">
                    {ACTION_TYPES.map((at) => (
                      <Button
                        key={at.value}
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5"
                        onClick={() => addAction(at.value)}
                      >
                        <at.icon className="h-3.5 w-3.5" />
                        {at.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Enable toggle ── */}
            <div className="flex items-center justify-between pl-8 py-2 border-t border-border">
              <div>
                <p className="font-medium text-sm">Enable Workflow</p>
                <p className="text-xs text-muted-foreground">
                  Start running this automation immediately
                </p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            {editingId && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  handleDelete(editingId)
                  setDialogOpen(false)
                }}
                disabled={deletingId === editingId}
                className="mr-auto"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <MessageSquare className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingId ? (
                "Save Changes"
              ) : (
                "Create Workflow"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
