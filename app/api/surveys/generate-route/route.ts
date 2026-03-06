import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders, getUserIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/surveys/generate-route
 *
 * Generates optimized survey route using Google Maps Distance Matrix API
 * Calculates travel times, optimizes stop order, schedules with 90-min visits + 30-min traffic buffer
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const currentUserId = await getUserIdFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'No user context' },
        { status: 400 }
      )
    }

    // Check for Google Maps API key (try multiple env var names for compatibility)
    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY?.trim()
    if (!googleMapsApiKey) {
      return NextResponse.json(
        {
          error: 'Google Maps API key not configured',
          message: 'Please add GOOGLE_MAPS_API_KEY to your environment variables to enable route generation.'
        },
        { status: 500 }
      )
    }

    // Parse request body
    const body = await request.json()
    const {
      job_ids,
      route_date,
      starting_location,
      visit_duration_minutes = 90,
      max_visits,
    } = body

    if (!job_ids || !Array.isArray(job_ids) || job_ids.length === 0) {
      return NextResponse.json(
        { error: 'No jobs selected' },
        { status: 400 }
      )
    }

    if (!route_date) {
      return NextResponse.json(
        { error: 'No route date provided' },
        { status: 400 }
      )
    }

    if (!starting_location) {
      return NextResponse.json(
        { error: 'No starting location provided' },
        { status: 400 }
      )
    }

    console.log('[/api/surveys/generate-route] Request:', {
      job_ids,
      route_date,
      starting_location,
      visit_duration_minutes,
      max_visits,
    })

    // Fetch job and customer data
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select(`
        id,
        job_number,
        customer_id,
        customer:customers(
          id,
          name,
          email,
          phone,
          address_line_1,
          address_line_2,
          city,
          postcode
        )
      `)
      .in('id', job_ids)

    if (jobsError) {
      console.error('[/api/surveys/generate-route] Error fetching jobs:', jobsError)
      return NextResponse.json(
        { error: 'Failed to fetch job data' },
        { status: 500 }
      )
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json(
        { error: 'No valid jobs found' },
        { status: 404 }
      )
    }

    // Build addresses for geocoding and distance matrix
    interface JobWithAddress {
      job_id: string
      job_number: string
      customer_id: string
      customer_name: string
      address: string
      full_address: string
      lat?: number
      lng?: number
    }

    interface JobFromDB {
      id: string
      job_number: string
      customer_id: string
      customer: {
        id: string
        name: string
        email: string | null
        phone: string | null
        address_line_1: string | null
        address_line_2: string | null
        city: string | null
        postcode: string | null
      } | Array<{
        id: string
        name: string
        email: string | null
        phone: string | null
        address_line_1: string | null
        address_line_2: string | null
        city: string | null
        postcode: string | null
      }>
    }

    const jobsWithAddresses: JobWithAddress[] = jobs.map((job: JobFromDB) => {
      const customerArray = Array.isArray(job.customer) ? job.customer : job.customer ? [job.customer] : []
      const customer = customerArray[0]

      const addressParts = [
        customer?.address_line_1,
        customer?.address_line_2,
        customer?.city,
        customer?.postcode,
      ].filter(Boolean)

      return {
        job_id: job.id,
        job_number: job.job_number,
        customer_id: job.customer_id,
        customer_name: customer?.name || '',
        address: `${customer?.address_line_1 || ''}, ${customer?.city || ''} ${customer?.postcode || ''}`.trim(),
        full_address: addressParts.join(', '),
      }
    })

    console.log('[/api/surveys/generate-route] Jobs with addresses:', jobsWithAddresses)

    // Step 1: Enforce max_visits limit by selecting only first N jobs
    const maxVisits = max_visits || 10 // Default to 10 if not specified
    const jobsToRoute = jobsWithAddresses.slice(0, maxVisits)
    const unassignedJobs = jobsWithAddresses.slice(maxVisits) // Jobs that exceed max_visits

    console.log(`[/api/surveys/generate-route] Routing ${jobsToRoute.length} jobs (max: ${maxVisits}), ${unassignedJobs.length} unassigned`)

    // Step 2: Geocode all addresses (starting location + selected customer addresses)
    const geocodedLocations: Array<{ address: string; lat: number; lng: number; index: number }> = []
    const failedGeocodes: Array<{ address: string; job_id: string; reason: string }> = []

    // Geocode starting location first
    try {
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(starting_location)}&key=${googleMapsApiKey}`
      const geocodeResponse = await fetch(geocodeUrl)
      const geocodeData = await geocodeResponse.json()

      if (geocodeData.status === 'OK' && geocodeData.results[0]) {
        const location = geocodeData.results[0].geometry.location
        geocodedLocations.push({
          address: starting_location,
          lat: location.lat,
          lng: location.lng,
          index: 0,
        })
        console.log(`[Geocode] ${starting_location} → ${location.lat}, ${location.lng}`)
      } else {
        console.error(`[Geocode] Failed for starting location ${starting_location}:`, geocodeData.status)
        return NextResponse.json(
          {
            error: 'Failed to geocode starting location',
            message: `Could not find coordinates for: ${starting_location}`
          },
          { status: 400 }
        )
      }
    } catch (error) {
      console.error(`[Geocode] Error for starting location:`, error)
      return NextResponse.json(
        {
          error: 'Failed to geocode starting location',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }

    // Geocode customer addresses
    for (let i = 0; i < jobsToRoute.length; i++) {
      const job = jobsToRoute[i]
      const address = job.full_address

      try {
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleMapsApiKey}`
        const geocodeResponse = await fetch(geocodeUrl)
        const geocodeData = await geocodeResponse.json()

        if (geocodeData.status === 'OK' && geocodeData.results[0]) {
          const location = geocodeData.results[0].geometry.location
          geocodedLocations.push({
            address,
            lat: location.lat,
            lng: location.lng,
            index: i + 1, // +1 because index 0 is starting location
          })
          console.log(`[Geocode] ${address} → ${location.lat}, ${location.lng}`)
        } else {
          console.error(`[Geocode] Failed for ${address}:`, geocodeData.status)
          failedGeocodes.push({
            address,
            job_id: job.job_id,
            reason: `Geocoding failed: ${geocodeData.status}`
          })
          // Add to unassigned jobs
          unassignedJobs.push(job)
        }
      } catch (error) {
        console.error(`[Geocode] Error for ${address}:`, error)
        failedGeocodes.push({
          address,
          job_id: job.job_id,
          reason: error instanceof Error ? error.message : 'Unknown error'
        })
        // Add to unassigned jobs
        unassignedJobs.push(job)
      }
    }

    if (geocodedLocations.length < 2) {
      return NextResponse.json(
        {
          error: 'Insufficient geocoded locations',
          message: 'Need at least starting location + 1 customer address to generate route',
          failed_geocodes: failedGeocodes
        },
        { status: 400 }
      )
    }

    console.log(`[Geocode] Successfully geocoded ${geocodedLocations.length} locations, ${failedGeocodes.length} failed`)

    // Step 2: Build Distance Matrix
    // Format: origins and destinations as lat,lng pairs
    const origins = geocodedLocations.map(loc => `${loc.lat},${loc.lng}`).join('|')
    const destinations = origins // Square matrix - all locations to all locations

    const distanceMatrixUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origins)}&destinations=${encodeURIComponent(destinations)}&mode=driving&departure_time=now&key=${googleMapsApiKey}`

    console.log('[Distance Matrix] Fetching...')
    const distanceResponse = await fetch(distanceMatrixUrl)
    const distanceData = await distanceResponse.json()

    if (distanceData.status !== 'OK') {
      console.error('[Distance Matrix] Error:', distanceData)
      return NextResponse.json(
        {
          error: 'Failed to calculate distances',
          message: distanceData.error_message || 'Google Maps API error',
          google_status: distanceData.status,
          debug: {
            origin_count: geocodedLocations.length,
            api_key_prefix: googleMapsApiKey?.substring(0, 10) + '...',
          }
        },
        { status: 500 }
      )
    }

    // Parse distance matrix into 2D array
    // distanceMatrix[i][j] = travel time in minutes from location i to location j
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const distanceMatrix: number[][] = distanceData.rows.map((row: any) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      row.elements.map((element: any) => {
        if (element.status === 'OK') {
          // duration_in_traffic is available with departure_time=now
          const durationSeconds = element.duration_in_traffic?.value || element.duration.value
          const durationMinutes = Math.ceil(durationSeconds / 60)
          // Add 30-minute traffic buffer per user requirement
          return durationMinutes + 30
        }
        return 9999 // Unreachable
      })
    )

    console.log('[Distance Matrix] Calculated:', distanceMatrix)

    // Step 3: Optimize route order using Nearest Neighbor algorithm
    // Starting point is index 0 (starting_location)
    // Customer locations are indices 1 to n
    const numLocations = geocodedLocations.length
    const visited = new Set<number>([0]) // Start at index 0
    const route: number[] = [0] // Route indices
    let currentLocation = 0

    // Nearest neighbor: repeatedly visit closest unvisited location
    while (visited.size < numLocations) {
      let nearestLocation = -1
      let shortestTime = Infinity

      for (let i = 1; i < numLocations; i++) {
        if (!visited.has(i) && distanceMatrix[currentLocation][i] < shortestTime) {
          shortestTime = distanceMatrix[currentLocation][i]
          nearestLocation = i
        }
      }

      if (nearestLocation === -1) break // No more reachable locations

      route.push(nearestLocation)
      visited.add(nearestLocation)
      currentLocation = nearestLocation
    }

    // Add return to starting location
    route.push(0)

    console.log('[Route Optimization] Optimized order:', route)

    // Build mapping from geocoded location index to job
    const indexToJob: { [key: number]: JobWithAddress } = {}
    geocodedLocations.forEach(loc => {
      if (loc.index > 0) { // Skip starting location (index 0)
        const jobIndex = loc.index - 1
        if (jobIndex < jobsToRoute.length) {
          indexToJob[loc.index] = jobsToRoute[jobIndex]
        }
      }
    })

    // Step 4: Get tenant settings for start time
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('settings')
      .eq('id', tenantId)
      .single()

    const surveyStartTime = tenantData?.settings?.survey_start_time || '08:00'

    // Step 5: Generate timeline with arrival/departure times
    const routeStartTime = new Date(`${route_date}T${surveyStartTime}:00`)
    let currentTime = routeStartTime.getTime()

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

    const routeStops: RouteStop[] = []

    for (let i = 0; i < route.length - 1; i++) {
      const locationIndex = route[i]
      const nextLocationIndex = route[i + 1]
      const isStartingPoint = locationIndex === 0 && i === 0

      // Get location details
      let jobInfo: JobWithAddress | null = null
      if (locationIndex > 0) {
        jobInfo = indexToJob[locationIndex] || null
      }

      const arrivalTime = new Date(currentTime)
      const visitDuration = isStartingPoint ? 0 : visit_duration_minutes
      const departureTime = new Date(currentTime + visitDuration * 60 * 1000)
      const travelTimeToNext = distanceMatrix[locationIndex][nextLocationIndex]

      routeStops.push({
        stop_number: i + 1,
        job_id: jobInfo?.job_id || null,
        job_number: jobInfo?.job_number || null,
        customer_name: isStartingPoint ? 'Starting Point' : jobInfo?.customer_name || '',
        address: isStartingPoint ? starting_location : jobInfo?.full_address || '',
        arrival_time: arrivalTime.toISOString(),
        departure_time: departureTime.toISOString(),
        visit_duration_minutes: visitDuration,
        travel_time_to_next_minutes: travelTimeToNext,
        is_starting_point: isStartingPoint,
        is_return: false,
      })

      // Move time forward: visit duration + travel to next
      currentTime = departureTime.getTime() + travelTimeToNext * 60 * 1000
    }

    // Add final return to starting point
    const finalArrivalTime = new Date(currentTime)
    routeStops.push({
      stop_number: routeStops.length + 1,
      job_id: null,
      job_number: null,
      customer_name: 'Return to Starting Point',
      address: starting_location,
      arrival_time: finalArrivalTime.toISOString(),
      departure_time: finalArrivalTime.toISOString(),
      visit_duration_minutes: 0,
      travel_time_to_next_minutes: 0,
      is_starting_point: false,
      is_return: true,
    })

    // Calculate total stats
    const totalVisitMinutes = routeStops
      .filter(stop => !stop.is_starting_point && !stop.is_return)
      .reduce((sum, stop) => sum + stop.visit_duration_minutes, 0)

    const totalTravelMinutes = routeStops
      .reduce((sum, stop) => sum + stop.travel_time_to_next_minutes, 0)

    const totalDurationMinutes = totalVisitMinutes + totalTravelMinutes
    const totalStops = routeStops.filter(stop => !stop.is_starting_point && !stop.is_return).length

    console.log('[Route Generation] Complete:', {
      totalStops,
      totalVisitMinutes,
      totalTravelMinutes,
      totalDurationMinutes,
    })

    return NextResponse.json({
      success: true,
      route: {
        route_date,
        starting_location,
        total_stops: totalStops,
        total_visit_minutes: totalVisitMinutes,
        total_travel_minutes: totalTravelMinutes,
        total_duration_minutes: totalDurationMinutes,
        estimated_finish_time: finalArrivalTime.toISOString(),
        stops: routeStops,
      },
      unassigned_jobs: unassignedJobs.map(job => ({
        job_id: job.job_id,
        job_number: job.job_number,
        customer_name: job.customer_name,
        address: job.full_address,
        reason: failedGeocodes.find(f => f.job_id === job.job_id)?.reason || 'Exceeded max visits limit'
      })),
      warnings: failedGeocodes.length > 0 ? [
        `${failedGeocodes.length} location(s) could not be geocoded and were excluded from the route`
      ] : undefined,
    })

  } catch (error) {
    console.error('[/api/surveys/generate-route] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
