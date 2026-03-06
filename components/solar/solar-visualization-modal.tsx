"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X, Loader2, AlertCircle } from "lucide-react"
import { InteractiveSolarMap } from "./interactive-solar-map"
import { SolarMetricsPanel } from "./solar-metrics-panel"
import { SolarControlPanel } from "./solar-control-panel"
import type { SolarVisualizationData } from "@/lib/services/solar-api.types"

interface SolarVisualizationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: SolarVisualizationData | null | undefined
  isLoading?: boolean
  error?: Error | null
  address?: string
}

export function SolarVisualizationModal({
  open,
  onOpenChange,
  data,
  isLoading,
  error,
  address,
}: SolarVisualizationModalProps) {
  const [showHeatmap, setShowHeatmap] = React.useState(false)
  const [showPanels, setShowPanels] = React.useState(true)
  const [selectedConfig, setSelectedConfig] = React.useState<number>(0)
  const [viewMode, setViewMode] = React.useState<'satellite' | 'streetview'>('satellite')

  // Debug logging
  React.useEffect(() => {
    if (open) {
      console.log('[SolarVisualizationModal] Modal opened with:', {
        hasData: !!data,
        data: data,
        isLoading,
        error: error?.message,
        address,
      })
    }
  }, [open, data, isLoading, error, address])

  // Format imagery date
  const imageryDate = React.useMemo(() => {
    if (!data?.layers?.imageryDate) return null
    const { year, month, day } = data.layers.imageryDate
    if (!year) return null
    return new Date(year, (month || 1) - 1, day || 1).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: day ? 'numeric' : undefined,
    })
  }, [data?.layers?.imageryDate])

  // Get quality badge color
  const qualityColor = React.useMemo(() => {
    const quality = data?.layersCoverage || data?.insightsCoverage
    if (quality === 'HIGH') return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/40'
    if (quality === 'MEDIUM') return 'bg-amber-500/15 text-amber-700 border-amber-500/40'
    if (quality === 'BASE') return 'bg-orange-500/15 text-orange-700 border-orange-500/40'
    return 'bg-muted text-muted-foreground border-border'
  }, [data?.layersCoverage, data?.insightsCoverage])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-screen h-screen m-0 p-0 rounded-none">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-card">
            <div className="flex items-center gap-4">
              <DialogTitle className="text-lg font-semibold">Solar Analysis</DialogTitle>
              {address && (
                <span className="text-sm text-muted-foreground">{address}</span>
              )}
              {data && (
                <Badge variant="outline" className={`text-xs ${qualityColor}`}>
                  {data.layersCoverage || data.insightsCoverage} Quality
                </Badge>
              )}
              {imageryDate && (
                <span className="text-xs text-muted-foreground">
                  Imagery: {imageryDate}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Loading State */}
            {isLoading && (
              <div className="flex-1 flex items-center justify-center bg-muted/20">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">Loading solar data...</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <div className="flex-1 flex items-center justify-center bg-muted/20">
                <div className="text-center max-w-md px-6">
                  <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Unable to Load Solar Data</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {error.message || 'An error occurred while fetching solar analysis data.'}
                  </p>
                  <Button onClick={() => onOpenChange(false)} variant="outline">
                    Close
                  </Button>
                </div>
              </div>
            )}

            {/* No Data State */}
            {!data && !isLoading && !error && (
              <div className="flex-1 flex items-center justify-center bg-muted/20">
                <div className="text-center max-w-md px-6">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Solar Analysis Not Available</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Solar imagery data could not be retrieved for this property. This may be due to limited geographic coverage in your region (Google Solar API has more extensive coverage in the US) or the address being outside the service area.
                  </p>
                  {address && (
                    <p className="text-xs text-muted-foreground/70 mb-4">
                      Property: {address}
                    </p>
                  )}
                  <Button onClick={() => onOpenChange(false)} variant="outline">
                    Close
                  </Button>
                </div>
              </div>
            )}

            {/* Main Content */}
            {data && !isLoading && !error && (
              <>
                {/* Map Viewer */}
                <div className="flex-1 relative bg-black flex flex-col">
                  <InteractiveSolarMap
                    data={data}
                    showPanels={showPanels}
                    selectedConfig={selectedConfig}
                    viewMode={viewMode}
                  />

                  {/* View Mode Toggle (overlay on map) */}
                  <div className="absolute top-4 right-4 z-[1000]">
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

                  {/* Control Panel (overlay on map) */}
                  <div className="absolute top-4 left-4 z-[1000]">
                    <SolarControlPanel
                      showHeatmap={showHeatmap}
                      setShowHeatmap={setShowHeatmap}
                      showPanels={showPanels}
                      setShowPanels={setShowPanels}
                      selectedConfig={selectedConfig}
                      setSelectedConfig={setSelectedConfig}
                      panelConfigs={data.panelConfigs || []}
                    />
                  </div>
                </div>

                {/* Metrics Sidebar */}
                <div className="w-full lg:w-96 lg:h-full overflow-auto bg-card border-t lg:border-t-0 lg:border-l">
                  <SolarMetricsPanel
                    data={data}
                    selectedConfig={selectedConfig}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
