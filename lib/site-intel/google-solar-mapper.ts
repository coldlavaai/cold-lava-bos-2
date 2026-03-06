/**
 * Google Solar to JobSiteIntel Mapper (Session 77)
 * Maps Google Solar API BuildingInsightsResponse to our JobSiteIntel format
 */

import type { SiteIntel } from './placeholder'
import type { BuildingInsightsResponse, CoverageQuality } from '../services/solar-api.types'

/**
 * Map Google Solar API data to JobSiteIntel
 * Derives annual_irradiance_kwh_m2, shading_index, and potential_label from Solar API metrics
 */
export function mapGoogleSolarToSiteIntel(
  insights: BuildingInsightsResponse,
  coverage: CoverageQuality
): SiteIntel {
  const solarPotential = insights.solarPotential

  if (!solarPotential) {
    // No solar potential data, return Unknown
    return {
      annual_irradiance_kwh_m2: null,
      shading_index: null,
      potential_label: 'Unknown',
    }
  }

  // Extract key metrics
  const maxSunshineHours = solarPotential.maxSunshineHoursPerYear || 0
  const roofAreaM2 = solarPotential.wholeRoofStats?.areaMeters2 || 0
  const maxPanels = solarPotential.maxArrayPanelsCount || 0

  // Estimate annual irradiance (kWh/m²/yr)
  // UK average is around 1000-1200 kWh/m²/yr
  // We can approximate using maxSunshineHours:
  // - 4380 hours/year = 100% (365 days * 12 hours theoretical max)
  // - Scale proportionally to UK range
  let annualIrradiance: number | null = null
  if (maxSunshineHours > 0) {
    // Map sunshine hours to irradiance estimate
    // Typical UK: ~950-1100 hours of useful sunshine → 1000-1200 kWh/m²/yr
    // Linear approximation: hours * multiplier
    const multiplier = 1.15 // Converts sunshine hours to kWh/m²/yr approximately
    annualIrradiance = Math.round(maxSunshineHours * multiplier)

    // Cap at reasonable UK values (800-1400 range)
    annualIrradiance = Math.max(800, Math.min(1400, annualIrradiance))
  }

  // Estimate shading index (0 = no shade, 1 = fully shaded)
  // Use sunshine hours as proxy: higher hours = less shading
  let shadingIndex: number | null = null
  if (maxSunshineHours > 0) {
    // Theoretical max sunshine hours for UK latitude
    const theoreticalMax = 1800 // Conservative estimate for UK
    const shadingRatio = 1 - (maxSunshineHours / theoreticalMax)

    // Clamp between 0 and 1, round to 2 decimals
    shadingIndex = Math.max(0, Math.min(1, Math.round(shadingRatio * 100) / 100))
  }

  // Determine potential label based on multiple factors
  let potentialLabel: 'High' | 'Medium' | 'Low' | 'Unknown' = 'Unknown'

  if (annualIrradiance !== null && maxSunshineHours > 0 && roofAreaM2 > 0) {
    // High: Good irradiance + decent roof area + many panels possible
    if (annualIrradiance >= 1100 && maxPanels >= 12 && roofAreaM2 >= 40) {
      potentialLabel = 'High'
    }
    // Medium: Moderate metrics
    else if (annualIrradiance >= 950 && maxPanels >= 6 && roofAreaM2 >= 20) {
      potentialLabel = 'Medium'
    }
    // Low: Poor metrics but still some potential
    else if (annualIrradiance >= 800 && maxPanels >= 3) {
      potentialLabel = 'Low'
    }
    // If metrics exist but don't meet Low threshold, still assign Medium as reasonable default
    else if (maxPanels > 0) {
      potentialLabel = 'Medium'
    }
  }

  // Factor in coverage quality - downgrade if coverage is BASE
  if (coverage === 'BASE' && potentialLabel === 'High') {
    potentialLabel = 'Medium'
  }

  return {
    annual_irradiance_kwh_m2: annualIrradiance,
    shading_index: shadingIndex,
    potential_label: potentialLabel,
  }
}
