"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Plus, 
  Users, 
  Briefcase, 
  Calendar, 
  Mail, 
  FileText,
  Upload
} from "lucide-react"
import { cn } from "@/lib/utils"

interface QuickAction {
  id: string
  label: string
  icon: React.ReactNode
  onClick: () => void
  variant?: "default" | "solar"
}

interface QuickActionsProps {
  onNewJob?: () => void
  onNewCustomer?: () => void
  onNewAppointment?: () => void
  onNewQuote?: () => void
  onImport?: () => void
  onNewMessage?: () => void
  className?: string
}

export function QuickActions({
  onNewJob,
  onNewCustomer,
  onNewAppointment,
  onNewQuote,
  onImport,
  onNewMessage,
  className,
}: QuickActionsProps) {
  const actions: QuickAction[] = [
    {
      id: "new-job",
      label: "New Job",
      icon: <Briefcase className="h-4 w-4" />,
      onClick: onNewJob || (() => {}),
      variant: "solar",
    },
    {
      id: "new-customer",
      label: "New Customer",
      icon: <Users className="h-4 w-4" />,
      onClick: onNewCustomer || (() => {}),
    },
    {
      id: "new-appointment",
      label: "Schedule",
      icon: <Calendar className="h-4 w-4" />,
      onClick: onNewAppointment || (() => {}),
    },
    {
      id: "new-quote",
      label: "Create Quote",
      icon: <FileText className="h-4 w-4" />,
      onClick: onNewQuote || (() => {}),
    },
    {
      id: "import",
      label: "Import Data",
      icon: <Upload className="h-4 w-4" />,
      onClick: onImport || (() => {}),
    },
    {
      id: "new-message",
      label: "Send Message",
      icon: <Mail className="h-4 w-4" />,
      onClick: onNewMessage || (() => {}),
    },
  ]

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant={action.variant === "solar" ? "solar" : "outline"}
              size="sm"
              className="h-auto py-3 flex flex-col gap-1"
              onClick={action.onClick}
            >
              {action.icon}
              <span className="text-xs font-normal">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
