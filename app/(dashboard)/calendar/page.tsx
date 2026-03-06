"use client"

import * as React from "react"
import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { MetricCard } from "@/components/ui/metric-card"
import {
  Plus,
  MapPin,
  Phone,
  Calendar as CalendarIcon,
  Building2,
  PhoneCall,
  Wrench,
  X,
  Edit2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useAppointments } from "@/lib/api/hooks"
import type { Appointment } from "@/lib/api/types"
import { AppointmentFormDialog } from "@/components/forms/appointment-form-dialog"
import { WeekView } from "@/components/calendar/week-view"
import { MonthView } from "@/components/calendar/month-view"

const hours = Array.from({ length: 12 }, (_, i) => i + 8) // 8am to 8pm

type DateRangeFilter = "today" | "next7days" | "next30days" | "custom"

function CalendarContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const jobIdFromUrl = searchParams.get("job_id")

  const [currentDate, setCurrentDate] = React.useState(new Date())
  const [view, setView] = React.useState<"day" | "week" | "month">("day")

  // Navigation functions
  const navigatePrev = () => {
    const newDate = new Date(currentDate)
    if (view === "day") {
      newDate.setDate(newDate.getDate() - 1)
    } else if (view === "week") {
      newDate.setDate(newDate.getDate() - 7)
    } else {
      newDate.setMonth(newDate.getMonth() - 1)
    }
    setCurrentDate(newDate)
  }

  const navigateNext = () => {
    const newDate = new Date(currentDate)
    if (view === "day") {
      newDate.setDate(newDate.getDate() + 1)
    } else if (view === "week") {
      newDate.setDate(newDate.getDate() + 7)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Format the current date range for display
  const getDateRangeLabel = () => {
    const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }
    if (view === "day") {
      return currentDate.toLocaleDateString("en-GB", options)
    } else if (view === "week") {
      const start = new Date(currentDate)
      const dayOfWeek = start.getDay()
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      start.setDate(start.getDate() + mondayOffset)
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      return `${start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} - ${end.toLocaleDateString("en-GB", options)}`
    } else {
      return currentDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    }
  }
  const [dateRangeFilter, setDateRangeFilter] = React.useState<DateRangeFilter>("today")
  const [appointmentDialogOpen, setAppointmentDialogOpen] = React.useState(false)
  const [editingAppointment, setEditingAppointment] = React.useState<Appointment | undefined>(undefined)
  const [appointmentMode, setAppointmentMode] = React.useState<"create" | "edit">("create")

  // Calculate date range for the STATS cards based on the filter buttons
  const getStatsDateRange = (filter: DateRangeFilter) => {
    const now = new Date()

    if (filter === "today") {
      const start = new Date(now)
      start.setHours(0, 0, 0, 0)
      const end = new Date(now)
      end.setHours(23, 59, 59, 999)
      return { from: start.toISOString(), to: end.toISOString() }
    } else if (filter === "next7days") {
      const start = new Date(now)
      start.setHours(0, 0, 0, 0)
      const end = new Date(now)
      end.setDate(end.getDate() + 7)
      end.setHours(23, 59, 59, 999)
      return { from: start.toISOString(), to: end.toISOString() }
    } else if (filter === "next30days") {
      const start = new Date(now)
      start.setHours(0, 0, 0, 0)
      const end = new Date(now)
      end.setDate(end.getDate() + 30)
      end.setHours(23, 59, 59, 999)
      return { from: start.toISOString(), to: end.toISOString() }
    }

    // Default: today
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    const end = new Date(now)
    end.setHours(23, 59, 59, 999)
    return { from: start.toISOString(), to: end.toISOString() }
  }

  // Calculate date range for the CALENDAR GRID based on view + currentDate
  const getCalendarDateRange = () => {
    const start = new Date(currentDate)
    const end = new Date(currentDate)

    if (view === "week") {
      const dayOfWeek = start.getDay()
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      start.setDate(start.getDate() + mondayOffset)
      start.setHours(0, 0, 0, 0)
      end.setTime(start.getTime())
      end.setDate(end.getDate() + 6)
      end.setHours(23, 59, 59, 999)
      return { from: start.toISOString(), to: end.toISOString() }
    }

    if (view === "month") {
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      end.setMonth(end.getMonth() + 1)
      end.setDate(0)
      end.setHours(23, 59, 59, 999)
      return { from: start.toISOString(), to: end.toISOString() }
    }

    // Day view
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
    return { from: start.toISOString(), to: end.toISOString() }
  }

  // Stats query: driven by filter buttons (Today / 7 days / 30 days)
  const statsRange = getStatsDateRange(dateRangeFilter)
  const { data: statsAppointments = [], isLoading: statsLoading } = useAppointments({
    from: statsRange.from,
    to: statsRange.to,
    job_id: jobIdFromUrl || undefined,
  })

  // Calendar grid query: driven by view (Day / Week / Month) + currentDate navigation
  const calendarRange = getCalendarDateRange()
  const { data: appointments = [], isLoading } = useAppointments({
    from: calendarRange.from,
    to: calendarRange.to,
    job_id: jobIdFromUrl || undefined,
  })

  const handleCreateAppointment = () => {
    setAppointmentMode("create")
    setEditingAppointment(undefined)
    setAppointmentDialogOpen(true)
  }

  const handleAppointmentClick = (appointment: Appointment) => {
    // If appointment has a job_id, navigate to job detail
    // Otherwise, open edit dialog (for appointments without jobs)
    if (appointment.job_id) {
      router.push(`/jobs/${appointment.job_id}`)
    } else {
      setAppointmentMode("edit")
      setEditingAppointment(appointment)
      setAppointmentDialogOpen(true)
    }
  }

  const handleEditAppointment = (appointment: Appointment, e?: React.MouseEvent) => {
    // Stop event from bubbling to parent (prevents navigation)
    e?.stopPropagation()

    // Open edit dialog
    setAppointmentMode("edit")
    setEditingAppointment(appointment)
    setAppointmentDialogOpen(true)
  }

  const handleDateRangeFilterChange = (filter: DateRangeFilter) => {
    setDateRangeFilter(filter)
    // Don't reset view - let user keep their preferred view
  }

  const clearJobFilter = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("job_id")
    router.push(`/calendar?${params.toString()}`)
  }

  return (
    
      <div className="space-y-4">
        {/* Header - Mobile optimized */}
        <div className="flex flex-col gap-2 pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <h1 className="text-lg md:text-2xl font-display font-bold gradient-text-solar">
              Calendar
            </h1>
            <Button 
              className="gap-1.5 h-9 shrink-0" 
              onClick={handleCreateAppointment} 
              data-testid="new-appointment-button"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Appointment</span>
            </Button>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground hidden md:block">
            View and manage upcoming appointments across your jobs
          </p>
        </div>

        {/* Filters section - Mobile optimized */}
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
          {/* Date range quick filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 -mx-3 px-3 md:mx-0 md:px-0">
            <span className="text-xs text-muted-foreground font-medium shrink-0">Filters:</span>
            <Button
              variant={dateRangeFilter === "today" ? "default" : "outline"}
              size="sm"
              className="h-8 md:h-7 text-xs px-3 md:px-2 shrink-0"
              onClick={() => handleDateRangeFilterChange("today")}
              data-testid="filter-today"
            >
              Today
            </Button>
            <Button
              variant={dateRangeFilter === "next7days" ? "default" : "outline"}
              size="sm"
              className="h-8 md:h-7 text-xs px-3 md:px-2 shrink-0"
              onClick={() => handleDateRangeFilterChange("next7days")}
              data-testid="filter-next-7-days"
            >
              7 days
            </Button>
            <Button
              variant={dateRangeFilter === "next30days" ? "default" : "outline"}
              size="sm"
              className="h-8 md:h-7 text-xs px-3 md:px-2 shrink-0"
              onClick={() => handleDateRangeFilterChange("next30days")}
              data-testid="filter-next-30-days"
            >
              30 days
            </Button>
          </div>

          {/* Job filter indicator */}
          {jobIdFromUrl && (
            <Badge
              variant="secondary"
              className="text-xs gap-1.5 pl-2 pr-1.5 h-7"
              data-testid="job-filter-indicator"
            >
              Filtering by job
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={clearJobFilter}
                data-testid="clear-job-filter"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {/* View toggle (Day/Week/Month) - Always visible */}
          <div className="h-4 w-px bg-border hidden md:block" />
          <div className="flex items-center gap-1" data-testid="calendar-view-toggle">
            <Button
              variant={view === "day" ? "default" : "outline"}
              size="sm"
              className="h-8 md:h-7 text-xs px-3 md:px-2"
              onClick={() => setView("day")}
              data-testid="calendar-view-day"
            >
              Day
            </Button>
            <Button
              variant={view === "week" ? "default" : "outline"}
              size="sm"
              className="h-8 md:h-7 text-xs px-3 md:px-2"
              onClick={() => setView("week")}
              data-testid="calendar-view-week"
            >
              Week
            </Button>
            <Button
              variant={view === "month" ? "default" : "outline"}
              size="sm"
              className="h-8 md:h-7 text-xs px-3 md:px-2"
              onClick={() => setView("month")}
              data-testid="calendar-view-month"
            >
              Month
            </Button>
          </div>

          {/* Date navigation */}
          <div className="h-4 w-px bg-border hidden md:block" />
          <div className="flex items-center gap-1 ml-auto md:ml-0">
            <Button
              variant="outline"
              size="sm"
              className="h-8 md:h-7 text-xs px-2"
              onClick={goToToday}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 md:h-7 w-8 md:w-7 p-0"
              onClick={navigatePrev}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center">
              {getDateRangeLabel()}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 md:h-7 w-8 md:w-7 p-0"
              onClick={navigateNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <AppointmentFormDialog
          open={appointmentDialogOpen}
          onOpenChange={setAppointmentDialogOpen}
          mode={appointmentMode}
          appointment={editingAppointment}
        />

        {/* Stats with MetricCard - driven by filter buttons */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <MetricCard
            title="Total"
            value={statsAppointments.length}
            icon={<CalendarIcon className="h-4 w-4" />}
            variant="default"
            loading={statsLoading}
          />
          <MetricCard
            title="Surveys"
            value={statsAppointments.filter((a) => a.appointment_type?.toLowerCase().includes("survey")).length}
            icon={<Building2 className="h-4 w-4" />}
            variant="primary"
            loading={statsLoading}
          />
          <MetricCard
            title="Sales Calls"
            value={statsAppointments.filter((a) => a.appointment_type?.toLowerCase().includes("sales")).length}
            icon={<PhoneCall className="h-4 w-4" />}
            variant="secondary"
            loading={statsLoading}
          />
          <MetricCard
            title="Projects"
            value={statsAppointments.filter((a) => a.appointment_type?.toLowerCase().includes("install")).length}
            icon={<Wrench className="h-4 w-4" />}
            variant="success"
            loading={statsLoading}
          />
        </div>

        {/* Calendar View */}
        <div data-calendar className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Timeline or List View based on selected view */}
          <Card className="lg:col-span-2 overflow-hidden">
            <div className="p-3 border-b border-border">
              <h3 className="font-display font-semibold text-sm" data-testid={`calendar-view-${view}-active`}>
                {view === "day" && "Day View"}
                {view === "week" && "Week View"}
                {view === "month" && "Month View"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {appointments.length} appointments
              </p>
            </div>
            {isLoading ? (
              <div className="p-8">
                <div className="h-64 bg-muted animate-pulse rounded" />
              </div>
            ) : view === "day" ? (
              <div className="divide-y divide-border">
                {hours.map((hour) => {
                  const hourAppointments = appointments.filter((apt) => {
                    const startTime = new Date(apt.start_time)
                    return startTime.getHours() === hour
                  })
                  return (
                    <TimeSlot
                      key={hour}
                      hour={hour}
                      appointments={hourAppointments}
                      onAppointmentClick={handleAppointmentClick}
                      onEditAppointment={handleEditAppointment}
                    />
                  )
                })}
              </div>
            ) : view === "week" ? (
              <WeekView
                appointments={appointments}
                currentDate={currentDate}
                onAppointmentClick={handleAppointmentClick}
                onEditAppointment={handleEditAppointment}
              />
            ) : (
              <MonthView
                appointments={appointments}
                currentDate={currentDate}
                onAppointmentClick={handleAppointmentClick}
              />
            )}
          </Card>

          {/* Upcoming List */}
          <Card>
            <div className="p-3 border-b border-border">
              <h3 className="font-display font-semibold text-sm">
                {view === "day" ? "Today's Schedule" : "Upcoming"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {appointments.length} appointments
              </p>
            </div>
            {isLoading ? (
              <div className="divide-y divide-border">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="p-4">
                    <div className="h-20 bg-muted animate-pulse rounded" />
                  </div>
                ))}
              </div>
            ) : appointments.length > 0 ? (
              <div className="divide-y divide-border">
                {appointments.map((apt) => (
                  <AppointmentCard key={apt.id} appointment={apt} onAppointmentClick={handleAppointmentClick} onEditAppointment={handleEditAppointment} />
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                No appointments
              </div>
            )}
          </Card>
        </div>
      </div>
    
  )
}

function TimeSlot({
  hour,
  appointments,
  onAppointmentClick,
  onEditAppointment,
}: {
  hour: number
  appointments: Appointment[]
  onAppointmentClick: (appointment: Appointment) => void
  onEditAppointment: (appointment: Appointment, e?: React.MouseEvent) => void
}) {
  const formatHour = (h: number) => {
    if (h === 12) return "12:00 PM"
    if (h > 12) return `${h - 12}:00 PM`
    return `${h}:00 AM`
  }

  return (
    <div className="grid grid-cols-12 min-h-[60px]">
      <div className="col-span-2 p-2.5 bg-muted/30 border-r border-border">
        <div className="text-xs font-medium">{formatHour(hour)}</div>
      </div>
      <div className="col-span-10 p-2 space-y-1.5">
        {appointments.length > 0 ? (
          appointments.map((apt) => (
            <AppointmentBlock key={apt.id} appointment={apt} onClick={onAppointmentClick} onEdit={onEditAppointment} />
          ))
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
            No appointments
          </div>
        )}
      </div>
    </div>
  )
}

function AppointmentBlock({
  appointment,
  onClick,
  onEdit
}: {
  appointment: Appointment
  onClick: (appointment: Appointment) => void
  onEdit: (appointment: Appointment, e?: React.MouseEvent) => void
}) {
  const getColorForType = (type: string | null) => {
    if (!type) return "primary"
    const t = type.toLowerCase()
    if (t.includes("survey")) return "primary"
    if (t.includes("sales") || t.includes("call")) return "secondary"
    if (t.includes("install")) return "success"
    return "primary"
  }

  const getDuration = () => {
    const start = new Date(appointment.start_time)
    const end = new Date(appointment.end_time)
    const minutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60))
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
    }
    return `${minutes}m`
  }

  const colorClasses = {
    primary: "bg-primary/10 border-primary hover:bg-primary/20",
    secondary: "bg-secondary/10 border-secondary hover:bg-secondary/20",
    success: "bg-success/10 border-success hover:bg-success/20",
  }

  const color = getColorForType(appointment.appointment_type)
  const isCancelled = appointment.status === 'cancelled'

  return (
    <div
      className={`p-2 rounded-md border-l-4 transition-colors cursor-pointer relative group ${
        colorClasses[color as keyof typeof colorClasses]
      } ${isCancelled ? 'opacity-50' : ''}`}
      onClick={() => onClick(appointment)}
      data-testid="appointment-block"
    >
      <div className="flex items-start justify-between gap-2 mb-0.5">
        <Badge variant="outline" className="text-xs h-5">
          {isCancelled ? "Cancelled" : appointment.appointment_type || "Appointment"}
        </Badge>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">{getDuration()}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => onEdit(appointment, e)}
            data-testid="edit-appointment-button"
          >
            <Edit2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="font-medium text-sm leading-tight">
        {appointment.customer?.name || appointment.title}
      </div>
      {appointment.location && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{appointment.location}</span>
        </div>
      )}
      {appointment.assignee?.name && (
        <div className="text-xs text-muted-foreground mt-1">
          Assigned to: {appointment.assignee.name}
        </div>
      )}
    </div>
  )
}

