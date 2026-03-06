/**
 * Google Solar Service (Session 77)
 * Wrapper for Google Solar API for real solar potential analysis
 *
 * Enterprise Readiness: Added retry logic with exponential backoff
 */

import type {
  BuildingInsightsResponse,
  PropertySolarData,
  CoverageQuality,
  DataLayersResponse,
  PropertyDataLayers,
} from './solar-api.types'
import { retryWithBackoff, isRetryableHttpStatus } from '@/lib/utils/retry'

export class GoogleSolarService {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_SOLAR_API_KEY || ''
    this.baseUrl = baseUrl || process.env.GOOGLE_SOLAR_BASE_URL || 'https://solar.googleapis.com/v1'
  }

  /**
   * Check if the service is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey
  }

  /**
   * Get solar data for a property location
   * Uses buildingInsights:findClosest with quality fallback (HIGH → MEDIUM → BASE)
   */
  async getPropertySolarData(location: {
    latitude: number
    longitude: number
  }): Promise<PropertySolarData> {
    if (!this.isConfigured()) {
      throw new Error('Google Solar API key not configured')
    }

    const { latitude, longitude } = location

    console.log('[GoogleSolarService] Fetching solar data for:', { latitude, longitude })

    // Try quality levels in order: HIGH → MEDIUM → BASE
    const qualityLevels: CoverageQuality[] = ['HIGH', 'MEDIUM', 'BASE']

    for (const quality of qualityLevels) {
      try {
        const insights = await this.fetchBuildingInsights(latitude, longitude, quality)

        if (insights) {
          console.log(`[GoogleSolarService] Found data with ${quality} quality`)
          return {
            insights,
            coverage: quality,
          }
        }
      } catch (error: unknown) {
        // If it's a NOT_FOUND or no coverage error, try next quality level
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (errorMessage.includes('NOT_FOUND') || errorMessage.includes('404')) {
          console.log(`[GoogleSolarService] No ${quality} coverage, trying next level`)
          continue
        }
        // For other errors, rethrow
        throw error
      }
    }

    // No coverage at any quality level
    console.log('[GoogleSolarService] No coverage at any quality level')
    return {
      insights: null,
      coverage: 'NONE',
    }
  }

  /**
   * Get data layers (imagery URLs) for a property location
   * Uses dataLayers:get endpoint with quality fallback (HIGH → MEDIUM → LOW)
   * Session 80
   */
  async getDataLayers(
    location: { latitude: number; longitude: number },
    options?: {
      radiusMeters?: number
      pixelSizeMeters?: number
      view?: 'FULL_LAYERS' | 'IMAGERY_AND_ANNUAL_FLUX_LAYERS' | 'IMAGERY_QUALITY'
      requiredQuality?: CoverageQuality
    }
  ): Promise<PropertyDataLayers> {
    if (!this.isConfigured()) {
      throw new Error('Google Solar API key not configured')
    }

    const { latitude, longitude } = location
    const radiusMeters = options?.radiusMeters ?? 100
    const pixelSizeMeters = options?.pixelSizeMeters ?? 0.5
    const view = options?.view ?? 'FULL_LAYERS'

    console.log('[GoogleSolarService] Fetching data layers for:', { latitude, longitude })

    // Try quality levels in order: HIGH → MEDIUM → LOW
    const qualityLevels: Array<'HIGH' | 'MEDIUM' | 'LOW'> = ['HIGH', 'MEDIUM', 'LOW']

    for (const quality of qualityLevels) {
      try {
        const layers = await this.fetchDataLayers(
          latitude,
          longitude,
          quality,
          radiusMeters,
          pixelSizeMeters,
          view
        )

        if (layers) {
          console.log(`[GoogleSolarService] Found data layers with ${quality} quality`)

          // Append API key to all URLs for browser access
          const layersWithKeys = this.appendApiKeyToUrls(layers)

          return {
            layers: layersWithKeys,
            coverage: quality as CoverageQuality,
          }
        }
      } catch (error: unknown) {
        // If it's a NOT_FOUND or no coverage error, try next quality level
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (errorMessage.includes('NOT_FOUND') || errorMessage.includes('404')) {
          console.log(`[GoogleSolarService] No ${quality} coverage, trying next level`)
          continue
        }
        // For other errors, rethrow
        throw error
      }
    }

    // No coverage at any quality level
    console.log('[GoogleSolarService] No data layers coverage at any quality level')
    return {
      layers: null,
      coverage: 'NONE',
    }
  }

  /**
   * Append API key to GeoTIFF URLs for browser access
   * Also fixes Google API bug: geoTiff:get -> geoTiff:run
   */
  private appendApiKeyToUrls(layers: DataLayersResponse): DataLayersResponse {
    const fixUrl = (url?: string) => {
      if (!url) return undefined
      // Trim whitespace and newlines that Google API sometimes includes
      const cleanUrl = url.trim()
      // Google Solar API returns URLs with 'geoTiff:get' but the correct endpoint is 'geoTiff:run'
      // This causes 400 Bad Request errors in the browser
      const fixedUrl = cleanUrl.replace('/geoTiff:get?', '/geoTiff:run?')
      return `${fixedUrl}&key=${this.apiKey}`
    }

    return {
      ...layers,
      rgbUrl: fixUrl(layers.rgbUrl),
      annualFluxUrl: fixUrl(layers.annualFluxUrl),
      dsmUrl: fixUrl(layers.dsmUrl),
      maskUrl: fixUrl(layers.maskUrl),
      monthlyFluxUrl: fixUrl(layers.monthlyFluxUrl),
      hourlyShadeUrls: layers.hourlyShadeUrls?.map(fixUrl).filter((url): url is string => url !== undefined),
    }
  }

  /**
   * Fetch data layers for a specific quality level
   */
  private async fetchDataLayers(
    latitude: number,
    longitude: number,
    requiredQuality: 'HIGH' | 'MEDIUM' | 'LOW',
    radiusMeters: number,
    pixelSizeMeters: number,
    view: string
  ): Promise<DataLayersResponse | null> {
    const url = `${this.baseUrl}/dataLayers:get?location.latitude=${latitude}&location.longitude=${longitude}&radiusMeters=${radiusMeters}&view=${view}&requiredQuality=${requiredQuality}&pixelSizeMeters=${pixelSizeMeters}&key=${this.apiKey}`

    try {
      return await retryWithBackoff(
        async () => {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
          })

          if (!response.ok) {
            if (response.status === 404) {
              // No data at this quality level - don't retry
              return null
            }

            // Retry on 5xx errors
            if (isRetryableHttpStatus(response.status)) {
              const errorText = await response.text()
              const error = new Error(`Google Solar Data Layers API error: ${response.status}`) as Error & {
                status: number
                statusText: string
                responseText: string
              }
              error.status = response.status
              error.statusText = response.statusText
              error.responseText = errorText
              throw error
            }

            // Non-retryable error
            const errorText = await response.text()
            console.error('[GoogleSolarService] Data layers API error:', response.status, errorText)
            throw new Error(`Google Solar Data Layers API error: ${response.status}`)
          }

          const data = await response.json()
          return data as DataLayersResponse
        },
        {
          maxAttempts: 3,
          initialDelay: 1000,
          shouldRetry: (error) => {
            if (error instanceof TypeError) return true
            if (error instanceof Error && 'status' in error) {
              return isRetryableHttpStatus((error as Error & { status: number }).status)
            }
            return false
          },
          onRetry: (error, attempt, delay) => {
            console.log(`[GoogleSolarService] Retrying dataLayers (attempt ${attempt}/3) after ${delay}ms`, {
              quality: requiredQuality,
              error: error instanceof Error ? error.message : String(error),
            })
          },
        }
      )
    } catch (error: unknown) {
      // If fetch fails with network error or 404, return null to try next quality
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('fetch') || errorMessage.includes('404')) {
        return null
      }
      throw error
    }
  }

  /**
   * Fetch building insights for a specific quality level
   */
  private async fetchBuildingInsights(
    latitude: number,
    longitude: number,
    requiredQuality: CoverageQuality
  ): Promise<BuildingInsightsResponse | null> {
    const url = `${this.baseUrl}/buildingInsights:findClosest?location.latitude=${latitude}&location.longitude=${longitude}&requiredQuality=${requiredQuality}&key=${this.apiKey}`

    try {
      return await retryWithBackoff(
        async () => {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
          })

          if (!response.ok) {
            if (response.status === 404) {
              // No data at this quality level - don't retry
              return null
            }

            // Retry on 5xx errors
            if (isRetryableHttpStatus(response.status)) {
              const errorText = await response.text()
              const error = new Error(`Google Solar API error: ${response.status}`) as Error & {
                status: number
                statusText: string
                responseText: string
              }
              error.status = response.status
              error.statusText = response.statusText
              error.responseText = errorText
              throw error
            }

            // Non-retryable error
            const errorText = await response.text()
            console.error('[GoogleSolarService] API error:', response.status, errorText)
            throw new Error(`Google Solar API error: ${response.status}`)
          }

          const data = await response.json()
          return data as BuildingInsightsResponse
        },
        {
          maxAttempts: 3,
          initialDelay: 1000,
          shouldRetry: (error) => {
            if (error instanceof TypeError) return true
            if (error instanceof Error && 'status' in error) {
              return isRetryableHttpStatus((error as Error & { status: number }).status)
            }
            return false
          },
          onRetry: (error, attempt, delay) => {
            console.log(`[GoogleSolarService] Retrying buildingInsights (attempt ${attempt}/3) after ${delay}ms`, {
              quality: requiredQuality,
              error: error instanceof Error ? error.message : String(error),
            })
          },
        }
      )
    } catch (error: unknown) {
      // If fetch fails with network error or 404, return null to try next quality
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('fetch') || errorMessage.includes('404')) {
        return null
      }
      throw error
    }
  }
}

// Singleton instance
let googleSolarService: GoogleSolarService | null = null

export function getGoogleSolarService(): GoogleSolarService {
  if (!googleSolarService) {
    googleSolarService = new GoogleSolarService()
  }
  return googleSolarService
}
