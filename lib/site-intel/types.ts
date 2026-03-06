/**
 * Site Intelligence Types (Session 76-79)
 * Unified types for job-level and customer-level solar potential analysis
 */

/**
 * Base site intelligence metrics computed from placeholder or real APIs
 */
export interface SiteIntel {
  annual_irradiance_kwh_m2: number | null
  shading_index: number | null
  potential_label: 'High' | 'Medium' | 'Low' | 'Unknown'
}

/**
 * Extended site intelligence with metadata for jobs
 */
export interface JobSiteIntel extends SiteIntel {
  last_computed_at?: string
  source?: 'google_solar_v1' | 'placeholder_v1' | string
}

/**
 * Extended site intelligence with metadata for customers
 * Uses same structure as JobSiteIntel for consistency
 */
export interface CustomerSiteIntel extends SiteIntel {
  last_computed_at?: string
  source?: 'google_solar_v1' | 'placeholder_v1' | string
}
