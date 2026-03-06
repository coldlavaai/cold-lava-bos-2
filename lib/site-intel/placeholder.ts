/**
 * Placeholder site intelligence logic for Phase 1
 * Session 76 - Solar Site Intelligence
 *
 * This provides simple, deterministic values based on postcode/country.
 * In later phases, this will be replaced with real Earth Engine or solar API integration.
 */

export interface SiteIntel {
  annual_irradiance_kwh_m2: number | null
  shading_index: number | null
  potential_label: 'High' | 'Medium' | 'Low' | 'Unknown'
}

/**
 * Computes placeholder site intelligence based on simple heuristics
 * @param input - Postcode and/or country code
 * @returns Site intelligence metrics
 */
export function computePlaceholderSiteIntel(input: {
  postcode?: string | null
  country_code?: string | null
}): SiteIntel {
  const { postcode, country_code } = input

  // If we have a postcode, assume good data quality → High potential
  if (postcode && postcode.trim()) {
    return {
      annual_irradiance_kwh_m2: 1100, // Typical UK average
      shading_index: 0.2, // Low shading (20%)
      potential_label: 'High',
    }
  }

  // If we only have country code, assume Medium potential
  if (country_code && country_code.trim()) {
    return {
      annual_irradiance_kwh_m2: 1050, // Slightly lower estimate
      shading_index: 0.3, // Moderate shading (30%)
      potential_label: 'Medium',
    }
  }

  // No usable location data → Unknown
  return {
    annual_irradiance_kwh_m2: null,
    shading_index: null,
    potential_label: 'Unknown',
  }
}
