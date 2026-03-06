import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders, getUserIdFromHeaders, getUserRoleFromHeaders } from '@/lib/supabase/tenant-context'
import { canViewAllJobs } from '@/lib/auth/permissions'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getOSPlacesService } from '@/lib/services/os-places.service'
import { getGoogleSolarService } from '@/lib/services/google-solar.service'
import type { SolarVisualizationData } from '@/lib/services/solar-api.types'

/**
 * GET /api/jobs/:id/solar-layers - Get solar visualization data (imagery + panel layouts)
 * Session 80: Combines dataLayers:get and buildingInsights:findClosest for full visualization
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('[GET /api/jobs/:id/solar-layers] Request received for job:', id)

    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const currentUserId = await getUserIdFromHeaders(headersList)
    const currentUserRole = await getUserRoleFromHeaders(headersList)

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

    // Fetch job with customer data
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, assigned_to, customer_id, metadata')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (jobError) {
      console.error('[GET /api/jobs/:id/solar-layers] Error fetching job:', jobError)
      return NextResponse.json(
        { error: jobError.message || 'Failed to fetch job' },
        { status: 500 }
      )
    }

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Check permissions
    const canSeeAllJobs = canViewAllJobs(currentUserRole)
    if (!canSeeAllJobs && job.assigned_to !== currentUserId) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Check cache - if we have fresh data OR error (< 24h), return it
    const metadata = job.metadata as Record<string, unknown> | null
    const cachedVisualization = metadata?.solar_visualization as SolarVisualizationData | undefined
    const cachedError = metadata?.solar_visualization_error as string | undefined
    const cachedAt = metadata?.solar_visualization_fetched_at as string | undefined

    if (cachedAt) {
      const cacheAge = Date.now() - new Date(cachedAt).getTime()
      const maxCacheAge = 24 * 60 * 60 * 1000 // 24 hours

      if (cacheAge < maxCacheAge) {
        // If we have cached data, return it
        if (cachedVisualization) {
          console.log('[GET /api/jobs/:id/solar-layers] Returning cached data')
          return NextResponse.json({ data: cachedVisualization })
        }

        // If we have a cached error (no coverage), return it
        if (cachedError) {
          console.log('[GET /api/jobs/:id/solar-layers] Returning cached error:', cachedError)
          return NextResponse.json({ data: null })
        }
      }
    }

    // Fetch customer data for location
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('postcode, address_line_1')
      .eq('id', job.customer_id)
      .maybeSingle()

    if (customerError) {
      console.error('[GET /api/jobs/:id/solar-layers] Error fetching customer:', customerError)
      return NextResponse.json(
        { error: 'Failed to fetch customer data' },
        { status: 500 }
      )
    }

    if (!customer?.postcode) {
      return NextResponse.json(
        { error: 'Property location required. Please update customer address.' },
        { status: 400 }
      )
    }

    // Get services
    const googleSolarService = getGoogleSolarService()
    const osPlacesService = getOSPlacesService()

    if (!googleSolarService.isConfigured()) {
      return NextResponse.json(
        { error: 'Solar analysis not available' },
        { status: 503 }
      )
    }

    try {
      // Step 1: Resolve property location via OS Places API (TESTED: 2.63m accuracy!)
      let propertyLocation: { latitude: number; longitude: number } | null = null

      if (!osPlacesService.isConfigured()) {
        throw new Error('OS Places API not configured')
      }

      // Build full address for free text search
      const addressParts = [
        customer.address_line_1,
        customer.postcode,
      ].filter(Boolean)

      if (addressParts.length === 0) {
        throw new Error('No address information available')
      }

      const fullAddress = addressParts.join(', ')

      console.log('[GET /api/jobs/:id/solar-layers] Resolving address with OS Places find endpoint...')

      // Use OS Places "find" endpoint with full address text
      // This is the most accurate method for UK addresses (tested: 2.63m accuracy vs Google's 115m)
      const osAddress = await osPlacesService.findAddress(fullAddress)

      if (osAddress) {
        propertyLocation = {
          latitude: osAddress.latitude,
          longitude: osAddress.longitude,
        }
        console.log('[GET /api/jobs/:id/solar-layers] ✓ OS Places success:', {
          uprn: osAddress.uprn,
          address: osAddress.fullAddress,
          lat: propertyLocation.latitude,
          lng: propertyLocation.longitude,
        })
      }

      if (!propertyLocation) {
        throw new Error('Could not resolve property location')
      }

      console.log('[GET /api/jobs/:id/solar-layers] Final resolved location:', {
        lat: propertyLocation.latitude,
        lng: propertyLocation.longitude,
      })

      // Step 2: Fetch both data layers and building insights in parallel
      const [dataLayersResult, buildingInsightsResult] = await Promise.all([
        googleSolarService.getDataLayers({
          latitude: propertyLocation.latitude,
          longitude: propertyLocation.longitude,
        }),
        googleSolarService.getPropertySolarData({
          latitude: propertyLocation.latitude,
          longitude: propertyLocation.longitude,
        }),
      ])

      // Check if we have any coverage
      if (dataLayersResult.coverage === 'NONE' && buildingInsightsResult.coverage === 'NONE') {
        return NextResponse.json({
          error: 'Solar imagery not available for this property',
        }, { status: 404 })
      }

      // Step 3: Build combined visualization data
      const boundingBox = buildingInsightsResult.insights?.boundingBox
      const bounds = (boundingBox?.sw && boundingBox?.ne) ? {
        sw: boundingBox.sw,
        ne: boundingBox.ne,
      } : undefined

      const visualizationData: SolarVisualizationData = {
        insights: buildingInsightsResult.insights,
        insightsCoverage: buildingInsightsResult.coverage,
        layers: dataLayersResult.layers,
        layersCoverage: dataLayersResult.coverage,
        // Always use OS Places coordinates (UK authority for address data)
        // Google Solar's center can be inaccurate if it detects wrong building
        center: {
          latitude: propertyLocation.latitude,
          longitude: propertyLocation.longitude,
        },
        bounds,
        panels: buildingInsightsResult.insights?.solarPotential?.solarPanels,
        panelConfigs: buildingInsightsResult.insights?.solarPotential?.solarPanelConfigs,
        roofSegments: buildingInsightsResult.insights?.solarPotential?.solarPanelConfigs?.[0]?.roofSegmentSummaries,
      }

      // Step 4: Cache the results
      const updatedMetadata = {
        ...metadata,
        solar_visualization: visualizationData,
        solar_visualization_fetched_at: new Date().toISOString(),
      }

      await supabase
        .from('jobs')
        .update({ metadata: updatedMetadata })
        .eq('id', id)
        .eq('tenant_id', tenantId)

      console.log('[GET /api/jobs/:id/solar-layers] Successfully fetched and cached solar visualization data')
      return NextResponse.json({ data: visualizationData })

    } catch (error) {
      console.error('[GET /api/jobs/:id/solar-layers] Error fetching solar data:', error)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to fetch solar data' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in GET /api/jobs/:id/solar-layers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
