"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Briefcase, 
  Calendar, 
  Mail, 
   
  FileText, 
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"

interface Activity {
  id: string
  type: "job_created" | "job_completed" | "appointment_scheduled" | "message_received" | "quote_sent" | "customer_added" | "deadline_warning"
  title: string
  description?: string
  timestamp: string
  href?: string
  metadata?: Record<string, string>
}

interface ActivityFeedProps {
  activities?: Activity[]
  isLoading?: boolean
  className?: string
}

const iconMap: Record<string, { icon: React.ReactNode; color: string }> = {
  job_created: { icon: <Briefcase className="h-4 w-4" />, color: "bg-blue-500/10 text-blue-600" },
  job_completed: { icon: <CheckCircle2 className="h-4 w-4" />, color: "bg-green-500/10 text-green-600" },
  appointment_scheduled: { icon: <Calendar className="h-4 w-4" />, color: "bg-purple-500/10 text-purple-600" },
  message_received: { icon: <Mail className="h-4 w-4" />, color: "bg-teal-500/10 text-teal-600" },
  quote_sent: { icon: <FileText className="h-4 w-4" />, color: "bg-cyan-500/10 text-cyan-600" },
  customer_added: { icon: <UserPlus className="h-4 w-4" />, color: "bg-pink-500/10 text-pink-600" },
  deadline_warning: { icon: <AlertTriangle className="h-4 w-4" />, color: "bg-amber-500/10 text-amber-600" },
}

export function ActivityFeed({ activities = [], isLoading, className }: ActivityFeedProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-muted" />
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

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {activities.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] px-6">
            <div className="space-y-4">
              {activities.map((activity, index) => {
                const { icon, color } = iconMap[activity.type] || { 
                  icon: <Clock className="h-4 w-4" />, 
                  color: "bg-muted text-muted-foreground" 
                }
                
                const content = (
                  <div className={cn(
                    "flex gap-3 group",
                    activity.href && "cursor-pointer"
                  )}>
                    <div className="relative">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                        color
                      )}>
                        {icon}
                      </div>
                      {index < activities.length - 1 && (
                        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-px h-6 bg-border" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pb-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium group-hover:text-primary transition-colors">
                          {activity.title}
                        </p>
                        {activity.href && (
                          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        )}
                      </div>
                      {activity.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {activity.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                )

                return activity.href ? (
                  <Link key={activity.id} href={activity.href}>
                    {content}
                  </Link>
                ) : (
                  <div key={activity.id}>{content}</div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
