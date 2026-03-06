"use client"

import * as React from "react"
import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { WebsiteScoreBadge, WebsiteScoreText } from "@/components/ui/website-score-badge"
import { getWebsiteScore } from "@/lib/utils/website-score"
import {
  Plus,
  Search,
  Filter,
  MapPin,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  Phone,
  ExternalLink,
  Globe,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useJobs, useJobStages, useTransitionJobStage, useUsers, useCurrentUser, useUpdateJob } from "@/lib/api/hooks"
import { canViewAllJobs } from "@/lib/auth/permissions"
import { VERTICALS } from "@/lib/api/types"
import type { Job, JobStage } from "@/lib/api/types"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  closestCenter,
  useDroppable,
  MeasuringStrategy,
} from "@dnd-kit/core"
import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import dynamic from "next/dynamic"
import { JobFormDialog } from "@/components/forms/job-form-dialog"
import { TagPills } from "@/components/jobs/tag-editor"
import { LazyRender } from "@/components/ui/lazy-render"

// Lazy load the heavy preview panel - 993 lines, only needed when user clicks preview
const JobQuickPreviewPanel = dynamic(
  () => import("@/components/jobs/job-quick-preview-panel").then(mod => ({ default: mod.JobQuickPreviewPanel })),
  { 
    ssr: false,
    loading: () => null // No loading state - panel slides in anyway
  }
)

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value)

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Lead type badge component
function LeadTypeBadge({ type }: { type: string | null | undefined }) {
  if (!type) return null
  const config: Record<string, { bg: string; text: string }> = {
    'BOS': { bg: 'bg-blue-500/20 border-blue-500/30', text: 'text-blue-400' },
    'Website': { bg: 'bg-emerald-500/20 border-emerald-500/30', text: 'text-emerald-400' },
    'Both': { bg: 'bg-purple-500/20 border-purple-500/30', text: 'text-purple-400' },
  }
  const c = config[type] || config['Website']
  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[0.6rem] font-medium border", c.bg, c.text)}>
      {type}
    </span>
  )
}

// Vertical badge component
function VerticalBadge({ vertical }: { vertical: string | null | undefined }) {
  if (!vertical) return null
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[0.6rem] font-medium border bg-cyan-500/15 border-cyan-500/25 text-cyan-400 truncate max-w-[100px]">
      {vertical}
    </span>
  )
}

function JobBoardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Session 73 - Get current user for role-based permissions
  const { data: currentUser } = useCurrentUser()
  const currentUserId = currentUser?.user?.id
  const currentUserRole = currentUser?.user?.role
  const canSeeAllJobs = canViewAllJobs(currentUserRole || null)

  // Filter state (initialized from URL)
  const [searchQuery, setSearchQuery] = React.useState(searchParams.get('search') || "")
  const [selectedStageIds, setSelectedStageIds] = React.useState<string[]>(
    searchParams.get('stage_ids')?.split(',').filter(Boolean) || []
  )
  // Region filter — persisted in localStorage
  const [regionFilter, setRegionFilter] = React.useState<'UK' | 'US' | 'All'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('pipelineRegionFilter') as 'UK' | 'US' | 'All') || 'All'
    }
    return 'All'
  })
  // Lead type filter
  const [leadTypeFilter, setLeadTypeFilter] = React.useState<string>("all")
  // Vertical filter
  const [verticalFilter, setVerticalFilter] = React.useState<string>("all")

  // Persist region filter
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pipelineRegionFilter', regionFilter)
    }
  }, [regionFilter])

  const [selectedAssignee, setSelectedAssignee] = React.useState(() => {
    const urlAssignee = searchParams.get('assigned_to')
    if (urlAssignee) return urlAssignee
    if (currentUserId && !canSeeAllJobs) return currentUserId
    return "all"
  })
  const [showFilters, setShowFilters] = React.useState(false)
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [jobDialogOpen, setJobDialogOpen] = React.useState(false)

  // Quick Preview state (Session 69)
  const [previewJobId, setPreviewJobId] = React.useState<string | null>(null)

  // View mode state (persisted in localStorage, not URL)
  const [viewMode, setViewMode] = React.useState<'standard' | 'compact' | 'micro'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('jobBoardViewMode') as 'standard' | 'compact' | 'micro') || 'standard'
    }
    return 'standard'
  })

  // Persist view mode to localStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('jobBoardViewMode', viewMode)
    }
  }, [viewMode])

  // Force compact mode on mobile for better UX
  const [isMobile, setIsMobile] = React.useState(false)
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  // Use compact on mobile, user preference on desktop
  const effectiveViewMode = isMobile ? 'compact' : viewMode

  // Session 73 - Enforce assignee filter for non-admins when user data loads
  React.useEffect(() => {
    if (currentUserId && !canSeeAllJobs && selectedAssignee !== currentUserId) {
      setSelectedAssignee(currentUserId)
    }
  }, [currentUserId, canSeeAllJobs, selectedAssignee])

  // Debounce search query
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Build API params from filters
  const limit = 999
  const apiParams = React.useMemo(() => {
    const params: Record<string, string | number> = { page: 1, limit }
    if (debouncedSearch) params.search = debouncedSearch
    if (selectedStageIds.length > 0) params.stage_ids = selectedStageIds.join(',')
    if (selectedAssignee && selectedAssignee !== "all") params.assigned_to = selectedAssignee
    return params
  }, [limit, debouncedSearch, selectedStageIds, selectedAssignee])

  // Update URL when filters change
  React.useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (selectedStageIds.length > 0) params.set('stage_ids', selectedStageIds.join(','))
    if (selectedAssignee && selectedAssignee !== "all") params.set('assigned_to', selectedAssignee)

    const newUrl = params.toString() ? `/jobs?${params.toString()}` : '/jobs'
    router.replace(newUrl, { scroll: false })
  }, [debouncedSearch, selectedStageIds, selectedAssignee, router])

  const { data: jobsResponse, isLoading: jobsLoading, error: _jobsError } = useJobs(apiParams)
  const { data: stages = [], isLoading: stagesLoading, error: _stagesError } = useJobStages()
  const { data: users = [] } = useUsers()
  const transitionJobStage = useTransitionJobStage()

  const allJobs = jobsResponse?.data || []

  // Apply client-side region, lead type, and vertical filters
  const jobs = React.useMemo(() => {
    let filtered = allJobs
    if (regionFilter !== 'All') {
      filtered = filtered.filter(j => (j.region || 'UK') === regionFilter)
    }
    if (leadTypeFilter !== 'all') {
      filtered = filtered.filter(j => (j.lead_type || 'Website') === leadTypeFilter)
    }
    if (verticalFilter !== 'all') {
      filtered = filtered.filter(j => j.vertical === verticalFilter)
    }
    return filtered
  }, [allJobs, regionFilter, leadTypeFilter, verticalFilter])

  const pagination = jobsResponse?.meta?.pagination

  // Filter handlers
  const toggleStageFilter = (stageId: string) => {
    setSelectedStageIds(prev =>
      prev.includes(stageId)
        ? prev.filter(id => id !== stageId)
        : [...prev, stageId]
    )
  }

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedStageIds([])
    setSelectedAssignee(canSeeAllJobs ? "all" : (currentUserId || "all"))
    setLeadTypeFilter("all")
    setVerticalFilter("all")
  }

  const hasActiveFilters = searchQuery || selectedStageIds.length > 0 || (selectedAssignee && selectedAssignee !== "all") || leadTypeFilter !== "all" || verticalFilter !== "all"

  // Quick Preview handlers (Session 69)
  const handleOpenPreview = (jobId: string) => {
    setPreviewJobId(jobId)
  }

  const handleClosePreview = () => {
    setPreviewJobId(null)
  }

  // Region counts
  const regionCounts = React.useMemo(() => {
    const uk = allJobs.filter(j => (j.region || 'UK') === 'UK').length
    const us = allJobs.filter(j => (j.region || 'UK') === 'US').length
    return { uk, us, all: allJobs.length }
  }, [allJobs])

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
        tolerance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: (event, { currentCoordinates }) => {
        const offset = 20
        switch (event.code) {
          case 'ArrowRight':
            return { ...currentCoordinates, x: currentCoordinates.x + offset }
          case 'ArrowLeft':
            return { ...currentCoordinates, x: currentCoordinates.x - offset }
          case 'ArrowDown':
            return { ...currentCoordinates, y: currentCoordinates.y + offset }
          case 'ArrowUp':
            return { ...currentCoordinates, y: currentCoordinates.y - offset }
        }
        return undefined
      },
    })
  )

  const measuringConfig = {
    droppable: {
      strategy: MeasuringStrategy.Always,
    },
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const jobId = active.id as string
    const targetStageId = over.id as string

    const job = jobs.find((j) => j.id === jobId)
    if (!job) return

    if (job.current_stage_id === targetStageId) return

    transitionJobStage.mutate({
      jobId,
      toStageId: targetStageId,
      notes: "Stage changed via drag-and-drop",
    })
  }

  const activeJob = activeId ? jobs.find((j) => j.id === activeId) : null

  return (
    <>
      {/* Subtle page background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-white/[0.04] to-blue-50/30 pointer-events-none" />
      
      <div className="relative flex flex-col h-[calc(100dvh-8rem)] md:h-[calc(100dvh-7rem)]">
        {/* Header with depth */}
        <div className="flex flex-col gap-2 pb-3 mb-2 border-b border-white/[0.08] flex-shrink-0">
          {/* Top row: Title + actions */}
          <div className="flex flex-col gap-2">
            {/* Row 1: Title + Region Toggle + New Job button */}
            <div className="flex items-center gap-3">
              <h1 className="text-lg md:text-xl font-bold text-white tracking-tight shrink-0">
                Pipeline
              </h1>
              
              {/* Region Toggle — UK | US | All */}
              <div className="flex border border-white/[0.12] rounded-lg overflow-hidden" data-testid="region-toggle">
                {(['UK', 'US', 'All'] as const).map((region) => (
                  <button
                    key={region}
                    className={cn(
                      "px-3 py-1.5 text-xs font-semibold transition-all duration-150",
                      regionFilter === region
                        ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                        : "text-white/50 hover:text-white/80 hover:bg-white/[0.06]"
                    )}
                    onClick={() => setRegionFilter(region)}
                  >
                    {region}
                    <span className="ml-1 text-[0.6rem] opacity-70">
                      {region === 'UK' ? regionCounts.uk : region === 'US' ? regionCounts.us : regionCounts.all}
                    </span>
                  </button>
                ))}
              </div>

              {/* Admin User Selector */}
              {canSeeAllJobs && (
                <Select
                  value={selectedAssignee}
                  onValueChange={(value) => {
                    setSelectedAssignee(value)
                  }}
                >
                  <SelectTrigger className="h-9 md:h-7 w-auto min-w-[120px] md:min-w-[160px] text-xs bg-muted/50 border-primary/20">
                    <span className="text-muted-foreground mr-1 hidden sm:inline">Viewing:</span>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Team</SelectItem>
                    {currentUserId && (
                      <SelectItem value={currentUserId}>My Pipeline</SelectItem>
                    )}
                    {users.filter(u => u.user_id !== currentUserId).map((user) => (
                      <SelectItem key={user.user_id} value={user.user_id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="flex-1" />
              
              {/* New Job - Always visible */}
              <Button 
                className={cn(
                  "gap-1.5 h-9 md:h-8 text-xs shrink-0",
                  "bg-gradient-to-b from-slate-800 to-slate-900",
                  "hover:from-slate-700 hover:to-slate-800",
                  "shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.1)]",
                  "border border-slate-700",
                )}
                onClick={() => setJobDialogOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New Job</span>
              </Button>
              
              {/* View Mode Toggle - Hidden on mobile */}
              <div className="hidden md:flex border border-border rounded-md overflow-hidden" data-testid="jobs-view-toggle">
                <button
                  className={cn(
                    "px-2 py-1 text-xs font-medium transition-colors",
                    viewMode === 'standard'
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setViewMode('standard')}
                >
                  Standard
                </button>
                <button
                  className={cn(
                    "px-2 py-1 text-xs font-medium transition-colors border-l border-border",
                    viewMode === 'compact'
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setViewMode('compact')}
                >
                  Compact
                </button>
                <button
                  className={cn(
                    "px-2 py-1 text-xs font-medium transition-colors border-l border-border",
                    viewMode === 'micro'
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setViewMode('micro')}
                >
                  Micro
                </button>
              </div>
            </div>
            
            {/* Row 2: Search + Filter */}
            <div className="flex items-center gap-2">
              {/* Search - Full width on mobile */}
              <div className="relative flex-1 md:flex-none md:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search..."
                  className="pl-8 h-9 md:h-7 text-sm md:text-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="jobs-search-input"
                />
              </div>
              
              {/* Lead Type Filter */}
              <Select value={leadTypeFilter} onValueChange={setLeadTypeFilter}>
                <SelectTrigger className="h-9 md:h-7 w-auto min-w-[90px] text-xs">
                  <SelectValue placeholder="Lead Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="BOS">BOS</SelectItem>
                  <SelectItem value="Website">Website</SelectItem>
                  <SelectItem value="Both">Both</SelectItem>
                </SelectContent>
              </Select>

              {/* Vertical Filter */}
              <Select value={verticalFilter} onValueChange={setVerticalFilter}>
                <SelectTrigger className="h-9 md:h-7 w-auto min-w-[100px] text-xs hidden sm:flex">
                  <SelectValue placeholder="Vertical" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Verticals</SelectItem>
                  {VERTICALS.map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Filter button */}
              <Button
                variant="outline"
                size="sm"
                className="gap-1 h-9 md:h-7 text-xs shrink-0"
                onClick={() => setShowFilters(!showFilters)}
                data-testid="jobs-filters-button"
              >
                <Filter className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Filters</span>
                {hasActiveFilters && (
                  <Badge variant="default" className="ml-1 h-4 px-1 text-[0.6rem]">
                    {(selectedStageIds.length > 0 ? 1 : 0) + (searchQuery ? 1 : 0) + (leadTypeFilter !== 'all' ? 1 : 0) + (verticalFilter !== 'all' ? 1 : 0)}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Filter Panel - Glass morphism */}
        {showFilters && (
          <Card className={cn(
            "p-4 mb-2",
            "bg-gradient-to-b from-white/[0.04] to-white/[0.02]",
            "backdrop-blur-sm",
            "border border-white/[0.08]",
            "shadow-[0_4px_12px_-4px_rgba(0,0,0,0.3)]",
            "rounded-xl"
          )} data-testid="jobs-filter-bar">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-white/90">Filters</h3>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-7 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>

              {/* Stage Filters */}
              <div className="space-y-2" data-testid="jobs-stage-filter">
                <Label className="text-xs font-medium text-muted-foreground">Stages</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {stages.map((stage) => (
                    <div key={stage.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`stage-${stage.id}`}
                        checked={selectedStageIds.includes(stage.id)}
                        onCheckedChange={() => toggleStageFilter(stage.id)}
                      />
                      <Label
                        htmlFor={`stage-${stage.id}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {stage.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vertical Filter (mobile - visible in filter panel) */}
              <div className="space-y-2 sm:hidden">
                <Label className="text-xs font-medium text-muted-foreground">Vertical</Label>
                <Select value={verticalFilter} onValueChange={setVerticalFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="All Verticals" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Verticals</SelectItem>
                    {VERTICALS.map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        )}

        <JobFormDialog open={jobDialogOpen} onOpenChange={setJobDialogOpen} />

        {/* Kanban Board - Full Height */}
        <div className="flex-1 flex flex-col min-h-0">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            measuring={measuringConfig}
          >
            <div className={cn(
              "flex-1 flex overflow-x-auto pt-2 md:pt-3 px-1 md:px-0",
              "snap-x snap-mandatory md:snap-none",
              "-webkit-overflow-scrolling-touch",
              viewMode === 'micro' ? 'gap-1' : viewMode === 'compact' ? 'gap-1.5 md:gap-2' : 'gap-2 md:gap-3'
            )}>
              {stagesLoading || jobsLoading ? (
                <>
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className={cn(
                      "flex-shrink-0",
                      viewMode === 'micro' ? 'w-36' : viewMode === 'compact' ? 'w-48' : 'w-72'
                    )}>
                      <div className="h-32 bg-muted animate-pulse rounded-lg" />
                    </div>
                  ))}
                </>
              ) : (
                stages.map((stage) => (
                  <KanbanColumn
                    key={stage.id}
                    stage={stage}
                    jobs={jobs.filter((job) => job.current_stage_id === stage.id)}
                    viewMode={effectiveViewMode}
                    onQuickPreview={handleOpenPreview}
                  />
                ))
              )}
            </div>
            <DragOverlay
              dropAnimation={{
                duration: 200,
                easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
              }}
            >
              {activeJob ? (
                <div className="animate-in zoom-in-95 duration-150">
                  <JobCard job={activeJob} isDragging viewMode={effectiveViewMode} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>

        {/* Quick Preview Panel - Session 69 */}
        <JobQuickPreviewPanel
          jobId={previewJobId}
          onClose={handleClosePreview}
        />
      </div>
    </>
  )
}

function KanbanColumn({ stage, jobs, viewMode, onQuickPreview }: { stage: JobStage; jobs: Job[]; viewMode: 'standard' | 'compact' | 'micro'; onQuickPreview?: (jobId: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  })

  const colorGradients = {
    0: "from-slate-500/[0.12] to-slate-500/[0.06] border-slate-400/20",
    1: "from-blue-500/[0.12] to-blue-500/[0.06] border-blue-400/20",
    2: "from-teal-500/[0.12] to-teal-500/[0.06] border-teal-400/20",
    3: "from-emerald-500/[0.12] to-emerald-500/[0.06] border-emerald-400/20",
    4: "from-violet-500/[0.12] to-violet-500/[0.06] border-violet-400/20",
  }

  const colorIndex = (stage.position % 5) as keyof typeof colorGradients
  const totalValue = jobs.reduce((sum, job) => sum + (job.estimated_value || 0), 0)

  return (
    <div
      data-testid="kanban-column"
      className={cn(
        "flex-shrink-0 flex flex-col h-full snap-center",
        viewMode === 'micro' ? 'w-[85vw] md:w-40' :
        viewMode === 'compact' ? 'w-[85vw] md:w-52' :
        'w-[85vw] md:w-72'
      )}
    >
      {/* Column Header */}
      <div className={cn(
        "rounded-t-xl flex-shrink-0 sticky top-0 z-10",
        "bg-gradient-to-b backdrop-blur-sm",
        "border-t-2 border-x border-white/[0.08]",
        "shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)]",
        colorGradients[colorIndex],
        viewMode === 'micro' ? 'p-1.5' : viewMode === 'compact' ? 'p-2' : 'p-3'
      )}>
        <div className={cn("flex items-center justify-between", viewMode === 'micro' ? 'mb-0.5' : 'mb-1.5')}>
          <h3 className={cn(
            "font-semibold text-white/90 truncate",
            viewMode === 'micro' ? 'text-[0.6rem]' : viewMode === 'compact' ? 'text-xs' : 'text-sm'
          )}>{stage.name}</h3>
          <span className={cn(
            "font-bold text-white/85 bg-white/[0.08] rounded-md shadow-sm shrink-0 ml-1",
            viewMode === 'micro' ? 'text-[0.55rem] px-1 py-0' : viewMode === 'compact' ? 'text-[0.65rem] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'
          )}>{jobs.length}</span>
        </div>
        <div className={cn(
          "text-white/50 font-medium tabular-nums",
          viewMode === 'micro' ? 'text-[0.55rem]' : viewMode === 'compact' ? 'text-[0.6rem]' : 'text-xs'
        )}>
          £{(totalValue / 1000).toFixed(1)}k
        </div>
      </div>

      {/* Job Cards Container */}
      <div
        ref={setNodeRef}
        data-stage={stage.id}
        className={cn(
          "flex-1 overflow-y-auto rounded-b-xl kanban-column",
          "bg-gradient-to-b from-white/[0.04] to-white/[0.02]",
          "backdrop-blur-sm",
          "border-x border-b border-white/[0.08]",
          "shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.15)]",
          "transition-all duration-200 ease-out",
          isOver && "bg-blue-500/[0.08] ring-2 ring-blue-400/50 ring-inset",
          viewMode === 'micro' ? 'space-y-0.5 p-1' : viewMode === 'compact' ? 'space-y-1 p-1.5' : 'space-y-2.5 p-2.5'
        )}
        style={{ scrollBehavior: 'smooth' }}
      >
        {jobs.map((job, index) => {
          const immediate = index < 5
          return (
            <LazyRender
              key={job.id}
              immediate={immediate}
              minHeight={viewMode === 'micro' ? 36 : viewMode === 'compact' ? 56 : 90}
              rootMargin="100px"
            >
              <JobCard job={job} viewMode={viewMode} onQuickPreview={onQuickPreview} />
            </LazyRender>
          )
        })}
        {jobs.length === 0 && (
          <div className={cn(
            "flex items-center justify-center h-24 text-muted-foreground",
            viewMode === 'micro' ? 'text-[0.6rem]' : viewMode === 'compact' ? 'text-xs' : 'text-sm'
          )}>
            {isOver ? "Drop here" : "No jobs"}
          </div>
        )}
      </div>
    </div>
  )
}

const JobCard = React.memo(function JobCard({ job, isDragging = false, viewMode = 'standard', onQuickPreview }: { job: Job; isDragging?: boolean; viewMode?: 'standard' | 'compact' | 'micro'; onQuickPreview?: (jobId: string) => void }) {
  const router = useRouter()
  const { attributes, listeners, setNodeRef, transform, isDragging: isDraggingState } = useDraggable({
    id: job.id,
  })

  const hasHotTag = job.tags?.includes("HOT")
  const hasCallbackTag = job.tags?.includes("CALLBACK_REQUIRED")

  const stageChangedDate = new Date(job.stage_changed_at)
  const now = new Date()
  const daysInStage = Math.floor((now.getTime() - stageChangedDate.getTime()) / (1000 * 60 * 60 * 24))

  const style: React.CSSProperties = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    willChange: isDraggingState ? 'transform' : undefined,
    transition: isDraggingState ? undefined : 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1)',
    zIndex: isDraggingState ? 999 : undefined,
    touchAction: 'none',
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      data-job-id={job.id}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        if (!isDragging && !isDraggingState && !(e.target as HTMLElement).closest('button')) {
          router.push(`/jobs/${job.id}`)
        }
      }}
      className={cn(
        "cursor-pointer group job-card select-none",
        "bg-gradient-to-b from-white/[0.04] to-white/[0.02]",
        "border border-white/[0.08]",
        "shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.05)]",
        "transition-all duration-200 ease-out",
        "hover:shadow-[0_6px_16px_-4px_rgba(0,0,0,0.4)]",
        "hover:-translate-y-0.5",
        isDraggingState && "opacity-80 scale-105 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] ring-2 ring-blue-400/50 cursor-grabbing",
        isDragging && "shadow-[0_12px_32px_-8px_rgba(0,0,0,0.6)] scale-105 ring-2 ring-blue-400/50",
        viewMode === 'micro' ? 'p-1.5 rounded-md' : viewMode === 'compact' ? 'p-2 rounded-lg' : 'p-3 rounded-xl'
      )}
    >
      {/* ── MICRO / COMPACT: dense layout ── */}
      {(viewMode === 'micro' || viewMode === 'compact') ? (() => {
        const isMicro = viewMode === 'micro'
        const wsScore = getWebsiteScore(job)
        return (
          <div className={cn("space-y-0.5", isMicro ? 'text-[0.58rem]' : 'text-[0.65rem]')}>
            {/* Row 1: name + tags + value + days */}
            <div className="flex items-baseline gap-1 min-w-0">
              <h4 className="font-semibold leading-none truncate flex-1 min-w-0 group-hover:text-primary transition-colors">
                {job.customer?.name || "Unknown"}
              </h4>
              {hasHotTag && <span className="shrink-0 leading-none">🔥</span>}
              {hasCallbackTag && <span className="shrink-0 leading-none">📞</span>}
              <span className="font-semibold text-primary tabular-nums shrink-0 leading-none">
                £{job.estimated_value ? (job.estimated_value / 1000).toFixed(1) : 0}k
              </span>
              <span className="text-muted-foreground tabular-nums shrink-0 leading-none">{daysInStage}d</span>
            </div>
            {/* Row 2: lead type + vertical badges */}
            <div className="flex items-center gap-1 flex-wrap leading-none">
              <LeadTypeBadge type={job.lead_type} />
              <VerticalBadge vertical={job.vertical} />
              {job.region && job.region !== 'UK' && (
                <span className="inline-flex items-center px-1 py-0.5 rounded text-[0.55rem] font-medium border bg-amber-500/15 border-amber-500/25 text-amber-400">
                  {job.region}
                </span>
              )}
            </div>
            {/* Row 3: website score */}
            <div className="leading-none">
              {wsScore === 0 ? (
                <span className="font-medium text-red-400">No Website</span>
              ) : wsScore != null ? (
                <span className={cn("font-medium", wsScore >= 70 ? "text-emerald-400" : wsScore >= 40 ? "text-amber-400" : "text-red-400")}>
                  Website: {wsScore}/100
                </span>
              ) : (
                <span className="text-muted-foreground">No score</span>
              )}
            </div>
            {/* Row 4: call tracker badge */}
            <CallTrackerBadge job={job} size="compact" />
            {/* Row 4.5: tags */}
            <TagPills tags={job.tags} maxVisible={2} size="xs" />
            {/* Row 5: job number + postcode + links */}
            <div className="flex items-baseline gap-1 min-w-0 text-muted-foreground leading-none">
              <span className="font-mono shrink-0">{job.job_number}</span>
              {job.customer?.postcode && (
                <>
                  <span className="text-white/20 shrink-0">·</span>
                  <span className="truncate">{job.customer.postcode}</span>
                </>
              )}
              <span className="flex-1" />
              {(() => {
                const siteUrl = getWebsiteUrl(job)
                return siteUrl ? (
                  <a href={siteUrl} target="_blank" rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-cyan-400/70 hover:text-cyan-400 shrink-0" title={siteUrl}>
                    <Globe className="h-2.5 w-2.5 inline" />
                  </a>
                ) : null
              })()}
              <a href={getGoogleSearchUrl(job)} target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-white/30 hover:text-white/70 shrink-0" title="Google this company">
                🔍
              </a>
            </div>
          </div>
        )
      })() : (
        /* ── STANDARD layout ── */
        <div className="space-y-1.5">
          {/* Header */}
          <div className="flex items-start justify-between gap-1.5">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold group-hover:text-primary transition-colors leading-tight truncate text-sm">
                {job.customer?.name || "Unknown Customer"}
              </h4>
              <div className="text-muted-foreground mt-0.5 text-xs">
                <span className="font-mono">{job.job_number}</span>
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              {hasHotTag && <Badge variant="glow" className="text-xs h-5 px-1">🔥</Badge>}
              {hasCallbackTag && <Badge variant="warning" className="text-xs h-5 px-1">📞</Badge>}
              {onQuickPreview && (
                <Button variant="ghost" size="icon" className="shrink-0 h-5 w-5"
                  onClick={(e) => { e.stopPropagation(); onQuickPreview(job.id) }}
                  data-testid="job-quick-preview-button" aria-label="Open quick preview">
                  <Eye className="h-3 w-3 text-muted-foreground hover:text-primary" />
                </Button>
              )}
            </div>
          </div>
          {/* Lead Type + Vertical + Region badges */}
          <div className="flex items-center gap-1 flex-wrap">
            <LeadTypeBadge type={job.lead_type} />
            <VerticalBadge vertical={job.vertical} />
            {job.region && (
              <span className={cn(
                "inline-flex items-center px-1.5 py-0.5 rounded text-[0.6rem] font-medium border",
                job.region === 'US' ? "bg-amber-500/15 border-amber-500/25 text-amber-400" : "bg-slate-500/15 border-slate-500/25 text-slate-400"
              )}>
                {job.region}
              </span>
            )}
          </div>
          {/* Stats */}
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="font-semibold text-primary">
                £{job.estimated_value ? (job.estimated_value / 1000).toFixed(1) : 0}k
              </span>
              {job.estimated_deal_value && (
                <span className="text-emerald-400 text-xs ml-1.5">
                  (Deal: £{(job.estimated_deal_value / 1000).toFixed(1)}k)
                </span>
              )}
            </div>
            <span className="text-muted-foreground text-xs">{daysInStage}d</span>
          </div>
          {/* Website Score */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground">Website:</span>
            {(() => {
              const wsScore = getWebsiteScore(job)
              if (wsScore === 0) return <span className="font-semibold text-red-400">No Website</span>
              if (wsScore != null) return <WebsiteScoreBadge score={wsScore} size="sm" />
              return <span className="text-muted-foreground">No score</span>
            })()}
          </div>
          {/* Call Tracker */}
          <div className="flex items-center justify-between gap-1 text-xs">
            <CallTrackerBadge job={job} size="standard" />
            <Button variant="ghost" size="icon" className="shrink-0 h-5 w-5"
              onClick={(e) => { e.stopPropagation(); router.push(`/jobs/${job.id}`) }} title="View full job">
              <FileText className="h-3 w-3 text-muted-foreground hover:text-primary" />
            </Button>
          </div>
          {/* Tags */}
          <TagPills tags={job.tags} maxVisible={3} size="sm" />
          {/* Postcode + Links */}
          <div className="flex items-center gap-1.5 text-xs">
            {job.customer?.postcode && (
              <div className="flex items-center gap-1 rounded-md bg-muted px-1.5 py-1">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span>{job.customer.postcode}</span>
              </div>
            )}
            <span className="flex-1" />
            {(() => {
              const siteUrl = getWebsiteUrl(job)
              return siteUrl ? (
                <a href={siteUrl} target="_blank" rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-0.5 text-cyan-400/70 hover:text-cyan-400 transition-colors"
                  title={siteUrl}>
                  <Globe className="h-3 w-3" />
                  <span className="text-[0.65rem]">Site</span>
                </a>
              ) : null
            })()}
            <a href={getGoogleSearchUrl(job)} target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-0.5 text-white/40 hover:text-white/80 transition-colors"
              title="Google this company">
              <Search className="h-3 w-3" />
              <span className="text-[0.65rem]">Google</span>
            </a>
          </div>
        </div>
      )}
    </Card>
  )
})

JobCard.displayName = 'JobCard'

// Extract website URL from job metadata or notes
function getWebsiteUrl(job: Job): string | null {
  const meta = job.metadata as Record<string, unknown> | null
  if (meta?.website_url && typeof meta.website_url === 'string') return meta.website_url
  if (meta?.website && typeof meta.website === 'string') return meta.website
  if (job.notes) {
    const urlMatch = job.notes.match(/(?:website_url|website|url)\s*[:\-=]\s*(https?:\/\/\S+)/i)
    if (urlMatch) return urlMatch[1]
    const bareUrl = job.notes.match(/(https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b[-a-zA-Z0-9()@:%_+.~#?&/=]*)/i)
    if (bareUrl) return bareUrl[1]
  }
  return null
}

function getGoogleSearchUrl(job: Job): string {
  const parts: string[] = []
  if (job.customer?.name) parts.push(job.customer.name)
  if (job.customer?.city) parts.push(job.customer.city)
  else if (job.customer?.postcode) parts.push(job.customer.postcode)
  return `https://www.google.com/search?q=${encodeURIComponent(parts.join(' '))}`
}

const CALL_STATES = ['not_called', 'called_1', 'called_2', 'called_3', 'called_4', 'called_5', 'uncontactable'] as const
type CallState = typeof CALL_STATES[number]

function getCallState(job: Job): CallState {
  const meta = job.metadata as Record<string, unknown> | null
  const state = meta?.call_status as string | undefined
  if (state && CALL_STATES.includes(state as CallState)) return state as CallState
  return 'not_called'
}

function getCallBadgeConfig(state: CallState): { label: string; className: string } {
  switch (state) {
    case 'not_called': return { label: 'Not Called', className: 'bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30' }
    case 'called_1': return { label: 'Called x1', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30' }
    case 'called_2': return { label: 'Called x2', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30' }
    case 'called_3': return { label: 'Called x3', className: 'bg-orange-600/20 text-orange-400 border-orange-600/30 hover:bg-orange-600/30' }
    case 'called_4': return { label: 'Called x4', className: 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30' }
    case 'called_5': return { label: 'Called x5', className: 'bg-red-600/20 text-red-400 border-red-600/30 hover:bg-red-600/30' }
    case 'uncontactable': return { label: 'Uncontactable', className: 'bg-red-900/30 text-red-300 border-red-800/40 hover:bg-red-900/40' }
  }
}

function CallTrackerBadge({ job, size = 'standard' }: { job: Job; size?: 'standard' | 'compact' }) {
  const updateJob = useUpdateJob()
  const callState = getCallState(job)
  const config = getCallBadgeConfig(callState)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const currentIndex = CALL_STATES.indexOf(callState)
    const nextIndex = (currentIndex + 1) % CALL_STATES.length
    const nextState = CALL_STATES[nextIndex]
    const existingMeta = (job.metadata as Record<string, unknown>) || {}
    updateJob.mutate({
      id: job.id,
      metadata: { ...existingMeta, call_status: nextState },
    } as Parameters<typeof updateJob.mutate>[0])
  }

  if (size === 'compact') {
    return (
      <button
        onClick={handleClick}
        className={cn(
          "inline-flex items-center gap-0.5 leading-none font-medium rounded px-1 py-0.5 border cursor-pointer transition-colors text-inherit",
          config.className
        )}
        title="Click to cycle call status"
      >
        <Phone className="h-2.5 w-2.5" />
        {config.label}
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-1 text-xs h-5 px-1.5 rounded-md border cursor-pointer transition-colors font-medium",
        config.className
      )}
      title="Click to cycle call status"
    >
      <Phone className="h-3 w-3" />
      {config.label}
    </button>
  )
}

export default function JobBoardPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    }>
      <JobBoardContent />
    </Suspense>
  )
}
