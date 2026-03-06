"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  MapPin,
  Calendar,
  Users,
  Route,
  Search,
  Settings2,
  Loader2,
  Clock,
  Navigation,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { useTenant } from "@/lib/api/hooks"

interface EligibleJob {
  job_id: string
  job_number: string
  customer_id: string
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  full_postcode: string
  postcode_area: string
  address_line_1: string
  address_line_2: string
  city: string
  default_visit_duration_minutes: number
  created_at: string
}

interface RouteStop {
  stop_number: number
  job_id: string | null
  job_number: string | null
  customer_name: string
  address: string
  arrival_time: string
  departure_time: string
  visit_duration_minutes: number
  travel_time_to_next_minutes: number
  is_starting_point: boolean
  is_return: boolean
}

interface GeneratedRoute {
  route_date: string
  starting_location: string
  total_stops: number
  total_visit_minutes: number
  total_travel_minutes: number
  total_duration_minutes: number
  estimated_finish_time: string
  stops: RouteStop[]
}

export default function SurveysPage() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedJobIds, setSelectedJobIds] = React.useState<Set<string>>(new Set())
  const [eligibleJobs, setEligibleJobs] = React.useState<EligibleJob[]>([])
  const [loading, setLoading] = React.useState(true)

  // Load tenant settings for company address
  const { data: tenant } = useTenant()
  const companyAddress = String(tenant?.settings?.company_address || "Office Address")

  // Starting location settings
  const [useDefaultStart, setUseDefaultStart] = React.useState(true)
  const [startLocation, setStartLocation] = React.useState("")
  const [startPostcode, setStartPostcode] = React.useState("")
  interface AddressSuggestion {
    fullAddress: string
    postcode: string
  }
  const [addressSuggestions, setAddressSuggestions] = React.useState<AddressSuggestion[]>([])
  const [showAddressSuggestions, setShowAddressSuggestions] = React.useState(false)

  // Route planning
  const [routeDate, setRouteDate] = React.useState("")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [existingAppointments, setExistingAppointments] = React.useState<any[]>([])
  const [loadingAppointments, setLoadingAppointments] = React.useState(false)

  // Route generation
  const [generatedRoute, setGeneratedRoute] = React.useState<GeneratedRoute | null>(null)
  const [generating, setGenerating] = React.useState(false)
  const [generationError, setGenerationError] = React.useState<string | null>(null)

  // Route approval
  const [approving, setApproving] = React.useState(false)
  const [approvalSuccess, setApprovalSuccess] = React.useState(false)

  // Route planning settings (initialize from tenant settings)
  const [visitDuration, setVisitDuration] = React.useState(Number(tenant?.settings?.survey_default_visit_minutes || 90))
  const [maxVisits, setMaxVisits] = React.useState(Number(tenant?.settings?.survey_max_visits_per_day || 4))

  // Update defaults when tenant data loads
  React.useEffect(() => {
    if (tenant?.settings) {
      setVisitDuration(Number(tenant.settings.survey_default_visit_minutes || 90))
      setMaxVisits(Number(tenant.settings.survey_max_visits_per_day || 4))
    }
  }, [tenant])

  // Fetch existing appointments when route date changes
  React.useEffect(() => {
    if (!routeDate) {
      setExistingAppointments([])
      return
    }

    async function fetchAppointments() {
      try {
        setLoadingAppointments(true)
        // Fetch appointments for the selected date
        const response = await fetch(`/api/appointments?date=${routeDate}`)
        if (response.ok) {
          const data = await response.json()
          setExistingAppointments(data.data || [])
          console.log('[Calendar Integration] Found', data.data?.length || 0, 'appointments on', routeDate)
        }
      } catch (error) {
        console.error('Error fetching appointments:', error)
        setExistingAppointments([])
      } finally {
        setLoadingAppointments(false)
      }
    }

    fetchAppointments()
  }, [routeDate])

  // Postcode lookup
  const [postcodeLoading, setPostcodeLoading] = React.useState(false)

  const handlePostcodeLookup = async (postcode: string) => {
    if (!postcode || postcode.length < 5) {
      setAddressSuggestions([])
      setShowAddressSuggestions(false)
      return
    }

    try {
      setPostcodeLoading(true)
      console.log('[Postcode Lookup] Searching for:', postcode)
      const response = await fetch(`/api/postcode-lookup?postcode=${encodeURIComponent(postcode)}`)
      const data = await response.json()
      console.log('[Postcode Lookup] Response:', data)

      if (data.error) {
        console.error('[Postcode Lookup] Error:', data.error)
        setAddressSuggestions([])
      } else {
        setAddressSuggestions(data.addresses || [])
      }
      setShowAddressSuggestions(true)
    } catch (error) {
      console.error('Postcode lookup error:', error)
      setAddressSuggestions([])
      setShowAddressSuggestions(true)
    } finally {
      setPostcodeLoading(false)
    }
  }

  const handleAddressSelect = (address: AddressSuggestion) => {
    setStartLocation(address.fullAddress)
    setStartPostcode(address.postcode)
    setShowAddressSuggestions(false)
  }

  // Fetch eligible jobs on mount
  React.useEffect(() => {
    async function fetchEligibleJobs() {
      try {
        setLoading(true)
        const response = await fetch('/api/surveys/eligible-jobs?nationwide=true')
        if (!response.ok) {
          throw new Error('Failed to fetch eligible jobs')
        }
        const data = await response.json()
        setEligibleJobs(data.jobs || [])
      } catch (error) {
        console.error('Error fetching eligible jobs:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEligibleJobs()
  }, [])

  // Filter jobs by search query
  const filteredJobs = React.useMemo(() => {
    if (!searchQuery.trim()) return eligibleJobs

    const query = searchQuery.toLowerCase()
    return eligibleJobs.filter(job =>
      job.customer_name.toLowerCase().includes(query) ||
      job.address_line_1.toLowerCase().includes(query) ||
      job.city.toLowerCase().includes(query) ||
      job.full_postcode.toLowerCase().includes(query) ||
      job.postcode_area.toLowerCase().includes(query)
    )
  }, [eligibleJobs, searchQuery])

  const handleToggleJob = (jobId: string) => {
    setSelectedJobIds(prev => {
      const next = new Set(prev)
      if (next.has(jobId)) {
        next.delete(jobId)
      } else {
        next.add(jobId)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedJobIds.size === filteredJobs.length) {
      setSelectedJobIds(new Set())
    } else {
      setSelectedJobIds(new Set(filteredJobs.map(job => job.job_id)))
    }
  }

  // Check if form is valid for route generation
  const canGenerateRoute = React.useMemo(() => {
    const hasCustomers = selectedJobIds.size > 0
    const hasDate = routeDate.trim() !== ""
    const hasStartLocation = useDefaultStart || (startLocation.trim() !== "")
    return hasCustomers && hasDate && hasStartLocation
  }, [selectedJobIds.size, routeDate, useDefaultStart, startLocation])

  // Handle route generation
  const handleGenerateRoute = async () => {
    try {
      setGenerating(true)
      setGenerationError(null)
      setGeneratedRoute(null)
      setApprovalSuccess(false)

      const finalStartLocation = useDefaultStart ? companyAddress : startLocation

      console.log('[Generate Route] Request:', {
        job_ids: Array.from(selectedJobIds),
        route_date: routeDate,
        starting_location: finalStartLocation,
      })

      const response = await fetch('/api/surveys/generate-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_ids: Array.from(selectedJobIds),
          route_date: routeDate,
          starting_location: finalStartLocation,
          visit_duration_minutes: visitDuration,
          max_visits: maxVisits,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to generate route')
      }

      console.log('[Generate Route] Success:', data)
      setGeneratedRoute(data.route)
    } catch (error) {
      console.error('[Generate Route] Error:', error)
      setGenerationError(error instanceof Error ? error.message : 'Failed to generate route')
    } finally {
      setGenerating(false)
    }
  }

  // Handle route approval (create appointments)
  const handleApproveRoute = async () => {
    if (!generatedRoute) return

    try {
      setApproving(true)
      setGenerationError(null)

      console.log('[Approve Route] Creating appointments...')

      const response = await fetch('/api/surveys/approve-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          route: generatedRoute,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create appointments')
      }

      console.log('[Approve Route] Success:', data)
      setApprovalSuccess(true)

      // Clear selections and route after successful approval
      setTimeout(() => {
        setGeneratedRoute(null)
        setSelectedJobIds(new Set())
        setApprovalSuccess(false)
      }, 3000)

    } catch (error) {
      console.error('[Approve Route] Error:', error)
      setGenerationError(error instanceof Error ? error.message : 'Failed to create appointments')
    } finally {
      setApproving(false)
    }
  }

  return (
    
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-3">
            <h1 className="text-lg md:text-xl font-display font-bold gradient-text-solar">
              Survey Routing
            </h1>
            <Badge variant="outline" className="text-xs">
              Planning Workspace
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 h-9 md:h-8 shrink-0">
              <Settings2 className="h-3.5 w-3.5" />
              Settings
            </Button>
          </div>
        </div>

        {/* Instructions Card */}
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Plan Your Survey Routes</h3>
              <p className="text-sm text-muted-foreground">
                Select customers that need visits, choose surveyors and dates, then optimize routes automatically.
                Routes will be created in the calendar once approved.
              </p>
            </div>
          </div>
        </Card>

        {/* Main workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left panel - Customer selection */}
          <Card className="lg:col-span-2 p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Select Customers</h3>
                <Badge variant="secondary" className="text-xs">
                  {selectedJobIds.size} selected
                </Badge>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by customer name, address, or postcode..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Customer list */}
              {loading ? (
                <div className="border rounded-lg p-8 text-center text-muted-foreground">
                  <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin" />
                  <p className="text-sm">Loading customers...</p>
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="border rounded-lg p-8 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium mb-1">No customers found</p>
                  <p className="text-sm">
                    {searchQuery ? "Try a different search term" : "No jobs currently require visits"}
                  </p>
                </div>
              ) : (
                <>
                  {/* Select all */}
                  <div className="flex items-center gap-2 px-3 py-2 border-b">
                    <Checkbox
                      id="select-all"
                      checked={selectedJobIds.size === filteredJobs.length && filteredJobs.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <label
                      htmlFor="select-all"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Select all ({filteredJobs.length})
                    </label>
                  </div>

                  {/* Scrollable customer list */}
                  <ScrollArea className="h-[400px] border rounded-lg">
                    <div className="divide-y">
                      {filteredJobs.map((job) => (
                        <div
                          key={job.job_id}
                          className="flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors"
                        >
                          <Checkbox
                            id={job.job_id}
                            checked={selectedJobIds.has(job.job_id)}
                            onCheckedChange={() => handleToggleJob(job.job_id)}
                            className="mt-1"
                          />
                          <label
                            htmlFor={job.job_id}
                            className="flex-1 cursor-pointer space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm">{job.customer_name}</p>
                              <Badge variant="outline" className="text-xs">
                                {job.postcode_area}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {job.address_line_1}
                              {job.address_line_2 && `, ${job.address_line_2}`}
                              {job.city && `, ${job.city}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {job.full_postcode}
                            </p>
                          </label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </div>
          </Card>

          {/* Right panel - Route planning controls */}
          <Card className="p-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Route Planning</h3>

              {/* Starting location */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Starting Location <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="use-default-start"
                      checked={useDefaultStart}
                      onCheckedChange={(checked) => setUseDefaultStart(checked as boolean)}
                    />
                    <label
                      htmlFor="use-default-start"
                      className="text-sm cursor-pointer"
                    >
                      Use default: {companyAddress}
                    </label>
                  </div>
                  {!useDefaultStart && (
                    <div className="space-y-2">
                      <div className="relative">
                        <Input
                          placeholder="Enter postcode (e.g., CH60 0DG)..."
                          value={startPostcode}
                          onChange={(e) => {
                            setStartPostcode(e.target.value)
                            handlePostcodeLookup(e.target.value)
                          }}
                        />
                        {showAddressSuggestions && (
                          <div className="absolute z-50 w-full mt-1 bg-background border border-primary rounded-md shadow-lg max-h-60 overflow-auto">
                            {postcodeLoading ? (
                              <div className="px-3 py-4 text-sm text-center text-muted-foreground">
                                <Loader2 className="h-4 w-4 mx-auto mb-2 animate-spin" />
                                Searching addresses...
                              </div>
                            ) : addressSuggestions.length > 0 ? (
                              addressSuggestions.map((addr, idx) => (
                                <button
                                  key={idx}
                                  className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b last:border-b-0"
                                  onClick={() => handleAddressSelect(addr)}
                                >
                                  {addr.fullAddress}
                                </button>
                              ))
                            ) : (
                              <div className="px-3 py-4 text-sm text-center text-muted-foreground">
                                No addresses found for this postcode
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {startLocation && (
                        <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                          <strong>Selected:</strong> {startLocation}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Date selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Route Date <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    className="flex-1"
                    value={routeDate}
                    onChange={(e) => setRouteDate(e.target.value)}
                  />
                </div>
                {routeDate && (
                  <div className="text-xs">
                    {loadingAppointments ? (
                      <div className="text-muted-foreground">Checking calendar...</div>
                    ) : existingAppointments.length > 0 ? (
                      <div className="text-orange-400">
                        ⚠️ {existingAppointments.length} appointment{existingAppointments.length !== 1 ? 's' : ''} already booked on this date
                      </div>
                    ) : (
                      <div className="text-green-400">
                        ✓ No conflicts - date is available
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Surveyor selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Surveyors</label>
                <div className="border rounded-lg p-4 text-sm text-muted-foreground text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Select surveyors</p>
                </div>
              </div>

              {/* Planning settings */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Visit Duration</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={visitDuration}
                    onChange={(e) => setVisitDuration(Number(e.target.value))}
                    min="30"
                    max="180"
                  />
                  <span className="text-sm text-muted-foreground">minutes</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Max Visits per Day</label>
                <Input
                  type="number"
                  value={maxVisits}
                  onChange={(e) => setMaxVisits(Number(e.target.value))}
                  min="1"
                  max="10"
                />
              </div>

              {/* Generate button */}
              <Button
                className="w-full gap-2"
                disabled={!canGenerateRoute || generating}
                onClick={handleGenerateRoute}
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Route className="h-4 w-4" />
                    Generate Routes
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                {!canGenerateRoute
                  ? selectedJobIds.size === 0
                    ? "Select customers to enable route generation"
                    : !routeDate
                    ? "Select a route date"
                    : "Enter a starting location"
                  : `Ready to generate routes for ${selectedJobIds.size} customer${selectedJobIds.size !== 1 ? 's' : ''}`
                }
              </p>
            </div>
          </Card>
        </div>

        {/* Generated routes display */}
        {generationError && (
          <Card className="p-6 border-destructive bg-destructive/5">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-destructive mb-1">Route Generation Failed</p>
                <p className="text-sm text-destructive/90">{generationError}</p>
                {generationError.includes('API key not configured') && (
                  <div className="mt-3 p-3 bg-muted rounded-md text-xs space-y-1">
                    <p className="font-medium">To enable route generation:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Get a Google Maps API key from Google Cloud Console</li>
                      <li>Add it to <code className="px-1 py-0.5 bg-background rounded">.env.local</code> as <code className="px-1 py-0.5 bg-background rounded">GOOGLE_MAPS_API_KEY=your_key_here</code></li>
                      <li>Enable the Distance Matrix API and Geocoding API in your Google Cloud project</li>
                      <li>Restart the dev server</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {generatedRoute ? (
          <Card className="p-6">
            <div className="space-y-6">
              {/* Route summary */}
              <div className="flex items-start justify-between pb-4 border-b">
                <div>
                  <h3 className="font-semibold text-lg mb-1">Generated Route</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(generatedRoute.route_date).toLocaleDateString('en-GB', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Optimized
                </Badge>
              </div>

              {/* Route stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Total Stops</p>
                  <p className="text-2xl font-bold">{generatedRoute.total_stops}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Visit Time</p>
                  <p className="text-2xl font-bold">{Math.floor(generatedRoute.total_visit_minutes / 60)}h {generatedRoute.total_visit_minutes % 60}m</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Travel Time</p>
                  <p className="text-2xl font-bold">{Math.floor(generatedRoute.total_travel_minutes / 60)}h {generatedRoute.total_travel_minutes % 60}m</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Finish Time</p>
                  <p className="text-2xl font-bold">
                    {new Date(generatedRoute.estimated_finish_time).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              {/* Route timeline */}
              <div>
                <h4 className="font-semibold mb-3">Route Timeline</h4>
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-3">
                    {generatedRoute.stops.map((stop, index) => (
                      <div
                        key={index}
                        className={`flex items-start gap-4 p-4 rounded-lg border ${
                          stop.is_starting_point || stop.is_return
                            ? 'bg-muted/50 border-muted'
                            : 'bg-background border-border'
                        }`}
                      >
                        {/* Stop number or icon */}
                        <div className="flex flex-col items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                            stop.is_starting_point || stop.is_return
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-primary text-primary-foreground'
                          }`}>
                            {stop.is_starting_point ? (
                              <MapPin className="h-4 w-4" />
                            ) : stop.is_return ? (
                              <Navigation className="h-4 w-4" />
                            ) : (
                              stop.stop_number - 1
                            )}
                          </div>
                          {index < generatedRoute.stops.length - 1 && (
                            <div className="w-0.5 h-12 bg-border" />
                          )}
                        </div>

                        {/* Stop details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="font-medium">{stop.customer_name}</p>
                            {stop.job_number && (
                              <Badge variant="outline" className="text-xs shrink-0">
                                {stop.job_number}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{stop.address}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Arrive: {new Date(stop.arrival_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {stop.visit_duration_minutes > 0 && (
                              <>
                                <span>•</span>
                                <div>Visit: {stop.visit_duration_minutes}min</div>
                              </>
                            )}
                            {stop.travel_time_to_next_minutes > 0 && (
                              <>
                                <span>•</span>
                                <div>Travel to next: {stop.travel_time_to_next_minutes}min (inc. 30min buffer)</div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-4 border-t">
                {approvalSuccess ? (
                  <div className="flex-1 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
                    <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-green-400" />
                    <p className="font-semibold text-green-300">Appointments Created!</p>
                    <p className="text-sm text-green-400/80 mt-1">
                      Jobs moved to Survey Booked stage and added to calendar
                    </p>
                  </div>
                ) : (
                  <>
                    <Button
                      className="flex-1"
                      size="lg"
                      onClick={handleApproveRoute}
                      disabled={approving}
                    >
                      {approving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating Appointments...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Approve & Create Appointments
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => setGeneratedRoute(null)}
                      disabled={approving}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        ) : !generationError && (
          <Card className="p-8 text-center text-muted-foreground">
            <Route className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium mb-1">No routes generated yet</p>
            <p className="text-sm">
              Select customers and click &quot;Generate Routes&quot; to create optimized visit schedules
            </p>
          </Card>
        )}
      </div>
    
  )
}
