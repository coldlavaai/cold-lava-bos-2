"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Sun, Zap, Home, Leaf } from "lucide-react"
import type { SolarVisualizationData } from "@/lib/services/solar-api.types"

interface SolarMetricsPanelProps {
  data: SolarVisualizationData
  selectedConfig: number
}

export function SolarMetricsPanel({
  data,
  selectedConfig,
}: SolarMetricsPanelProps) {
  const insights = data.insights
  const solarPotential = insights?.solarPotential
  const selectedPanelConfig = data.panelConfigs?.[selectedConfig]

  // Calculate metrics
  const maxPanels = solarPotential?.maxArrayPanelsCount || 0
  const maxSunshineHours = solarPotential?.maxSunshineHoursPerYear || 0
  const roofArea = solarPotential?.wholeRoofStats?.areaMeters2 || 0
  const carbonOffset = solarPotential?.carbonOffsetFactorKgPerMwh || 0

  const selectedPanelCount = selectedPanelConfig?.panelsCount || maxPanels
  const selectedEnergyKwh = selectedPanelConfig?.yearlyEnergyDcKwh || 0
  const selectedEnergyMwh = (selectedEnergyKwh / 1000).toFixed(1)

  // Estimate CO2 savings (kg/year)
  const estimatedCO2Savings = Math.round((selectedEnergyKwh / 1000) * carbonOffset)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Solar Potential Summary</h3>
        <p className="text-sm text-muted-foreground">
          Analysis based on {data.layersCoverage || data.insightsCoverage} quality imagery
        </p>
      </div>

      {/* Key Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sun className="h-4 w-4" />
            Sunshine Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Max Sunshine</span>
            <span className="text-sm font-semibold">
              {maxSunshineHours.toLocaleString()} hrs/yr
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Roof Area</span>
            <span className="text-sm font-semibold">
              {roofArea.toFixed(1)} m²
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Max Capacity</span>
            <span className="text-sm font-semibold">
              {maxPanels} panels
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Selected Configuration */}
      {selectedPanelConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Selected System
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Panel Count</span>
              <span className="text-sm font-semibold">
                {selectedPanelCount} panels
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Annual Output</span>
              <span className="text-sm font-semibold text-primary">
                {selectedEnergyMwh} MWh/yr
              </span>
            </div>
            {carbonOffset > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Leaf className="h-3 w-3" />
                  CO₂ Offset
                </span>
                <span className="text-sm font-semibold text-emerald-600">
                  {estimatedCO2Savings.toLocaleString()} kg/yr
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Roof Segments */}
      {data.roofSegments && data.roofSegments.length > 0 && (
        <>
          <Separator />
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Home className="h-4 w-4" />
              Roof Segments ({data.roofSegments.length})
            </h4>
            <div className="space-y-2">
              {data.roofSegments.map((segment, index) => (
                <Card key={index} className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">
                        Segment {segment.segmentIndex ?? index + 1}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {segment.panelsCount || 0} panels
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Pitch:</span>{' '}
                        <span className="font-medium">
                          {segment.pitchDegrees?.toFixed(0) || 0}°
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Azimuth:</span>{' '}
                        <span className="font-medium">
                          {segment.azimuthDegrees?.toFixed(0) || 0}°
                        </span>
                      </div>
                    </div>
                    {segment.yearlyEnergyDcKwh && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Output:</span>{' '}
                        <span className="font-medium">
                          {(segment.yearlyEnergyDcKwh / 1000).toFixed(1)} MWh/yr
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Footer Note */}
      <div className="pt-4 border-t">
        <p className="text-xs text-muted-foreground">
          All estimates are based on Google Solar API analysis. Actual results may vary based on installation quality, panel efficiency, and local conditions.
        </p>
      </div>
    </div>
  )
}
