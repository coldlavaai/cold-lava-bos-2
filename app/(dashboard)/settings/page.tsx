"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
// Removed custom Select - using native <select> for timezone
import { Building2, Save, AlertCircle, Link as LinkIcon, Phone, Zap } from "lucide-react"
import { useTenant, useUpdateTenant } from "@/lib/api/hooks"

export default function SettingsPage() {
  const [companyName, setCompanyName] = React.useState("")
  const [companyAddress, setCompanyAddress] = React.useState("")
  const [companyPhone, setCompanyPhone] = React.useState("")
  const [companyWebsite, setCompanyWebsite] = React.useState("")
  const [timezone, setTimezone] = React.useState("")

  // Survey settings
  const [surveyStartTime, setSurveyStartTime] = React.useState("08:00")
  const [surveyEndTime, setSurveyEndTime] = React.useState("17:00")
  const [surveyDefaultVisitMinutes, setSurveyDefaultVisitMinutes] = React.useState(90)
  const [surveyMaxVisitsPerDay, setSurveyMaxVisitsPerDay] = React.useState(4)

  const { data: tenant, isLoading, error} = useTenant()
  const updateTenantMutation = useUpdateTenant()

  // Initialize form fields when tenant data loads
  React.useEffect(() => {
    if (tenant) {
      setCompanyName(tenant.name || tenant.company_name || '')
      setCompanyAddress(String(tenant.settings?.company_address || ''))
      setCompanyPhone(String(tenant.settings?.company_phone || ''))
      setCompanyWebsite(String(tenant.settings?.company_website || ''))
      setTimezone(tenant.timezone || 'UTC')
      setSurveyStartTime(String(tenant.settings?.survey_start_time || '08:00'))
      setSurveyEndTime(String(tenant.settings?.survey_end_time || '17:00'))
      setSurveyDefaultVisitMinutes(Number(tenant.settings?.survey_default_visit_minutes || 90))
      setSurveyMaxVisitsPerDay(Number(tenant.settings?.survey_max_visits_per_day || 4))
    }
  }, [tenant])

  const handleSave = () => {
    updateTenantMutation.mutate({
      name: companyName,
      timezone: timezone,
      settings: {
        ...tenant?.settings,
        company_address: companyAddress,
        company_phone: companyPhone,
        company_website: companyWebsite,
        survey_start_time: surveyStartTime,
        survey_end_time: surveyEndTime,
        survey_default_visit_minutes: surveyDefaultVisitMinutes,
        survey_max_visits_per_day: surveyMaxVisitsPerDay,
      },
    })
  }

  return (
    
      <div className="space-y-4">
        {/* Compact header */}
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div>
            <h1 className="text-lg md:text-xl font-display font-bold gradient-text-solar">
              Settings
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage your company settings and preferences
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Settings Navigation — horizontal scroll on mobile, vertical sidebar on desktop */}
          <div className="lg:col-span-1">
            {/* Mobile: horizontal scrollable pills */}
            <div className="flex lg:hidden gap-2 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-thin">
              <a
                href="/settings"
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium whitespace-nowrap shrink-0"
              >
                <Building2 className="h-3.5 w-3.5" />
                General
              </a>
              <a
                href="/settings/organisation"
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-muted/50 text-sm text-muted-foreground whitespace-nowrap shrink-0"
              >
                Organisation
              </a>
              <a
                href="/settings/users"
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-muted/50 text-sm text-muted-foreground whitespace-nowrap shrink-0"
              >
                Users
              </a>
              <a
                href="/settings/integrations"
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-muted/50 text-sm text-muted-foreground whitespace-nowrap shrink-0"
              >
                Integrations
              </a>
              <a
                href="/settings/phone"
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-muted/50 text-sm text-muted-foreground whitespace-nowrap shrink-0"
              >
                Phone
              </a>
              <a
                href="/settings/ai"
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-muted/50 text-sm text-muted-foreground whitespace-nowrap shrink-0"
              >
                AI
              </a>
              <a
                href="/settings/automation"
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-muted/50 text-sm text-muted-foreground whitespace-nowrap shrink-0"
              >
                Automation
              </a>
            </div>
            {/* Desktop: vertical card nav */}
            <Card className="hidden lg:block h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <a
                  href="/settings"
                  className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 text-sm font-medium"
                >
                  <Building2 className="h-4 w-4" />
                  General
                </a>
                <a
                  href="/settings/organisation"
                  className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/30 transition-colors text-sm text-muted-foreground hover:text-foreground"
                >
                  <Building2 className="h-4 w-4" />
                  Organisation
                </a>
                <a
                  href="/settings/users"
                  className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/30 transition-colors text-sm text-muted-foreground hover:text-foreground"
                >
                  <Building2 className="h-4 w-4" />
                  Users
                </a>
                <a
                  href="/settings/integrations"
                  className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/30 transition-colors text-sm text-muted-foreground hover:text-foreground"
                >
                  <LinkIcon className="h-4 w-4" />
                  Integrations
                </a>
                <a
                  href="/settings/phone"
                  className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/30 transition-colors text-sm text-muted-foreground hover:text-foreground"
                >
                  <Phone className="h-4 w-4" />
                  Phone
                </a>
                <a
                  href="/settings/ai"
                  className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/30 transition-colors text-sm text-muted-foreground hover:text-foreground"
                >
                  <Building2 className="h-4 w-4" />
                  AI Settings
                </a>
                <a
                  href="/settings/automation"
                  className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/30 transition-colors text-sm text-muted-foreground hover:text-foreground"
                >
                  <Zap className="h-4 w-4" />
                  Automation
                </a>
              </CardContent>
            </Card>
          </div>

          {/* General Settings Content */}
          <div className="lg:col-span-3 space-y-4">
            {isLoading ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Company Information</CardTitle>
                    <CardDescription>
                      Update your company details and branding
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <LoadingSkeleton className="h-10" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Regional Settings</CardTitle>
                    <CardDescription>
                      Configure timezone and localization preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <LoadingSkeleton className="h-10" />
                  </CardContent>
                </Card>
              </>
            ) : error ? (
              <Card>
                <CardContent className="pt-8 pb-8 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50 text-destructive" />
                  <p className="text-sm text-destructive">Failed to load settings</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Company Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Company Information</CardTitle>
                    <CardDescription>
                      Update your company details and branding
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Enter company name"
                      />
                      <p className="text-xs text-muted-foreground">
                        This will be displayed throughout the application
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="companyAddress">Company Address</Label>
                      <Input
                        id="companyAddress"
                        value={companyAddress}
                        onChange={(e) => setCompanyAddress(e.target.value)}
                        placeholder="Enter company address"
                      />
                      <p className="text-xs text-muted-foreground">
                        Used as the default starting location for survey routing
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="companyPhone">Phone Number</Label>
                        <Input
                          id="companyPhone"
                          value={companyPhone}
                          onChange={(e) => setCompanyPhone(e.target.value)}
                          placeholder="e.g., 01234 567890"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="companyWebsite">Website</Label>
                        <Input
                          id="companyWebsite"
                          value={companyWebsite}
                          onChange={(e) => setCompanyWebsite(e.target.value)}
                          placeholder="e.g., https://example.com"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Regional Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle>Regional Settings</CardTitle>
                    <CardDescription>
                      Configure timezone and localization preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <select
                        id="timezone"
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="Europe/London">London (GMT/BST)</option>
                        <option value="Europe/Dublin">Dublin (GMT/IST)</option>
                        <option value="Europe/Paris">Paris (CET/CEST)</option>
                        <option value="Europe/Berlin">Berlin (CET/CEST)</option>
                        <option value="Europe/Madrid">Madrid (CET/CEST)</option>
                        <option value="Europe/Amsterdam">Amsterdam (CET/CEST)</option>
                        <option value="America/New_York">New York (EST/EDT)</option>
                        <option value="America/Los_Angeles">Los Angeles (PST/PDT)</option>
                        <option value="Asia/Tokyo">Tokyo (JST)</option>
                        <option value="Australia/Sydney">Sydney (AEDT/AEST)</option>
                      </select>
                      <p className="text-xs text-muted-foreground">
                        All times will be displayed in this timezone
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Survey Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle>Survey Routing Settings</CardTitle>
                    <CardDescription>
                      Configure default times for survey route planning
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="surveyStartTime">Start Time (First Survey)</Label>
                        <Input
                          id="surveyStartTime"
                          type="time"
                          value={surveyStartTime}
                          onChange={(e) => setSurveyStartTime(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          When the first survey appointment should begin
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="surveyEndTime">End Time (Arrive Home By)</Label>
                        <Input
                          id="surveyEndTime"
                          type="time"
                          value={surveyEndTime}
                          onChange={(e) => setSurveyEndTime(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Latest time to return to starting location
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="surveyDefaultVisitMinutes">Default Visit Duration</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="surveyDefaultVisitMinutes"
                            type="number"
                            value={surveyDefaultVisitMinutes}
                            onChange={(e) => setSurveyDefaultVisitMinutes(Number(e.target.value))}
                            min="30"
                            max="180"
                          />
                          <span className="text-sm text-muted-foreground whitespace-nowrap">minutes</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Default time allocated for each survey visit
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="surveyMaxVisitsPerDay">Max Visits per Day</Label>
                        <Input
                          id="surveyMaxVisitsPerDay"
                          type="number"
                          value={surveyMaxVisitsPerDay}
                          onChange={(e) => setSurveyMaxVisitsPerDay(Number(e.target.value))}
                          min="1"
                          max="20"
                        />
                        <p className="text-xs text-muted-foreground">
                          Maximum number of surveys in a single route
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* OpenSolar Integration — hidden per Jacob's review Feb 2026 */}

                {/* Save Button */}
                <div className="flex justify-end">
                  <Button
                    onClick={handleSave}
                    disabled={updateTenantMutation.isPending}
                    loading={updateTenantMutation.isPending}
                    className="gap-1.5"
                  >
                    <Save className="h-4 w-4" />
                    {updateTenantMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    
  )
}
