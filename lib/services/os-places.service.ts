/**
 * OS Places Service (Session 77)
 * Wrapper for Ordnance Survey Places API for UK property geocoding
 */

export interface OSPlacesAddress {
  uprn: string
  fullAddress: string
  postcode: string
  postTown: string
  latitude: number
  longitude: number
}

interface OSPlacesResult {
  DPA?: {
    UPRN?: string
    ADDRESS?: string
    POSTCODE?: string
    POST_TOWN?: string
    LAT?: string
    LNG?: string
  }
}

export class OSPlacesService {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || process.env.OS_PLACES_API_KEY || ''
    this.baseUrl = baseUrl || process.env.OS_PLACES_BASE_URL || 'https://api.os.uk/search/places/v1'
  }

  /**
   * Check if the service is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey
  }

  /**
   * Search for addresses by postcode
   * Returns array of simplified addresses with UPRN + lat/lng
   */
  async searchByPostcode(postcode: string): Promise<OSPlacesAddress[]> {
    if (!this.isConfigured()) {
      throw new Error('OS Places API key not configured')
    }

    const cleanPostcode = postcode.trim().replace(/\s+/g, ' ').toUpperCase()

    try {
      const url = `${this.baseUrl}/postcode?postcode=${encodeURIComponent(cleanPostcode)}&output_srs=EPSG:4326&key=${this.apiKey}`

      console.log('[OSPlacesService] Searching by postcode:', cleanPostcode)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[OSPlacesService] API error:', response.status, errorText)
        throw new Error(`OS Places API error: ${response.status}`)
      }

      const data = await response.json()

      if (!data.results || data.results.length === 0) {
        console.log('[OSPlacesService] No results found for postcode:', cleanPostcode)
        return []
      }

      const addresses: OSPlacesAddress[] = data.results.map((result: OSPlacesResult) => {
        const dpa = result.DPA || {}
        return {
          uprn: dpa.UPRN || '',
          fullAddress: dpa.ADDRESS || '',
          postcode: dpa.POSTCODE || cleanPostcode,
          postTown: dpa.POST_TOWN || '',
          latitude: parseFloat(dpa.LAT || '0') || 0,
          longitude: parseFloat(dpa.LNG || '0') || 0,
        }
      })

      console.log('[OSPlacesService] Found addresses:', addresses.length)
      return addresses
    } catch (error) {
      console.error('[OSPlacesService] Error searching by postcode:', error)
      throw error
    }
  }

  /**
   * Find address using free text search (Session 80 - PROPER APPROACH)
   * Uses OS Places "find" endpoint with full address text
   * Much more accurate than postcode-only search
   */
  async findAddress(fullAddress: string): Promise<OSPlacesAddress | null> {
    if (!this.isConfigured()) {
      throw new Error('OS Places API key not configured')
    }

    try {
      const url = `${this.baseUrl}/find?query=${encodeURIComponent(fullAddress)}&output_srs=EPSG:4326&maxresults=5&key=${this.apiKey}`

      console.log('[OSPlacesService] Finding address with free text search:', fullAddress)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[OSPlacesService] API error:', response.status, errorText)
        throw new Error(`OS Places API error: ${response.status}`)
      }

      const data = await response.json()

      if (!data.results || data.results.length === 0) {
        console.log('[OSPlacesService] No results found for:', fullAddress)
        return null
      }

      // Get first result (best match from OS Places)
      const result = data.results[0]
      const dpa = result.DPA || {}

      const address: OSPlacesAddress = {
        uprn: dpa.UPRN || '',
        fullAddress: dpa.ADDRESS || '',
        postcode: dpa.POSTCODE || '',
        postTown: dpa.POST_TOWN || '',
        latitude: parseFloat(dpa.LAT || '0') || 0,
        longitude: parseFloat(dpa.LNG || '0') || 0,
      }

      console.log('[OSPlacesService] ✓ Found address via find endpoint:', {
        uprn: address.uprn,
        address: address.fullAddress,
        lat: address.latitude,
        lng: address.longitude,
      })

      return address
    } catch (error) {
      console.error('[OSPlacesService] Error finding address:', error)
      throw error
    }
  }

  /**
   * Match a specific address within a postcode
   * Uses postcode search + improved string matching to pick best address
   * OS Places format: "HOUSE_NUMBER, STREET_NAME, TOWN, POSTCODE"
   *
   * DEPRECATED: Use findAddress() instead for better accuracy
   */
  async matchAddress(postcode: string, addressLine: string): Promise<OSPlacesAddress | null> {
    try {
      const addresses = await this.searchByPostcode(postcode)

      if (addresses.length === 0) {
        return null
      }

      // If only one result, return it
      if (addresses.length === 1) {
        return addresses[0]
      }

      console.log('[OSPlacesService] ===== ADDRESS MATCHING DEBUG =====')
      console.log('[OSPlacesService] Input address:', addressLine)
      console.log('[OSPlacesService] Matching against', addresses.length, 'addresses')
      console.log('[OSPlacesService] All addresses from OS Places:')
      addresses.forEach((addr, idx) => {
        console.log(`  [${idx}]`, addr.fullAddress, `(${addr.latitude}, ${addr.longitude})`)
      })

      const cleanAddressLine = addressLine.trim().toLowerCase()

      // First try exact substring match (full address contains input)
      let match = addresses.find(addr =>
        addr.fullAddress.toLowerCase().includes(cleanAddressLine)
      )

      if (match) {
        console.log('[OSPlacesService] Found exact match:', match.fullAddress)
        return match
      }

      // Parse input address to extract house number and street name
      // Expected format: "5 Beacon Lane" or "5, Beacon Lane"
      const inputParts = cleanAddressLine.replace(/,/g, '').split(/\s+/)
      const inputHouseNumber = inputParts[0] // e.g., "5"
      const inputStreetName = inputParts.slice(1).join(' ') // e.g., "beacon lane"

      console.log('[OSPlacesService] Parsed input - houseNumber:', inputHouseNumber, 'streetName:', inputStreetName)

      // Try to match based on house number AND street name
      // OS Places format: "5, BEACON LANE, HESWALL, CH60 0DG"
      // Use strict matching to avoid matching wrong addresses
      match = addresses.find(addr => {
        const parts = addr.fullAddress.toLowerCase().split(',').map(p => p.trim())

        if (parts.length < 2) {
          console.log('[OSPlacesService] Skipping address with < 2 parts:', addr.fullAddress)
          return false
        }

        const osHouseNumber = parts[0] // e.g., "5"
        const osStreetName = parts[1] // e.g., "beacon lane"

        console.log('[OSPlacesService] Comparing:', {
          os: { house: osHouseNumber, street: osStreetName },
          input: { house: inputHouseNumber, street: inputStreetName }
        })

        // Match if house number matches AND street name is an EXACT match
        // This prevents matching "5 BEACON CLOSE" when looking for "5 BEACON LANE"
        const houseNumberMatch = osHouseNumber === inputHouseNumber
        const streetNameMatch = osStreetName === inputStreetName

        // If exact match fails, try checking if ALL words from input street are in OS street
        // This handles cases like input "beacon lane" matching OS "beacon lane north"
        const allWordsMatch = !streetNameMatch && inputStreetName.split(/\s+/).every(word =>
          osStreetName.includes(word)
        )

        console.log('[OSPlacesService] Match result:', { houseNumberMatch, streetNameMatch, allWordsMatch })

        if (houseNumberMatch && (streetNameMatch || allWordsMatch)) {
          console.log('[OSPlacesService] ✓ MATCHED by house + street:', addr.fullAddress)
          return true
        }

        return false
      })

      // If still no match, warn and return the first result as a fallback
      if (!match) {
        console.warn('[OSPlacesService] No match found for', cleanAddressLine, '- using first result as fallback')
        console.warn('[OSPlacesService] Available addresses:', addresses.map(a => a.fullAddress))
        match = addresses[0]
      }

      console.log('[OSPlacesService] Final matched address:', match.fullAddress)
      return match
    } catch (error) {
      console.error('[OSPlacesService] Error matching address:', error)
      throw error
    }
  }
}

// Singleton instance
let osPlacesService: OSPlacesService | null = null

export function getOSPlacesService(): OSPlacesService {
  if (!osPlacesService) {
    osPlacesService = new OSPlacesService()
  }
  return osPlacesService
}
