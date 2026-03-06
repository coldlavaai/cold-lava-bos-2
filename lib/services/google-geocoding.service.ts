/**
 * Google Geocoding Service (Session 80)
 * Uses Google Geocoding API for accurate UK address geocoding
 * More accurate than OS Places for individual house numbers
 */

export interface GeocodedAddress {
  formattedAddress: string
  latitude: number
  longitude: number
  locationType: 'ROOFTOP' | 'RANGE_INTERPOLATED' | 'GEOMETRIC_CENTER' | 'APPROXIMATE'
  placeId: string
  addressComponents: {
    streetNumber?: string
    route?: string
    locality?: string
    postalCode?: string
    country?: string
  }
}

interface GoogleGeocodingResult {
  formatted_address: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
    location_type: string
  }
  place_id: string
  address_components: Array<{
    long_name: string
    short_name: string
    types: string[]
  }>
}

interface GoogleGeocodingResponse {
  results: GoogleGeocodingResult[]
  status: string
  error_message?: string
}

export class GoogleGeocodingService {
  private apiKey: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ''
  }

  /**
   * Check if the service is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey
  }

  /**
   * Geocode a UK address to coordinates
   * Returns rooftop-level accuracy when available
   */
  async geocodeAddress(
    address: string,
    postcode: string
  ): Promise<GeocodedAddress | null> {
    if (!this.isConfigured()) {
      throw new Error('Google Geocoding API key not configured')
    }

    try {
      // Construct full address with postcode and UK region
      const fullAddress = `${address}, ${postcode}, UK`
      const encodedAddress = encodeURIComponent(fullAddress)

      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&region=uk&key=${this.apiKey}`

      console.log('[GoogleGeocodingService] Geocoding address:', fullAddress)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[GoogleGeocodingService] API error:', response.status, errorText)
        throw new Error(`Google Geocoding API error: ${response.status}`)
      }

      const data: GoogleGeocodingResponse = await response.json()

      if (data.status !== 'OK') {
        console.error('[GoogleGeocodingService] Geocoding failed:', data.status, data.error_message)
        return null
      }

      if (!data.results || data.results.length === 0) {
        console.log('[GoogleGeocodingService] No results found for address:', fullAddress)
        return null
      }

      // Get first result (most relevant)
      const result = data.results[0]

      console.log('[GoogleGeocodingService] Found result:', {
        formatted: result.formatted_address,
        locationType: result.geometry.location_type,
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
      })

      // Parse address components
      const addressComponents: GeocodedAddress['addressComponents'] = {}

      for (const component of result.address_components) {
        if (component.types.includes('street_number')) {
          addressComponents.streetNumber = component.long_name
        } else if (component.types.includes('route')) {
          addressComponents.route = component.long_name
        } else if (component.types.includes('postal_town') || component.types.includes('locality')) {
          addressComponents.locality = component.long_name
        } else if (component.types.includes('postal_code')) {
          addressComponents.postalCode = component.long_name
        } else if (component.types.includes('country')) {
          addressComponents.country = component.long_name
        }
      }

      // Log accuracy level
      const locationType = result.geometry.location_type as GeocodedAddress['locationType']
      if (locationType === 'ROOFTOP') {
        console.log('[GoogleGeocodingService] ✓ ROOFTOP accuracy - precise location')
      } else if (locationType === 'RANGE_INTERPOLATED') {
        console.log('[GoogleGeocodingService] ⚠ RANGE_INTERPOLATED - interpolated between endpoints')
      } else {
        console.log('[GoogleGeocodingService] ⚠ Lower accuracy:', locationType)
      }

      return {
        formattedAddress: result.formatted_address,
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        locationType,
        placeId: result.place_id,
        addressComponents,
      }
    } catch (error) {
      console.error('[GoogleGeocodingService] Error geocoding address:', error)
      throw error
    }
  }

  /**
   * Reverse geocode coordinates to an address
   */
  async reverseGeocode(
    latitude: number,
    longitude: number
  ): Promise<GeocodedAddress | null> {
    if (!this.isConfigured()) {
      throw new Error('Google Geocoding API key not configured')
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${this.apiKey}`

      console.log('[GoogleGeocodingService] Reverse geocoding:', { latitude, longitude })

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[GoogleGeocodingService] API error:', response.status, errorText)
        throw new Error(`Google Geocoding API error: ${response.status}`)
      }

      const data: GoogleGeocodingResponse = await response.json()

      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        console.log('[GoogleGeocodingService] No results found for coordinates')
        return null
      }

      const result = data.results[0]

      const addressComponents: GeocodedAddress['addressComponents'] = {}

      for (const component of result.address_components) {
        if (component.types.includes('street_number')) {
          addressComponents.streetNumber = component.long_name
        } else if (component.types.includes('route')) {
          addressComponents.route = component.long_name
        } else if (component.types.includes('postal_town') || component.types.includes('locality')) {
          addressComponents.locality = component.long_name
        } else if (component.types.includes('postal_code')) {
          addressComponents.postalCode = component.long_name
        } else if (component.types.includes('country')) {
          addressComponents.country = component.long_name
        }
      }

      return {
        formattedAddress: result.formatted_address,
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        locationType: result.geometry.location_type as GeocodedAddress['locationType'],
        placeId: result.place_id,
        addressComponents,
      }
    } catch (error) {
      console.error('[GoogleGeocodingService] Error reverse geocoding:', error)
      throw error
    }
  }
}

// Singleton instance
let googleGeocodingService: GoogleGeocodingService | null = null

export function getGoogleGeocodingService(): GoogleGeocodingService {
  if (!googleGeocodingService) {
    googleGeocodingService = new GoogleGeocodingService()
  }
  return googleGeocodingService
}
