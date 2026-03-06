import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getOSPlacesService } from '@/lib/services/os-places.service'
import { getGoogleSolarService } from '@/lib/services/google-solar.service'
import type { SolarVisualizationData } from '@/lib/services/solar-api.types'

/**
 * GET /api/customers/:id/solar-layers - Get solar visualization data for a customer property
 * Session 80: Combines dataLayers:get and buildingInsights:findClosest for full visualization
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true'
    console.log('[GET /api/customers/:id/solar-layers] Request received for customer:', id, 'forceRefresh:', forceRefresh)

    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    // Fetch customer with minimal projection
    console.log('[GET /api/customers/:id/solar-layers] Fetching customer:', id)
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, postcode, address_line_1, metadata')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (customerError) {
      console.error('[GET /api/customers/:id/solar-layers] Error fetching customer:', customerError)
      return NextResponse.json(
        { error: customerError.message || 'Failed to fetch customer' },
        { status: 500 }
      )
    }

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Check cache - if we have fresh data OR error (< 24h), return it
    const metadata = customer.metadata as Record<string, unknown> | null
    const cachedVisualization = metadata?.solar_visualization as SolarVisualizationData | undefined
    const cachedError = metadata?.solar_visualization_error as string | undefined
    const cachedAt = metadata?.solar_visualization_fetched_at as string | undefined

    if (cachedAt && !forceRefresh) {
      const cacheAge = Date.now() - new Date(cachedAt).getTime()
      const maxCacheAge = 24 * 60 * 60 * 1000 // 24 hours

      if (cacheAge < maxCacheAge) {
        // If we have cached data, return it (with fixed URLs)
        if (cachedVisualization) {
          console.log('[GET /api/customers/:id/solar-layers] Returning cached data:', {
            hasInsights: !!cachedVisualization.insights,
            hasLayers: !!cachedVisualization.layers,
            insightsCoverage: cachedVisualization.insightsCoverage,
            layersCoverage: cachedVisualization.layersCoverage,
          })

          // Fix legacy URLs that use geoTiff:get instead of geoTiff:run
          // Also trim whitespace/newlines that Google API sometimes includes
          const fixGeoTiffUrl = (url?: string) => {
            if (!url) return url
            return url.trim().replace('/geoTiff:get?', '/geoTiff:run?')
          }

          if (cachedVisualization.layers) {
            cachedVisualization.layers = {
              ...cachedVisualization.layers,
              rgbUrl: fixGeoTiffUrl(cachedVisualization.layers.rgbUrl),
              annualFluxUrl: fixGeoTiffUrl(cachedVisualization.layers.annualFluxUrl),
              dsmUrl: fixGeoTiffUrl(cachedVisualization.layers.dsmUrl),
              maskUrl: fixGeoTiffUrl(cachedVisualization.layers.maskUrl),
              monthlyFluxUrl: fixGeoTiffUrl(cachedVisualization.layers.monthlyFluxUrl),
              hourlyShadeUrls: cachedVisualization.layers.hourlyShadeUrls?.map(fixGeoTiffUrl).filter((url): url is string => url !== undefined),
            }
          }

          return NextResponse.json({ data: cachedVisualization })
        }

        // If we have a cached error (no coverage), return it
        if (cachedError) {
          console.log('[GET /api/customers/:id/solar-layers] Returning cached error:', cachedError)
          return NextResponse.json({ data: null })
        }
      }
    }

    if (!customer.postcode) {
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

      console.log('[GET /api/customers/:id/solar-layers] Resolving address with OS Places find endpoint...')

      // Use OS Places "find" endpoint with full address text
      // This is the most accurate method for UK addresses (tested: 2.63m accuracy vs Google's 115m)
      const osAddress = await osPlacesService.findAddress(fullAddress)

      if (osAddress) {
        propertyLocation = {
          latitude: osAddress.latitude,
          longitude: osAddress.longitude,
        }
        console.log('[GET /api/customers/:id/solar-layers] ✓ OS Places success:', {
          uprn: osAddress.uprn,
          address: osAddress.fullAddress,
          lat: propertyLocation.latitude,
          lng: propertyLocation.longitude,
        })
      }

      if (!propertyLocation) {
        throw new Error('Could not resolve property location')
      }

      console.log('[GET /api/customers/:id/solar-layers] Final resolved location:', {
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
        .from('customers')
        .update({ metadata: updatedMetadata })
        .eq('id', id)
        .eq('tenant_id', tenantId)

      console.log('[GET /api/customers/:id/solar-layers] Successfully fetched and cached solar visualization data')
      return NextResponse.json({ data: visualizationData })

    } catch (error) {
      console.error('[GET /api/customers/:id/solar-layers] Error fetching solar data:', error)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to fetch solar data' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in GET /api/customers/:id/solar-layers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
