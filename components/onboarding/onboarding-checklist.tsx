"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  CheckCircle2, 
   
  Users, 
  Building2, 
  Mail, 
  Calendar,
  Briefcase,
  ArrowRight,
  X
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  href: string
  completed: boolean
}

interface OnboardingChecklistProps {
  steps?: OnboardingStep[]
  onDismiss?: () => void
  className?: string
}

const defaultSteps: OnboardingStep[] = [
  {
    id: "company",
    title: "Set up your company",
    description: "Add your company name and contact details",
    icon: <Building2 className="h-4 w-4" />,
    href: "/settings",
    completed: false,
  },
  {
    id: "customer",
    title: "Add your first customer",
    description: "Create a customer record to get started",
    icon: <Users className="h-4 w-4" />,
    href: "/customers",
    completed: false,
  },
  {
    id: "job",
    title: "Create your first job",
    description: "Start tracking a project",
    icon: <Briefcase className="h-4 w-4" />,
    href: "/jobs",
    completed: false,
  },
  {
    id: "calendar",
    title: "Schedule an appointment",
    description: "Add an appointment or site visit",
    icon: <Calendar className="h-4 w-4" />,
    href: "/calendar",
    completed: false,
  },
  {
    id: "integrations",
    title: "Set up communications (optional)",
    description: "Configure email and SMS to message customers",
    icon: <Mail className="h-4 w-4" />,
    href: "/settings/integrations",
    completed: false,
  },
]

export function OnboardingChecklist({ 
  steps = defaultSteps, 
  onDismiss,
  className 
}: OnboardingChecklistProps) {
  const completedCount = steps.filter(s => s.completed).length
  const progress = (completedCount / steps.length) * 100
  const allComplete = completedCount === steps.length

  if (allComplete) {
    return null
  }

  return (
    <Card className={cn("relative", className)}>
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Get started with Cold Lava BOS</CardTitle>
        <CardDescription>
          Complete these steps to set up your account
        </CardDescription>
        <div className="pt-2">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">
              {completedCount} of {steps.length} complete
            </span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((step, _index) => (
          <Link
            key={step.id}
            href={step.href}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border transition-colors",
              step.completed
                ? "bg-muted/30 border-border"
                : "bg-card hover:bg-muted/50 border-border hover:border-primary/20"
            )}
          >
            <div className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
              step.completed 
                ? "bg-green-500/10 text-green-600" 
                : "bg-primary/10 text-primary"
            )}>
              {step.completed ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                step.icon
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "font-medium text-sm",
                step.completed && "text-muted-foreground line-through"
              )}>
                {step.title}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {step.description}
              </p>
            </div>
            {!step.completed && (
              <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
