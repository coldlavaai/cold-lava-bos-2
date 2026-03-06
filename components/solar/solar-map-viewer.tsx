"use client"

import * as React from "react"
import { AlertCircle } from "lucide-react"
import type { SolarVisualizationData, SolarPanel, LatLng } from "@/lib/services/solar-api.types"

interface SolarMapViewerProps {
  data: SolarVisualizationData
  showHeatmap: boolean
  showPanels: boolean
  selectedConfig: number
}

interface Bounds {
  sw: LatLng
  ne: LatLng
}

interface ImageSize {
  width: number
  height: number
}

// Calculate zoom level from bounds to ensure entire property is visible
function calculateZoom(bounds: Bounds | undefined): number {
  if (!bounds) return 20 // Default high zoom for property view

  const { sw, ne } = bounds
  const latDiff = Math.abs(ne.latitude - sw.latitude)
  const lngDiff = Math.abs(ne.longitude - sw.longitude)
  const maxDiff = Math.max(latDiff, lngDiff)

  // Approximate zoom levels for different property sizes
  if (maxDiff < 0.0001) return 21 // Very small building (~11m)
  if (maxDiff < 0.0002) return 20 // Small building (~22m)
  if (maxDiff < 0.0005) return 19 // Medium building (~55m)
  if (maxDiff < 0.001) return 18  // Large building (~111m)
  return 17 // Very large property
}

export function SolarMapViewer({
  data,
  showHeatmap: _showHeatmap,
  showPanels,
  selectedConfig,
}: SolarMapViewerProps) {
  const [imageSize, setImageSize] = React.useState<ImageSize>({ width: 0, height: 0 })
  const [imageLoaded, setImageLoaded] = React.useState(false)
  const [imageError, setImageError] = React.useState(false)
  const [viewMode, setViewMode] = React.useState<'satellite' | 'streetview'>('satellite')
  const imageRef = React.useRef<HTMLImageElement>(null)

  // Generate Google Maps Static API URL for satellite view
  const satelliteImageUrl = React.useMemo(() => {
    if (!data.center) return null

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ''
    const { latitude, longitude } = data.center
    const zoom = calculateZoom(data.bounds)
    const size = '1200x800' // High resolution

    // Google Maps Static API with satellite view
    return `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=${zoom}&size=${size}&maptype=satellite&key=${apiKey}`
  }, [data.center, data.bounds])

  // Generate Google Street View Static API URL
  const streetViewImageUrl = React.useMemo(() => {
    if (!data.center) return null

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ''
    const { latitude, longitude } = data.center
    const size = '1200x800'
    const fov = 90 // Field of view
    const pitch = 10 // Slight upward angle to see roof better

    // Google Street View Static API
    return `https://maps.googleapis.com/maps/api/streetview?size=${size}&location=${latitude},${longitude}&fov=${fov}&pitch=${pitch}&key=${apiKey}`
  }, [data.center])

  // Select current image URL based on view mode
  const currentImageUrl = viewMode === 'satellite' ? satelliteImageUrl : streetViewImageUrl

  const bounds = data.bounds
  const panels = React.useMemo(() => {
    if (!data.panelConfigs || !data.panelConfigs[selectedConfig]) {
      return data.panels || []
    }
    // Filter panels for selected config (could be more sophisticated)
    return data.panels || []
  }, [data.panels, data.panelConfigs, selectedConfig])

  // Handle image load to get dimensions
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    setImageSize({ width: img.naturalWidth, height: img.naturalHeight })
    setImageLoaded(true)
    setImageError(false)
  }

  // Convert panel lat/lng to pixel coordinates relative to center
  const panelToPixel = React.useCallback(
    (panel: SolarPanel): { x: number; y: number } | null => {
      if (!data.center || !panel.center || !imageSize.width || !imageSize.height) {
        return null
      }

      // For Google Maps Static API, we need to calculate pixel offset from center
      // This is an approximation based on Web Mercator projection at the given zoom
      const zoom = calculateZoom(bounds)
      const scale = Math.pow(2, zoom)

      // Meters per pixel at this latitude
      const metersPerPx = (156543.03392 * Math.cos(data.center.latitude * Math.PI / 180)) / scale

      // Calculate offset in meters (approximate)
      const latDiffMeters = (panel.center.latitude - data.center.latitude) * 111000
      const lngDiffMeters = (panel.center.longitude - data.center.longitude) * 111000 * Math.cos(data.center.latitude * Math.PI / 180)

      // Convert to pixels from center
      const offsetX = lngDiffMeters / metersPerPx
      const offsetY = -latDiffMeters / metersPerPx // Negative because image Y increases downward

      // Image center point
      const centerX = imageSize.width / 2
      const centerY = imageSize.height / 2

      return {
        x: centerX + offsetX,
        y: centerY + offsetY,
      }
    },
    [bounds, data.center, imageSize]
  )

  // No imagery available
  if (!currentImageUrl || !data.center) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Imagery not available for this property</p>
          <p className="text-xs mt-2">Property location data required</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-slate-900">
      {/* View mode selector */}
      <div className="absolute top-4 right-4 z-10">
        <div className="flex gap-2 bg-card/95 backdrop-blur-sm rounded-lg p-1 shadow-lg border border-border">
          <button
            onClick={() => setViewMode('satellite')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              viewMode === 'satellite'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Satellite
          </button>
          <button
            onClick={() => setViewMode('streetview')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              viewMode === 'streetview'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Street View
          </button>
        </div>
      </div>

      {/* Base imagery from Google Maps */}
      <div className="relative max-w-full max-h-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imageRef}
          src={currentImageUrl}
          alt={viewMode === 'satellite' ? 'Property satellite view' : 'Property street view'}
          className="max-w-full max-h-full object-contain"
          onLoad={handleImageLoad}
          onError={() => setImageError(true)}
        />

        {/* Note: Heatmap overlay not available with Google Maps approach */}
        {/* The GeoTIFF heatmap URLs don't work for direct browser access */}

        {/* Panel overlay - only show in satellite view */}
        {viewMode === 'satellite' && showPanels && imageLoaded && !imageError && panels.length > 0 && imageSize.width > 0 && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {panels.map((panel, i) => {
              const pos = panelToPixel(panel)
              if (!pos) return null

              // Panel dimensions (approximate, in pixels)
              const width = panel.orientation === 'LANDSCAPE' ? 20 : 12
              const height = panel.orientation === 'LANDSCAPE' ? 12 : 20

              return (
                <rect
                  key={i}
                  x={pos.x - width / 2}
                  y={pos.y - height / 2}
                  width={width}
                  height={height}
                  fill="rgba(59, 130, 246, 0.6)"
                  stroke="rgba(59, 130, 246, 0.9)"
                  strokeWidth={1}
                  rx={1}
                />
              )
            })}
          </svg>
        )}

        {/* Loading state */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
            <div className="text-sm text-muted-foreground">Loading imagery...</div>
          </div>
        )}

        {/* Error state */}
        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
            <div className="text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Failed to load imagery</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
