"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit2 } from "lucide-react"
import type { Appointment } from "@/lib/api/types"

interface WeekViewProps {
  appointments: Appointment[]
  currentDate: Date
  onAppointmentClick: (appointment: Appointment) => void
  onEditAppointment: (appointment: Appointment, e?: React.MouseEvent) => void
}

export function WeekView({ appointments, currentDate, onAppointmentClick, onEditAppointment }: WeekViewProps) {
  // Get the week's days (Sunday to Saturday)
  const getWeekDays = (date: Date) => {
    const days = []
    const startOfWeek = new Date(date)
    startOfWeek.setDate(date.getDate() - date.getDay())
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      days.push(day)
    }
    return days
  }

  const weekDays = getWeekDays(currentDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Group appointments by day
  const getAppointmentsForDay = (day: Date) => {
    return appointments.filter((apt) => {
      const aptDate = new Date(apt.start_time)
      return aptDate.toDateString() === day.toDateString()
    }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  }

  const getColorForType = (type: string | null) => {
    if (!type) return "border-primary bg-primary/10"
    const t = type.toLowerCase()
    if (t.includes("survey")) return "border-primary bg-primary/10"
    if (t.includes("sales") || t.includes("call")) return "border-secondary bg-secondary/10"
    if (t.includes("install")) return "border-success bg-success/10"
    return "border-primary bg-primary/10"
  }

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return (
    <div className="overflow-x-auto">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border min-w-[700px]">
        {weekDays.map((day, idx) => {
          const isToday = day.toDateString() === today.toDateString()
          return (
            <div
              key={idx}
              className={`p-3 text-center border-r border-border last:border-r-0 ${
                isToday ? "bg-primary/5" : ""
              }`}
            >
              <div className="text-xs text-muted-foreground">{dayNames[idx]}</div>
              <div className={`text-lg font-semibold ${isToday ? "text-primary" : ""}`}>
                {day.getDate()}
              </div>
              {isToday && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-1">
                  Today
                </Badge>
              )}
            </div>
          )
        })}
      </div>

      {/* Day content */}
      <div className="grid grid-cols-7 min-h-[400px] min-w-[700px]">
        {weekDays.map((day, idx) => {
          const dayAppointments = getAppointmentsForDay(day)
          const isToday = day.toDateString() === today.toDateString()
          
          return (
            <div
              key={idx}
              className={`border-r border-border last:border-r-0 p-2 space-y-2 ${
                isToday ? "bg-primary/5" : ""
              }`}
            >
              {dayAppointments.length > 0 ? (
                dayAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className={`p-2 rounded border-l-4 cursor-pointer hover:opacity-80 transition-opacity ${getColorForType(apt.appointment_type)}`}
                    onClick={() => onAppointmentClick(apt)}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-medium">{formatTime(apt.start_time)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 opacity-0 hover:opacity-100"
                        onClick={(e) => onEditAppointment(apt, e)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-xs font-medium truncate mt-1">
                      {apt.customer?.name || apt.title}
                    </div>
                    <Badge variant="outline" className="text-[10px] px-1 py-0 mt-1">
                      {apt.appointment_type || "Appt"}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                  -
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
