"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import {
  Building2,
  Save,
  AlertCircle,
  Link as LinkIcon,
  Phone,
  MapPin,
  Globe,
  CheckCircle,
  Loader2,
  Upload,
  Image as ImageIcon,
  User,
  Users,
  Settings,
} from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

interface OrganisationSettings {
  company_name: string
  phone: string
  address_line1: string
  address_line2: string
  city: string
  county: string
  postcode: string
  country: string
  currency: string
  timezone: string
  website: string
  logo_url: string
}

const CURRENCIES = [
  { value: "GBP", label: "GBP (£) — British Pound" },
  { value: "EUR", label: "EUR (€) — Euro" },
  { value: "USD", label: "USD ($) — US Dollar" },
]

const TIMEZONES = [
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Dublin", label: "Dublin (GMT/IST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
  { value: "Europe/Madrid", label: "Madrid (CET/CEST)" },
  { value: "Europe/Amsterdam", label: "Amsterdam (CET/CEST)" },
  { value: "Europe/Rome", label: "Rome (CET/CEST)" },
  { value: "Europe/Brussels", label: "Brussels (CET/CEST)" },
  { value: "Europe/Lisbon", label: "Lisbon (WET/WEST)" },
  { value: "Europe/Athens", label: "Athens (EET/EEST)" },
  { value: "Europe/Helsinki", label: "Helsinki (EET/EEST)" },
  { value: "Europe/Warsaw", label: "Warsaw (CET/CEST)" },
  { value: "America/New_York", label: "New York (EST/EDT)" },
  { value: "America/Chicago", label: "Chicago (CST/CDT)" },
  { value: "America/Los_Angeles", label: "Los Angeles (PST/PDT)" },
]

const COUNTRIES = [
  "United Kingdom",
  "Ireland",
  "France",
  "Germany",
  "Spain",
  "Netherlands",
  "Belgium",
  "Italy",
  "Portugal",
  "United States",
  "Canada",
  "Australia",
]

async function fetchOrgSettings(): Promise<OrganisationSettings> {
  const res = await fetch("/api/settings/organisation")
  if (!res.ok) throw new Error("Failed to fetch organisation settings")
  const json = await res.json()
  return json.data
}

async function updateOrgSettings(data: OrganisationSettings): Promise<OrganisationSettings> {
  const res = await fetch("/api/settings/organisation", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to update" }))
    throw new Error(err.error || "Failed to update organisation settings")
  }
  const json = await res.json()
  return json.data
}

export default function OrganisationSettingsPage() {
  const queryClient = useQueryClient()
  const [saved, setSaved] = React.useState(false)

  const [form, setForm] = React.useState<OrganisationSettings>({
    company_name: "",
    phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    county: "",
    postcode: "",
    country: "United Kingdom",
    currency: "GBP",
    timezone: "Europe/London",
    website: "",
    logo_url: "",
  })

  const { data: orgSettings, isLoading, error } = useQuery({
    queryKey: ["organisation-settings"],
    queryFn: fetchOrgSettings,
  })

  const mutation = useMutation({
    mutationFn: updateOrgSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organisation-settings"] })
      queryClient.invalidateQueries({ queryKey: ["tenant"] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  // Initialize form when data loads
  React.useEffect(() => {
    if (orgSettings) {
      setForm(orgSettings)
    }
  }, [orgSettings])

  const updateField = (field: keyof OrganisationSettings, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    mutation.mutate(form)
  }

  const hasChanges = orgSettings && JSON.stringify(form) !== JSON.stringify(orgSettings)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div>
          <h1 className="text-lg md:text-xl font-display font-bold gradient-text-solar">
            Organisation Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your company details, address, and preferences
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Settings Navigation */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <a
              href="/settings/profile"
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/30 transition-colors text-sm text-muted-foreground hover:text-foreground"
            >
              <User className="h-4 w-4" />
              My Profile
            </a>
            <a
              href="/settings"
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/30 transition-colors text-sm text-muted-foreground hover:text-foreground"
            >
              <Settings className="h-4 w-4" />
              General
            </a>
            <a
              href="/settings/organisation"
              className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary/10 text-primary text-sm font-medium"
            >
              <Building2 className="h-4 w-4" />
              Organisation
            </a>
            <a
              href="/settings/users"
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/30 transition-colors text-sm text-muted-foreground hover:text-foreground"
            >
              <Users className="h-4 w-4" />
              Team
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
              <Settings className="h-4 w-4" />
              AI Settings
            </a>
            <a
              href="/settings/automation"
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/30 transition-colors text-sm text-muted-foreground hover:text-foreground"
            >
              <Settings className="h-4 w-4" />
              Automation
            </a>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-4">
          {isLoading ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Company Information</CardTitle>
                  <CardDescription>Your company details</CardDescription>
                </CardHeader>
                <CardContent>
                  <LoadingSkeleton className="h-10" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Company Address</CardTitle>
                  <CardDescription>Your business address</CardDescription>
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
                <p className="text-sm text-destructive">Failed to load organisation settings</p>
                <p className="text-xs text-muted-foreground mt-1">Please try refreshing the page</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Company Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    Company Information
                  </CardTitle>
                  <CardDescription>
                    Your company name, phone, and website
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Company Name</Label>
                    <Input
                      id="company_name"
                      value={form.company_name}
                      onChange={(e) => updateField("company_name", e.target.value)}
                      placeholder="e.g., Your Company Ltd"
                    />
                    <p className="text-xs text-muted-foreground">
                      Displayed throughout the app, on quotes and invoices
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={form.phone}
                        onChange={(e) => updateField("phone", e.target.value)}
                        placeholder="e.g., 01234 567890"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="website" className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        Website URL
                      </Label>
                      <Input
                        id="website"
                        type="url"
                        value={form.website}
                        onChange={(e) => updateField("website", e.target.value)}
                        placeholder="e.g., https://www.example.com"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Company Address */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Company Address
                  </CardTitle>
                  <CardDescription>
                    Your registered business address
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="address_line1">Address Line 1</Label>
                    <Input
                      id="address_line1"
                      value={form.address_line1}
                      onChange={(e) => updateField("address_line1", e.target.value)}
                      placeholder="e.g., 123 High Street"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address_line2">Address Line 2 (optional)</Label>
                    <Input
                      id="address_line2"
                      value={form.address_line2}
                      onChange={(e) => updateField("address_line2", e.target.value)}
                      placeholder="e.g., Unit 4, Business Park"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City / Town</Label>
                      <Input
                        id="city"
                        value={form.city}
                        onChange={(e) => updateField("city", e.target.value)}
                        placeholder="e.g., Manchester"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="county">County</Label>
                      <Input
                        id="county"
                        value={form.county}
                        onChange={(e) => updateField("county", e.target.value)}
                        placeholder="e.g., Greater Manchester"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="postcode">Postcode</Label>
                      <Input
                        id="postcode"
                        value={form.postcode}
                        onChange={(e) => updateField("postcode", e.target.value)}
                        placeholder="e.g., M1 1AA"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <select
                        id="country"
                        value={form.country}
                        onChange={(e) => updateField("country", e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Regional & Currency */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    Regional Settings
                  </CardTitle>
                  <CardDescription>
                    Currency and timezone preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <select
                        id="currency"
                        value={form.currency}
                        onChange={(e) => updateField("currency", e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground">
                        Used for quotes, invoices, and pricing
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <select
                        id="timezone"
                        value={form.timezone}
                        onChange={(e) => updateField("timezone", e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {TIMEZONES.map((tz) => (
                          <option key={tz.value} value={tz.value}>{tz.label}</option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground">
                        All dates and times displayed in this timezone
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Company Logo */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    Company Logo
                  </CardTitle>
                  <CardDescription>
                    Upload your company logo for use on quotes and invoices
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-4">
                    {form.logo_url ? (
                      <div className="relative h-20 w-20 rounded-lg border border-border overflow-hidden bg-muted/30 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={form.logo_url}
                          alt="Company logo"
                          className="h-full w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="h-20 w-20 rounded-lg border border-dashed border-border flex items-center justify-center bg-muted/10">
                        <Building2 className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <div className="space-y-2">
                        <Label htmlFor="logo_url">Logo URL</Label>
                        <Input
                          id="logo_url"
                          type="url"
                          value={form.logo_url}
                          onChange={(e) => updateField("logo_url", e.target.value)}
                          placeholder="e.g., https://example.com/logo.png"
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter a URL to your company logo. File upload coming soon.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              <div className="flex items-center gap-3 justify-end">
                {hasChanges && !mutation.isPending && !saved && (
                  <span className="text-sm text-muted-foreground">You have unsaved changes</span>
                )}
                {mutation.isError && (
                  <span className="text-sm text-destructive">
                    {mutation.error?.message || "Failed to save"}
                  </span>
                )}
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || mutation.isPending}
                  className="gap-2"
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : saved ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Saved!
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
