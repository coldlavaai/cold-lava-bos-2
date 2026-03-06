"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Layers, Zap } from "lucide-react"
import type { SolarPanelConfig } from "@/lib/services/solar-api.types"

interface SolarControlPanelProps {
  showHeatmap: boolean
  setShowHeatmap: (show: boolean) => void
  showPanels: boolean
  setShowPanels: (show: boolean) => void
  selectedConfig: number
  setSelectedConfig: (index: number) => void
  panelConfigs: SolarPanelConfig[]
}

export function SolarControlPanel({
  showHeatmap: _showHeatmap,
  setShowHeatmap: _setShowHeatmap,
  showPanels,
  setShowPanels,
  selectedConfig,
  setSelectedConfig,
  panelConfigs,
}: SolarControlPanelProps) {
  // Generate config labels
  const configOptions = React.useMemo(() => {
    if (!panelConfigs || panelConfigs.length === 0) return []

    return panelConfigs.map((config, index) => {
      const panelCount = config.panelsCount || 0
      const energyKwh = config.yearlyEnergyDcKwh || 0
      const energyMwh = (energyKwh / 1000).toFixed(1)

      let label = ''
      if (panelCount <= 10) label = 'Small'
      else if (panelCount <= 25) label = 'Medium'
      else label = 'Large'

      return {
        index,
        label: `${label} (${panelCount} panels, ${energyMwh} MWh/yr)`,
        panelCount,
      }
    })
  }, [panelConfigs])

  return (
    <Card className="p-4 shadow-lg backdrop-blur-sm bg-card/95">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2 text-sm font-medium">
          <Layers className="h-4 w-4" />
          <span>Display Options</span>
        </div>

        {/* Layer Toggles */}
        <div className="space-y-3">
          {/* Heatmap toggle hidden - GeoTIFF heatmap not available with Google Maps Static API */}
          {/*
          <div className="flex items-center justify-between">
            <Label htmlFor="heatmap-toggle" className="text-sm cursor-pointer">
              Sunshine Heatmap
            </Label>
            <Switch
              id="heatmap-toggle"
              checked={showHeatmap}
              onCheckedChange={setShowHeatmap}
            />
          </div>
          */}

          <div className="flex items-center justify-between">
            <Label htmlFor="panels-toggle" className="text-sm cursor-pointer">
              Solar Panels
            </Label>
            <Switch
              id="panels-toggle"
              checked={showPanels}
              onCheckedChange={setShowPanels}
            />
          </div>
        </div>

        {/* Panel Configuration Selector */}
        {configOptions.length > 0 && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              <Zap className="h-4 w-4" />
              <span>System Size</span>
            </div>
            <Select
              value={selectedConfig.toString()}
              onValueChange={(value) => setSelectedConfig(parseInt(value, 10))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {configOptions.map((option) => (
                  <SelectItem key={option.index} value={option.index.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </Card>
  )
}
