"use client"

import * as React from "react"
import type { Appointment } from "@/lib/api/types"

interface MonthViewProps {
  appointments: Appointment[]
  currentDate: Date
  onAppointmentClick: (appointment: Appointment) => void
}

export function MonthView({ appointments, currentDate, onAppointmentClick }: MonthViewProps) {
  // Get calendar days for the month (including padding days from prev/next months)
  const getCalendarDays = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    
    // First day of the month
    const firstDay = new Date(year, month, 1)
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0)
    
    const days = []
    
    // Add padding days from previous month
    const startPadding = firstDay.getDay()
    for (let i = startPadding - 1; i >= 0; i--) {
      const day = new Date(year, month, -i)
      days.push({ date: day, isCurrentMonth: false })
    }
    
    // Add days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true })
    }
    
    // Add padding days from next month to complete the grid
    const endPadding = 42 - days.length // 6 rows × 7 days
    for (let i = 1; i <= endPadding; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false })
    }
    
    return days
  }

  const calendarDays = getCalendarDays(currentDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Group appointments by day
  const getAppointmentsForDay = (day: Date) => {
    return appointments.filter((apt) => {
      const aptDate = new Date(apt.start_time)
      return aptDate.toDateString() === day.toDateString()
    }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  }

  const getColorForType = (type: string | null) => {
    if (!type) return "bg-primary/20 text-primary"
    const t = type.toLowerCase()
    if (t.includes("survey")) return "bg-primary/20 text-primary"
    if (t.includes("sales") || t.includes("call")) return "bg-secondary/20 text-secondary"
    if (t.includes("install")) return "bg-success/20 text-success"
    return "bg-primary/20 text-primary"
  }

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const monthName = currentDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" })

  return (
    <div>
      {/* Month header */}
      <div className="text-center py-2 border-b border-border">
        <h3 className="font-semibold text-lg">{monthName}</h3>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {dayNames.map((name) => (
          <div key={name} className="p-2 text-center text-xs font-medium text-muted-foreground border-r border-border last:border-r-0">
            {name}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map(({ date, isCurrentMonth }, idx) => {
          const dayAppointments = getAppointmentsForDay(date)
          const isToday = date.toDateString() === today.toDateString()
          
          return (
            <div
              key={idx}
              className={`min-h-[100px] border-r border-b border-border last:border-r-0 p-1 ${
                !isCurrentMonth ? "bg-muted/30 text-muted-foreground" : ""
              } ${isToday ? "bg-primary/5" : ""}`}
            >
              {/* Day number */}
              <div className={`text-sm font-medium mb-1 ${isToday ? "text-primary" : ""}`}>
                {date.getDate()}
              </div>
              
              {/* Appointments (show max 3, with +more indicator) */}
              <div className="space-y-0.5">
                {dayAppointments.slice(0, 3).map((apt) => (
                  <div
                    key={apt.id}
                    className={`text-[10px] px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity ${getColorForType(apt.appointment_type)}`}
                    onClick={() => onAppointmentClick(apt)}
                    title={`${apt.customer?.name || apt.title} - ${apt.appointment_type || "Appointment"}`}
                  >
                    {apt.customer?.name || apt.title}
                  </div>
                ))}
                {dayAppointments.length > 3 && (
                  <div className="text-[10px] text-muted-foreground px-1">
                    +{dayAppointments.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
