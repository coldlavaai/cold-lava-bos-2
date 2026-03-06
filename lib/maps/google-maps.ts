/**
 * Google Maps integration helpers
 * Session 74 - View Property via Google Maps
 * Session 80 - Updated to use accurate coordinates from Solar API
 */

/**
 * Builds a Google Maps embed URL from customer address fields or solar coordinates
 * @param customer - Customer object with address fields
 * @param solarCenter - Optional exact coordinates from Google Solar API (more accurate)
 * @returns Google Maps embed URL or null if no usable address data
 */
export function buildGoogleMapsEmbedUrlFromCustomer(
  customer?: {
    address_line_1?: string | null
    address_line_2?: string | null
    city?: string | null
    postcode?: string | null
  },
  solarCenter?: {
    latitude: number
    longitude: number
  } | null
): string | null {
  if (!customer) return null

  // Prefer accurate coordinates from Solar API if available
  if (solarCenter) {
    const { latitude, longitude } = solarCenter
    // Use satellite view (t=k) and set zoom to 20 for roof-level detail
    return `https://www.google.com/maps?q=${latitude},${longitude}&output=embed&t=k&z=20`
  }

  // Fallback to address-based search (less accurate)
  const parts = [
    customer.address_line_1,
    customer.address_line_2,
    customer.city,
    customer.postcode,
  ]
    .map((p) => (p || "").trim())
    .filter(Boolean)

  if (parts.length === 0) return null

  const query = encodeURIComponent(parts.join(", "))
  // Embed URL suitable for iframe src with satellite view (&t=k for satellite imagery)
  return `https://www.google.com/maps?q=${query}&output=embed&t=k`
}