function AppointmentCard({
  appointment,
  onAppointmentClick,
  onEditAppointment
}: {
  appointment: Appointment
  onAppointmentClick: (appointment: Appointment) => void
  onEditAppointment: (appointment: Appointment, e?: React.MouseEvent) => void
}) {
  const getColorForType = (type: string | null) => {
    if (!type) return "primary"
    const t = type.toLowerCase()
    if (t.includes("survey")) return "primary"
    if (t.includes("sales") || t.includes("call")) return "secondary"
    if (t.includes("install")) return "success"
    return "primary"
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  }

  const getDuration = () => {
    const start = new Date(appointment.start_time)
    const end = new Date(appointment.end_time)
    const minutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60))
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
    }
    return `${minutes}m`
  }

  const colorClasses = {
    primary: "text-primary",
    secondary: "text-secondary",
    success: "text-success",
  }

  const color = getColorForType(appointment.appointment_type)
  const isCancelled = appointment.status === 'cancelled'

  return (
    <div
      className={`p-3 hover:bg-muted/30 transition-colors cursor-pointer group relative ${isCancelled ? 'opacity-50' : ''}`}
      onClick={() => onAppointmentClick(appointment)}
      data-testid="appointment-card"
    >
      <div className="flex items-start gap-2.5">
        <div>
          <div className={`text-base font-semibold ${colorClasses[color as keyof typeof colorClasses]}`}>
            {formatTime(appointment.start_time)}
          </div>
          <div className="text-xs text-muted-foreground">{getDuration()}</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <Badge variant="outline" className="text-xs h-5">
              {isCancelled ? "Cancelled" : appointment.appointment_type || "Appointment"}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => onEditAppointment(appointment, e)}
              data-testid="edit-appointment-button"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="font-medium text-sm group-hover:text-primary transition-colors leading-tight">
            {appointment.customer?.name || appointment.title}
          </div>
          {appointment.location && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1 truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{appointment.location}</span>
            </div>
          )}
          {appointment.assignee?.name && (
            <div className="text-xs text-muted-foreground mt-1">
              Assigned to: {appointment.assignee.name}
            </div>
          )}
          {appointment.customer?.phone && (
            <Button variant="ghost" size="sm" className="mt-1.5 h-6 text-xs gap-1 px-2">
              <Phone className="h-3 w-3" />
              Call
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading calendar...</div>}>
      <CalendarContent />
    </Suspense>
  )
}
