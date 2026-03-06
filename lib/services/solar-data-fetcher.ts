/**
 * Solar Data Fetcher
 *
 * Reusable helper for fetching and caching Google Solar visualization data
 * for customers and jobs. Used by API endpoints and background jobs.
 */

import { getGoogleSolarService } from './google-solar.service'
import { getOSPlacesService } from './os-places.service'
import { createClient } from '@/lib/supabase/server'
import type { SolarVisualizationData } from './solar-api.types'

export interface FetchSolarDataOptions {
  postcode: string
  addressLine1?: string
  force?: boolean // Skip cache check
}

export interface FetchSolarDataResult {
  success: boolean
  data?: SolarVisualizationData
  error?: string
  cached?: boolean
}

/**
 * Fetch solar visualization data for a property address
 */
export async function fetchSolarData(
  options: FetchSolarDataOptions
): Promise<FetchSolarDataResult> {
  try {
    console.log('[fetchSolarData] Starting fetch:', {
      postcode: options.postcode,
      hasAddress: !!options.addressLine1,
    })

    // Get service instances (with proper env var loading)
    const googleSolarService = getGoogleSolarService()
    const osPlacesService = getOSPlacesService()

    // Step 1: Resolve property location via OS Places
    // Prefer free-text findAddress (tested ~2.6m accuracy) and fall back to
    // postcode search if needed.
    let propertyLocation

    if (!osPlacesService.isConfigured()) {
      throw new Error('OS Places API key not configured')
    }

    if (options.addressLine1) {
      const fullAddress = `${options.addressLine1}, ${options.postcode}`
      const osAddress = await osPlacesService.findAddress(fullAddress)

      if (osAddress) {
        propertyLocation = osAddress
      } else {
        const addresses = await osPlacesService.searchByPostcode(options.postcode)
        propertyLocation = addresses[0] || null
      }
    } else {
      const addresses = await osPlacesService.searchByPostcode(options.postcode)
      propertyLocation = addresses[0] || null
    }

    if (!propertyLocation) {
      return {
        success: false,
        error: 'Could not resolve property location',
      }
    }

    console.log('[fetchSolarData] Resolved location:', {
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

    console.log('[fetchSolarData] Fetch results:', {
      layersCoverage: dataLayersResult.coverage,
      insightsCoverage: buildingInsightsResult.coverage,
      hasLayers: !!dataLayersResult.layers,
      hasInsights: !!buildingInsightsResult.insights,
    })

    // Check if we have any coverage
    if (
      dataLayersResult.coverage === 'NONE' &&
      buildingInsightsResult.coverage === 'NONE'
    ) {
      return {
        success: false,
        error: 'Solar imagery not available for this property',
      }
    }

    // Step 3: Build combined visualization data
    const boundingBox = buildingInsightsResult.insights?.boundingBox
    const bounds =
      boundingBox?.sw && boundingBox?.ne
        ? {
            sw: boundingBox.sw,
            ne: boundingBox.ne,
          }
        : undefined

    const visualizationData: SolarVisualizationData = {
      insights: buildingInsightsResult.insights,
      insightsCoverage: buildingInsightsResult.coverage,
      layers: dataLayersResult.layers,
      layersCoverage: dataLayersResult.coverage,
      center: buildingInsightsResult.insights?.center || {
        latitude: propertyLocation.latitude,
        longitude: propertyLocation.longitude,
      },
      bounds,
      panels: buildingInsightsResult.insights?.solarPotential?.solarPanels,
      panelConfigs:
        buildingInsightsResult.insights?.solarPotential?.solarPanelConfigs,
      roofSegments:
        buildingInsightsResult.insights?.solarPotential?.solarPanelConfigs?.[0]
          ?.roofSegmentSummaries,
    }

    console.log('[fetchSolarData] Successfully built visualization data')

    return {
      success: true,
      data: visualizationData,
    }
  } catch (error) {
    console.error('[fetchSolarData] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Fetch and cache solar data for a customer
 */
export async function fetchAndCacheCustomerSolarData(
  customerId: string,
  options: FetchSolarDataOptions
): Promise<FetchSolarDataResult> {
  try {
    // Fetch solar data
    const result = await fetchSolarData(options)

    // Cache the result (success OR failure) so we don't keep retrying
    const supabase = await createClient()

    // First get the existing metadata to merge with
    const { data: customer } = await supabase
      .from('customers')
      .select('metadata')
      .eq('id', customerId)
      .single()

    const existingMetadata = (customer?.metadata || {}) as Record<string, unknown>

    const { error: updateError } = await supabase
      .from('customers')
      .update({
        metadata: {
          ...existingMetadata,
          solar_visualization: result.data || null,
          solar_visualization_fetched_at: new Date().toISOString(),
          solar_visualization_error: result.success ? null : (result.error || 'Unknown error'),
        },
      })
      .eq('id', customerId)

    if (updateError) {
      console.error('[fetchAndCacheCustomerSolarData] Cache error:', updateError)
      // Still return the fetch result
      return {
        ...result,
        error: result.error || 'Data fetched but cache failed',
      }
    }

    if (result.success) {
      console.log('[fetchAndCacheCustomerSolarData] Successfully cached data for customer:', customerId)
    } else {
      console.log('[fetchAndCacheCustomerSolarData] Cached failure state for customer:', customerId, result.error)
    }

    return result
  } catch (error) {
    console.error('[fetchAndCacheCustomerSolarData] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Fetch and cache solar data for a job
 */
export async function fetchAndCacheJobSolarData(
  jobId: string,
  options: FetchSolarDataOptions
): Promise<FetchSolarDataResult> {
  try {
    // Fetch solar data
    const result = await fetchSolarData(options)

    // Cache the result (success OR failure) so we don't keep retrying
    const supabase = await createClient()

    // First get the existing metadata to merge with
    const { data: job } = await supabase
      .from('jobs')
      .select('metadata')
      .eq('id', jobId)
      .single()

    const existingMetadata = (job?.metadata || {}) as Record<string, unknown>

    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        metadata: {
          ...existingMetadata,
          solar_visualization: result.data || null,
          solar_visualization_fetched_at: new Date().toISOString(),
          solar_visualization_error: result.success ? null : (result.error || 'Unknown error'),
        },
      })
      .eq('id', jobId)

    if (updateError) {
      console.error('[fetchAndCacheJobSolarData] Cache error:', updateError)
      return {
        ...result,
        error: result.error || 'Data fetched but cache failed',
      }
    }

    if (result.success) {
      console.log('[fetchAndCacheJobSolarData] Successfully cached data for job:', jobId)
    } else {
      console.log('[fetchAndCacheJobSolarData] Cached failure state for job:', jobId, result.error)
    }

    return result
  } catch (error) {
    console.error('[fetchAndCacheJobSolarData] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
