/**
 * Session 101: Onboarding Banner Component
 * Shows helpful getting started steps for new tenants
 */

"use client"

import * as React from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  X,
  Rocket,
  Settings,
  Upload,
  Briefcase,

  ChevronRight
} from "lucide-react"
import { useAuth } from "@/lib/auth/auth-provider"
import { createClient } from "@/lib/supabase/client"

interface OnboardingStep {
  id: string
  title: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "customer",
    title: "Add Your First Customer",
    description: "Create a customer record to get started",
    href: "/customers",
    icon: Upload,
  },
  {
    id: "job",
    title: "Create Your First Job",
    description: "Start tracking your projects",
    href: "/jobs",
    icon: Briefcase,
  },
  {
    id: "integrations",
    title: "Set Up Communications",
    description: "Configure email and SMS (optional)",
    href: "/settings/integrations",
    icon: Settings,
  },
]

export function OnboardingBanner() {
  const { tenant } = useAuth()
  const [visible, setVisible] = React.useState(false)
  const [dismissing, setDismissing] = React.useState(false)
  const [completedSteps, setCompletedSteps] = React.useState<Set<string>>(new Set())

  // Check if onboarding should be shown and which steps are completed
  React.useEffect(() => {
    if (!tenant) return

    // If explicitly dismissed or completed, don't show
    if (tenant.settings?.onboarding_dismissed || tenant.settings?.onboarding_completed) {
      setVisible(false)
      return
    }

    // Check actual data to determine completed steps
    const checkData = async () => {
      const supabase = createClient()
      const completed = new Set<string>()

      // Check if customers exist
      const { count: customerCount } = await supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)

      if (customerCount && customerCount > 0) {
        completed.add("customer")
      }

      // Check if jobs exist
      const { count: jobCount } = await supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)

      if (jobCount && jobCount > 0) {
        completed.add("job")
      }

      // Check if integrations are configured (email or SMS)
      const { data: integrations } = await supabase
        .from("tenants")
        .select("settings")
        .eq("id", tenant.id)
        .single()

      const settings = integrations?.settings || {}
      if (settings.email_configured || settings.sms_configured) {
        completed.add("integrations")
      }

      setCompletedSteps(completed)

      // If all steps completed, don't show banner
      if (completed.size >= ONBOARDING_STEPS.length) {
        setVisible(false)
      } else {
        setVisible(true)
      }
    }

    checkData()
  }, [tenant])

  const handleDismiss = async () => {
    if (!tenant) return

    setDismissing(true)

    try {
      // Update tenant settings to mark onboarding as dismissed
      const supabase = createClient()

      const { error } = await supabase
        .from('tenants')
        .update({
          settings: {
            ...tenant.settings,
            onboarding_dismissed: true,
          },
        })
        .eq('id', tenant.id)

      if (error) {
        console.error('[OnboardingBanner] Error dismissing onboarding:', error)
      } else {
        setVisible(false)
      }
    } catch (error) {
      console.error('[OnboardingBanner] Error dismissing onboarding:', error)
    } finally {
      setDismissing(false)
    }
  }

  if (!visible) return null

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5 shadow-md animate-slide-in-from-top">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          {/* Main content */}
          <div className="flex-1 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Rocket className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Welcome to Cold Lava BOS!</h2>
                <p className="text-sm text-muted-foreground">
                  Get started with these quick setup steps
                </p>
              </div>
            </div>

            {/* Steps - only show incomplete ones */}
            {(() => {
              const incompleteSteps = ONBOARDING_STEPS.filter(step => !completedSteps.has(step.id))
              const gridCols = incompleteSteps.length === 1 ? "md:grid-cols-1" : incompleteSteps.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"
              
              return (
                <div className={`grid grid-cols-1 ${gridCols} gap-3`}>
                  {incompleteSteps.map((step) => {
                    const Icon = step.icon
                    return (
                      <Link
                        key={step.id}
                        href={step.href}
                        className="group p-4 rounded-lg border border-border bg-background hover:border-primary/30 hover:bg-muted/50 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-md bg-muted group-hover:bg-primary/10 transition-colors">
                            <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-medium truncate">{step.title}</h3>
                              <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )
            })()}
          </div>

          {/* Dismiss button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={handleDismiss}
            disabled={dismissing}
            aria-label="Dismiss onboarding"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
