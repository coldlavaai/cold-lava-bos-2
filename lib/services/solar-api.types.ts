/**
 * Google Solar API Type Definitions (Session 77)
 * Minimal types needed for building insights integration
 */

export interface LatLng {
  latitude: number
  longitude: number
}

export interface SizeAndSunshineStats {
  areaMeters2?: number
  sunshineQuantiles?: number[]
  groundAreaMeters2?: number
}

export interface SolarPotential {
  maxArrayPanelsCount?: number
  maxArrayAreaMeters2?: number
  maxSunshineHoursPerYear?: number
  carbonOffsetFactorKgPerMwh?: number
  wholeRoofStats?: SizeAndSunshineStats
  buildingStats?: SizeAndSunshineStats
  roofSegmentStats?: SizeAndSunshineStats[]
  solarPanels?: SolarPanel[]
  solarPanelConfigs?: SolarPanelConfig[]
  financialAnalyses?: object[]
}

export interface SolarPanel {
  center?: LatLng
  orientation?: 'LANDSCAPE' | 'PORTRAIT'
  segmentIndex?: number
  yearlyEnergyDcKwh?: number
}

export interface SolarPanelConfig {
  panelsCount?: number
  yearlyEnergyDcKwh?: number
  roofSegmentSummaries?: RoofSegmentSummary[]
}

export interface RoofSegmentSummary {
  pitchDegrees?: number
  azimuthDegrees?: number
  panelsCount?: number
  yearlyEnergyDcKwh?: number
  segmentIndex?: number
}

export interface BuildingInsightsResponse {
  name?: string
  center?: LatLng
  imageryDate?: {
    year?: number
    month?: number
    day?: number
  }
  imageryProcessedDate?: {
    year?: number
    month?: number
    day?: number
  }
  postalCode?: string
  administrativeArea?: string
  statisticalArea?: string
  regionCode?: string
  solarPotential?: SolarPotential
  imageryQuality?: 'HIGH' | 'MEDIUM' | 'LOW'
  boundingBox?: {
    sw?: LatLng
    ne?: LatLng
  }
}

export type CoverageQuality = 'HIGH' | 'MEDIUM' | 'BASE' | 'NONE'

export interface PropertySolarData {
  insights: BuildingInsightsResponse | null
  coverage: CoverageQuality
}

/**
 * Session 80: Data Layers API Types
 * For fetching GeoTIFF imagery from dataLayers:get endpoint
 */

export interface DataLayersResponse {
  imageryDate?: {
    year?: number
    month?: number
    day?: number
  }
  imageryProcessedDate?: {
    year?: number
    month?: number
    day?: number
  }
  dsmUrl?: string           // Digital Surface Model GeoTIFF
  rgbUrl?: string           // RGB aerial imagery GeoTIFF
  maskUrl?: string          // Building/roof mask GeoTIFF
  annualFluxUrl?: string    // Annual sunshine heatmap GeoTIFF
  monthlyFluxUrl?: string   // Monthly flux GeoTIFF
  hourlyShadeUrls?: string[] // Hourly shade maps
  imageryQuality?: 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface PropertyDataLayers {
  layers: DataLayersResponse | null
  coverage: CoverageQuality
}

/**
 * Combined solar visualization data (building insights + data layers)
 */
export interface SolarVisualizationData {
  // Building insights (existing)
  insights: BuildingInsightsResponse | null
  insightsCoverage: CoverageQuality

  // Data layers (new)
  layers: DataLayersResponse | null
  layersCoverage: CoverageQuality

  // Computed center and bounds for map display
  center?: LatLng
  bounds?: {
    sw: LatLng
    ne: LatLng
  }

  // Processed data for UI
  panels?: SolarPanel[]
  panelConfigs?: SolarPanelConfig[]
  roofSegments?: RoofSegmentSummary[]
}
