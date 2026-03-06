"use client"

import * as React from "react"
import { AlertCircle } from "lucide-react"
import type { SolarVisualizationData } from "@/lib/services/solar-api.types"

interface InteractiveSolarMapProps {
  data: SolarVisualizationData
  showPanels?: boolean
  selectedConfig?: number
  viewMode?: 'satellite' | 'streetview'
  initialViewMode?: 'satellite' | 'streetview'
  compact?: boolean
}

// Load Google Maps script
function useGoogleMapsScript() {
  const [loaded, setLoaded] = React.useState(false)
  const [error, setError] = React.useState(false)

  React.useEffect(() => {
    // Check if already loaded
    if (typeof google !== 'undefined' && google.maps) {
      setLoaded(true)
      return
    }

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      existingScript.addEventListener('load', () => setLoaded(true))
      existingScript.addEventListener('error', () => setError(true))
      return
    }

    // Load script
    const script = document.createElement('script')
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ''
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true

    script.addEventListener('load', () => setLoaded(true))
    script.addEventListener('error', () => setError(true))

    document.head.appendChild(script)

    return () => {
      script.removeEventListener('load', () => setLoaded(true))
      script.removeEventListener('error', () => setError(true))
    }
  }, [])

  return { loaded, error }
}

export function InteractiveSolarMap({
  data,
  showPanels = true,
  selectedConfig = 0,
  viewMode: externalViewMode,
  initialViewMode = 'satellite',
  compact = false,
}: InteractiveSolarMapProps) {
  const mapRef = React.useRef<HTMLDivElement>(null)
  const streetViewRef = React.useRef<HTMLDivElement>(null)
  const mapInstanceRef = React.useRef<google.maps.Map | null>(null)
  const streetViewInstanceRef = React.useRef<google.maps.StreetViewPanorama | null>(null)
  const panelMarkersRef = React.useRef<google.maps.Polygon[]>([])

  // Internal view mode state (for uncontrolled mode)
  const [internalViewMode, _setInternalViewMode] = React.useState<'satellite' | 'streetview'>(initialViewMode)

  // Use external viewMode if provided, otherwise use internal state
  const viewMode = externalViewMode ?? internalViewMode

  const { loaded, error } = useGoogleMapsScript()

  // Get panels for selected config
  const panels = React.useMemo(() => {
    if (!data.panelConfigs || !data.panelConfigs[selectedConfig]) {
      return data.panels || []
    }

    // Get panel count for selected config
    const config = data.panelConfigs[selectedConfig]
    const panelCount = config.panelsCount || 0

    // Return first N panels matching the config
    return (data.panels || []).slice(0, panelCount)
  }, [data.panels, data.panelConfigs, selectedConfig])

  // Initialize map
  React.useEffect(() => {
    if (!loaded || !mapRef.current || !data.center) return

    const center = { lat: data.center.latitude, lng: data.center.longitude }

    // Calculate zoom based on bounds
    let zoom = 20
    if (data.bounds) {
      const latDiff = Math.abs(data.bounds.ne.latitude - data.bounds.sw.latitude)
      const lngDiff = Math.abs(data.bounds.ne.longitude - data.bounds.sw.longitude)
      const maxDiff = Math.max(latDiff, lngDiff)

      if (maxDiff < 0.0001) zoom = 21
      else if (maxDiff < 0.0002) zoom = 20
      else if (maxDiff < 0.0005) zoom = 19
      else if (maxDiff < 0.001) zoom = 18
      else zoom = 17
    }

    // Create map
    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom,
      mapTypeId: google.maps.MapTypeId.SATELLITE,
      tilt: 0,
      mapTypeControl: true,
      mapTypeControlOptions: {
        style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
        position: google.maps.ControlPosition.TOP_RIGHT,
      },
      zoomControl: true,
      zoomControlOptions: {
        position: google.maps.ControlPosition.RIGHT_CENTER,
      },
      streetViewControl: false,
      fullscreenControl: true,
    })

    mapInstanceRef.current = map

    // Add marker at center
    new google.maps.Marker({
      position: center,
      map,
      title: 'Property Location',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#EF4444',
        fillOpacity: 0.8,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
      },
    })

  }, [loaded, data.center, data.bounds])

  // Initialize Street View
  React.useEffect(() => {
    if (!loaded || !streetViewRef.current || !data.center) return

    const center = { lat: data.center.latitude, lng: data.center.longitude }

    const panorama = new google.maps.StreetViewPanorama(streetViewRef.current, {
      position: center,
      pov: { heading: 0, pitch: 10 },
      zoom: 1,
      addressControl: true,
      linksControl: true,
      panControl: true,
      enableCloseButton: false,
      fullscreenControl: true,
    })

    streetViewInstanceRef.current = panorama

  }, [loaded, data.center])

  // Update panel overlays
  React.useEffect(() => {
    if (!loaded || !mapInstanceRef.current || !showPanels) {
      // Clear existing markers
      panelMarkersRef.current.forEach(marker => marker.setMap(null))
      panelMarkersRef.current = []
      return
    }

    // Clear existing markers
    panelMarkersRef.current.forEach(marker => marker.setMap(null))
    panelMarkersRef.current = []

    if (!panels.length) return

    // Add panel polygons
    panels.forEach((panel) => {
      if (!panel.center) return

      const centerLat = panel.center.latitude
      const centerLng = panel.center.longitude

      // Panel dimensions in meters (approximate)
      const widthMeters = panel.orientation === 'LANDSCAPE' ? 1.6 : 1.0
      const heightMeters = panel.orientation === 'LANDSCAPE' ? 1.0 : 1.6

      // Convert meters to degrees (approximate)
      const latOffset = (heightMeters / 2) / 111000 // 111km per degree latitude
      const lngOffset = (widthMeters / 2) / (111000 * Math.cos(centerLat * Math.PI / 180))

      // Create rectangle coordinates
      const bounds = [
        { lat: centerLat - latOffset, lng: centerLng - lngOffset }, // SW
        { lat: centerLat - latOffset, lng: centerLng + lngOffset }, // SE
        { lat: centerLat + latOffset, lng: centerLng + lngOffset }, // NE
        { lat: centerLat + latOffset, lng: centerLng - lngOffset }, // NW
      ]

      const polygon = new google.maps.Polygon({
        paths: bounds,
        strokeColor: '#3B82F6',
        strokeOpacity: 0.9,
        strokeWeight: 1,
        fillColor: '#3B82F6',
        fillOpacity: 0.4,
        map: mapInstanceRef.current,
      })

      panelMarkersRef.current.push(polygon)
    })

  }, [loaded, showPanels, panels])

  // Cleanup
  React.useEffect(() => {
    return () => {
      panelMarkersRef.current.forEach(marker => marker.setMap(null))
      panelMarkersRef.current = []
    }
  }, [])

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Failed to load Google Maps</p>
          <p className="text-xs mt-2">Check your internet connection</p>
        </div>
      </div>
    )
  }

  // Loading state
  if (!loaded) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center text-muted-foreground">
          <div className="text-sm">Loading Google Maps...</div>
        </div>
      </div>
    )
  }

  // No location data
  if (!data.center) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Property location data required</p>
        </div>
      </div>
    )
  }

  const minHeight = compact ? '100%' : '600px'

  return (
    <>
      {/* Satellite Map View */}
      <div
        ref={mapRef}
        className={`w-full h-full ${viewMode === 'satellite' ? 'block' : 'hidden'}`}
        style={{ minHeight }}
      />

      {/* Street View */}
      <div
        ref={streetViewRef}
        className={`w-full h-full ${viewMode === 'streetview' ? 'block' : 'hidden'}`}
        style={{ minHeight }}
      />
    </>
  )
}
