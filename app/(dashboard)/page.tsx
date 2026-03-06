"use client"

import * as React from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  ArrowUpRight,
  ArrowRight,
} from "lucide-react"
import { useJobs, useTasks, useJobStages, useTenantAnalyticsOverview, useDBRAnalyticsOverview, useTodaysCallLogs } from "@/lib/api/hooks"
import { useAuth } from "@/lib/auth/auth-provider"
import { JobFormDialog } from "@/components/forms/job-form-dialog"
import { OnboardingBanner } from "@/components/onboarding/onboarding-banner"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
  const { user } = useAuth()
  const [jobDialogOpen, setJobDialogOpen] = React.useState(false)
  const { data: jobsResponse, isLoading: jobsLoading } = useJobs()
  const { data: todaysTasks = [], isLoading: tasksLoading } = useTasks({ view: "today", limit: 4 })
  const { data: stages = [], isLoading: stagesLoading } = useJobStages()
  const { data: analytics, isLoading: analyticsLoading } = useTenantAnalyticsOverview()
  const { data: dbrAnalytics } = useDBRAnalyticsOverview()
  const { data: todaysCallLogs = [], isLoading: callLogsLoading } = useTodaysCallLogs()

  const jobs = React.useMemo(() => jobsResponse?.data || [], [jobsResponse?.data])
  const activeJobs = jobs.length
  const totalValue = jobs.reduce((sum, job) => sum + (job.estimated_value || 0), 0)

  // Pipeline value by region
  const ukValue = React.useMemo(() => jobs.filter(j => (j.region || 'UK') === 'UK').reduce((sum, j) => sum + (j.estimated_value || 0), 0), [jobs])
  const usValue = React.useMemo(() => jobs.filter(j => (j.region || 'UK') === 'US').reduce((sum, j) => sum + (j.estimated_value || 0), 0), [jobs])
  
  // Leads by vertical
  const verticalCounts = React.useMemo(() => {
    const counts: Record<string, number> = {}
    jobs.forEach(j => {
      if (j.vertical) {
        counts[j.vertical] = (counts[j.vertical] || 0) + 1
      }
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [jobs])

  // Group jobs by stage
  const jobsByStage = React.useMemo(() => {
    const grouped = new Map<string, typeof jobs>()
    jobs.forEach((job) => {
      const stageId = job.current_stage_id
      if (!grouped.has(stageId)) grouped.set(stageId, [])
      grouped.get(stageId)!.push(job)
    })
    return grouped
  }, [jobs])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 17) return "Good afternoon"
    return "Good evening"
  }

  const firstName = user?.full_name?.split(" ")[0] || "there"

  return (
    <>
      {/* Subtle page background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-white/[0.04] to-cyan-500/[0.03] pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto">
        {/* Header with depth */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.08]">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {getGreeting()}, {firstName}
            </h1>
            <p className="text-sm text-white/50 mt-1">
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <Button 
            onClick={() => setJobDialogOpen(true)}
            className={cn(
              "gap-2",
              "bg-gradient-to-b from-white/[0.12] to-white/[0.06]",
              "hover:from-white/[0.16] hover:to-white/[0.10]",
              "shadow-[0_2px_8px_-2px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.1)]",
              "hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.6)]",
              "border border-white/[0.12]",
              "transition-all duration-200"
            )}
          >
            <Plus className="h-4 w-4" />
            New Job
          </Button>
        </div>

        <JobFormDialog open={jobDialogOpen} onOpenChange={setJobDialogOpen} />
        <OnboardingBanner />

        {/* Stats Row - Compact Glass Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard 
            label="Pipeline Value" 
            value={`£${(totalValue / 1000).toFixed(0)}k`}
            loading={jobsLoading}
          />
          <StatCard 
            label="Active Jobs" 
            value={activeJobs.toString()}
            loading={jobsLoading}
          />
          <StatCard 
            label="Completed" 
            value={analytics?.jobs?.jobs_completed_last_30_days?.toString() || "0"}
            subtext="30 days"
            loading={analyticsLoading}
          />
          <StatCard 
            label="Communications" 
            value={((analytics?.communications?.emails_sent_last_30_days || 0) + (analytics?.communications?.sms_sent_last_30_days || 0)).toString()}
            subtext="sent"
            loading={analyticsLoading}
          />
        </div>

        {/* Main Grid - Compact */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Tasks + Today's Calls - 3 columns */}
          <div className="lg:col-span-3 space-y-4">
            {/* Today's Calls Widget */}
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-white">📞 Today&apos;s Calls</h2>
                <Badge variant="secondary" className="text-xs px-2 py-0.5 rounded-md">
                  {todaysCallLogs.length}
                </Badge>
              </div>
              
              {callLogsLoading ? (
                <div className="space-y-2">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="h-10 bg-white/[0.04] animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : todaysCallLogs.length > 0 ? (
                <div className="space-y-2">
                  {todaysCallLogs.slice(0, 4).map((log) => (
                    <Link key={log.id} href={`/jobs/${log.job_id}`}>
                      <div className={cn(
                        "flex items-center gap-3 p-2.5 rounded-xl",
                        "bg-white/[0.03] border border-white/[0.06]",
                        "hover:bg-white/[0.06] transition-all group cursor-pointer"
                      )}>
                        <div className="p-1.5 rounded-lg bg-cyan-500/10">
                          <Clock className="h-3.5 w-3.5 text-cyan-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-white/85 truncate block">
                            {log.next_action_description || 'Follow up call'}
                          </span>
                        </div>
                        {log.outcome && (
                          <span className="text-xs text-muted-foreground shrink-0">{log.outcome}</span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-6 text-center">
                  <div>
                    <p className="text-sm font-medium text-white/85">No calls due today</p>
                    <p className="text-xs text-white/50">Follow-ups will appear here</p>
                  </div>
                </div>
              )}
            </GlassCard>

            {/* Today's Tasks */}
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-white">Today&apos;s Tasks</h2>
                <Badge variant="secondary" className="text-xs px-2 py-0.5 rounded-md">
                  {todaysTasks.length}
                </Badge>
              </div>
              
              {tasksLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 bg-white/[0.04] animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : todaysTasks.length > 0 ? (
                <div className="space-y-2">
                  {todaysTasks.slice(0, 4).map((task) => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-center">
                  <div>
                    <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    </div>
                    <p className="text-sm font-medium text-white/85">All clear</p>
                    <p className="text-xs text-white/50">No tasks due today</p>
                  </div>
                </div>
              )}
            </GlassCard>
          </div>

          {/* Pipeline + Region Split - 2 columns */}
          <div className="lg:col-span-2 space-y-4">
            {/* Pipeline Value by Region */}
            <GlassCard>
              <h2 className="text-sm font-semibold text-white mb-3">Pipeline by Region</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <div className="text-xs text-white/50 mb-1">🇬🇧 UK</div>
                  <div className="text-lg font-bold text-white tabular-nums">£{(ukValue / 1000).toFixed(0)}k</div>
                  <div className="text-xs text-white/40">{jobs.filter(j => (j.region || 'UK') === 'UK').length} leads</div>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <div className="text-xs text-white/50 mb-1">🇺🇸 US</div>
                  <div className="text-lg font-bold text-white tabular-nums">£{(usValue / 1000).toFixed(0)}k</div>
                  <div className="text-xs text-white/40">{jobs.filter(j => (j.region || 'UK') === 'US').length} leads</div>
                </div>
              </div>
            </GlassCard>

            {/* Leads by Vertical */}
            {verticalCounts.length > 0 && (
              <GlassCard>
                <h2 className="text-sm font-semibold text-white mb-3">Top Verticals</h2>
                <div className="space-y-2">
                  {verticalCounts.map(([vertical, count], idx) => {
                    const maxCount = verticalCounts[0]?.[1] || 1
                    return (
                      <div key={vertical} className="group p-1.5 rounded-lg hover:bg-white/[0.04] -mx-1.5">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-xs font-medium text-white/80 truncate">{vertical}</span>
                          <span className="text-xs font-bold text-white/90 bg-white/[0.08] px-1.5 py-0.5 rounded">{count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-cyan-600 transition-all duration-500"
                            style={{ width: `${Math.max((count / maxCount) * 100, 8)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </GlassCard>
            )}

            {/* Pipeline Stages */}
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-white">Pipeline</h2>
                <Link href="/jobs">
                  <Button variant="ghost" size="sm" className="h-6 text-xs text-white/50 hover:text-white gap-1 px-2">
                    View
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
              
              {stagesLoading || jobsLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-8 bg-white/[0.04] animate-pulse rounded" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {stages.slice(0, 5).map((stage, idx) => {
                    const stageJobs = jobsByStage.get(stage.id) || []
                    const stageValue = stageJobs.reduce((sum, job) => sum + (job.estimated_value || 0), 0)
                    const maxJobs = Math.max(...stages.map(s => (jobsByStage.get(s.id) || []).length), 1)
                    
                    return (
                      <PipelineRow
                        key={stage.id}
                        label={stage.name}
                        count={stageJobs.length}
                        value={stageValue}
                        progress={(stageJobs.length / maxJobs) * 100}
                        index={idx}
                      />
                    )
                  })}
                </div>
              )}
            </GlassCard>
          </div>
        </div>

        {/* Quick Links Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <QuickLink href="/jobs" label="Pipeline" />
          <QuickLink href="/customers" label="Customers" />
          <QuickLink href="/calendar" label="Calendar" />
          <QuickLink href="/communications" label="Communications" />
        </div>
      </div>
    </>
  )
}

// Glass Card with Depth
function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      "relative p-5 rounded-2xl",
      "bg-gradient-to-b from-white/[0.04] to-white/[0.02]",
      "backdrop-blur-xl",
      "border border-white/[0.08]",
      "shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3),0_0_0_1px_rgba(0,0,0,0.1)]",
      "hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.4),0_0_0_1px_rgba(0,0,0,0.12)]",
      "transition-all duration-300",
      className
    )}>
      {/* Inner highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      {children}
    </div>
  )
}

// Stat Card with Depth
function StatCard({ label, value, subtext, loading }: {
  label: string
  value: string
  subtext?: string
  loading?: boolean
}) {
  return (
    <div className={cn(
      "relative p-4 rounded-xl overflow-hidden",
      "bg-gradient-to-br from-white/[0.04] via-white/[0.04] to-white/[0.02]",
      "border border-white/[0.08]",
      "shadow-[0_2px_12px_-2px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.06)]",
      "hover:shadow-[0_4px_16px_-2px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.08)]",
      "hover:-translate-y-0.5",
      "transition-all duration-200",
    )}>
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/[0.02] pointer-events-none" />
      <div className="relative">
        {loading ? (
          <div className="h-7 w-16 bg-white/[0.06] animate-pulse rounded" />
        ) : (
          <p className="text-xl font-bold text-white tabular-nums tracking-tight">
            {value}
            {subtext && <span className="text-xs font-normal text-white/40 ml-1">{subtext}</span>}
          </p>
        )}
        <p className="text-xs font-medium text-white/50 mt-1">{label}</p>
      </div>
    </div>
  )
}

// Task Row with Depth
function TaskRow({ task }: {
  task: { id: string; title: string; due_date: string | null; status: string; priority: string }
}) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "completed"
  const isCompleted = task.status === "completed"

  const StatusIcon = isCompleted ? CheckCircle2 : isOverdue ? AlertCircle : Clock
  const statusColor = isCompleted ? "text-emerald-400" : isOverdue ? "text-red-400" : "text-white/40"
  const statusBg = isCompleted ? "bg-emerald-500/10" : isOverdue ? "bg-red-500/10" : "bg-white/[0.04]"

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-xl",
      "bg-white/[0.03]",
      "border border-white/[0.06]",
      "shadow-[0_1px_3px_0_rgba(0,0,0,0.1)]",
      "hover:bg-white/[0.06] hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.2)]",
      "hover:border-white/[0.10]",
      "transition-all duration-200 group cursor-pointer"
    )}>
      <div className={cn("p-1.5 rounded-lg", statusBg)}>
        <StatusIcon className={cn("h-3.5 w-3.5", statusColor)} />
      </div>
      <span className="text-sm font-medium text-white/85 flex-1 truncate group-hover:text-white">
        {task.title}
      </span>
      <span className={cn(
        "text-xs font-medium px-2 py-0.5 rounded-md",
        task.priority === "high" ? "bg-red-500/15 text-red-400" :
        task.priority === "medium" ? "bg-teal-500/15 text-teal-400" :
        "bg-white/[0.06] text-white/70"
      )}>
        {task.priority}
      </span>
    </div>
  )
}

// Pipeline Row with Depth
function PipelineRow({ label, count, value, progress, index }: {
  label: string
  count: number
  value: number
  progress: number
  index: number
}) {
  const colors = [
    "bg-gradient-to-r from-slate-400 to-slate-500",
    "bg-gradient-to-r from-blue-400 to-blue-600",
    "bg-gradient-to-r from-teal-400 to-teal-600",
    "bg-gradient-to-r from-emerald-400 to-emerald-600",
    "bg-gradient-to-r from-violet-400 to-violet-600"
  ]

  return (
    <div className="group p-2 rounded-lg hover:bg-white/[0.04] transition-colors -mx-2">
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="font-medium text-white/85 group-hover:text-white transition-colors truncate">
          {label}
        </span>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-white/40 tabular-nums">£{(value / 1000).toFixed(0)}k</span>
          <span className="text-xs font-bold text-white/90 bg-white/[0.08] px-1.5 py-0.5 rounded">{count}</span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden shadow-inner">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3)]",
            colors[index % colors.length]
          )}
          style={{ width: `${Math.max(progress, 6)}%` }}
        />
      </div>
    </div>
  )
}

// Quick Link with Depth
function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href}>
      <div className={cn(
        "relative p-3 rounded-xl text-center overflow-hidden",
        "bg-gradient-to-b from-white/[0.04] to-white/[0.02]",
        "border border-white/[0.08]",
        "shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.06)]",
        "hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.4)]",
        "hover:-translate-y-0.5",
        "transition-all duration-200 cursor-pointer group"
      )}>
        <span className="text-xs font-semibold text-white/70 group-hover:text-white">
          {label}
        </span>
        <ArrowUpRight className="h-3 w-3 text-white/40 group-hover:text-cyan-400 inline ml-1 transition-colors" />
      </div>
    </Link>
  )
}
