"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  Star,
  StarOff,
  Plus,
  Check,
  ExternalLink,
  Zap,
  Battery,
  Sun,
  LayoutGrid,
  Car,
  Info,
  ShieldCheck,
} from "lucide-react"
import type { EquipmentWithSpecs, EquipmentCategory } from "@/types/equipment"

interface EquipmentCardProps {
  equipment: EquipmentWithSpecs
  isFavourite?: boolean
  isSelected?: boolean
  onToggleFavourite?: (id: string, isFavourite: boolean) => void
  onSelect?: (equipment: EquipmentWithSpecs) => void
  onViewDetails?: (equipment: EquipmentWithSpecs) => void
  showPricing?: boolean
  compact?: boolean
  className?: string
}

const categoryIcons: Record<EquipmentCategory, React.ElementType> = {
  panel: Sun,
  inverter: Zap,
  battery: Battery,
  mounting: LayoutGrid,
  ev_charger: Car,
  heat_pump: Zap,
  accessory: Info,
  cable: Info,
  connector: Info,
  isolator: Info,
  optimiser: Zap,
  microinverter: Zap,
  consumer_unit: LayoutGrid,
  meter: Info,
  ct_clamp: Info,
  surge_protector: Info,
  pigeon_mesh: LayoutGrid,
  immersion_diverter: Info,
  other: Info,
}

function formatPrice(pence: number | undefined): string {
  if (!pence) return '—'
  return `£${(pence / 100).toFixed(2)}`
}

function getSpecsSummary(equipment: EquipmentWithSpecs): string[] {
  const specs: string[] = []

  if (equipment.panel_specs) {
    const ps = equipment.panel_specs
    specs.push(`${ps.power_rating_wp}W`)
    if (ps.efficiency_percent) specs.push(`${ps.efficiency_percent.toFixed(1)}% eff`)
    specs.push(`${ps.length_mm}×${ps.width_mm}mm`)
  }

  if (equipment.inverter_specs) {
    const inv = equipment.inverter_specs
    specs.push(`${(inv.rated_ac_power_w / 1000).toFixed(1)}kW`)
    specs.push(inv.inverter_type === 'hybrid' ? 'Hybrid' : inv.inverter_type)
    if (inv.battery_compatible) specs.push('Battery Ready')
    if (inv.mppt_count) specs.push(`${inv.mppt_count} MPPT`)
  }

  if (equipment.battery_specs) {
    const bat = equipment.battery_specs
    specs.push(`${bat.usable_capacity_kwh}kWh`)
    specs.push(bat.chemistry)
    if (bat.max_charge_power_kw) specs.push(`${bat.max_charge_power_kw}kW`)
  }

  if (equipment.ev_charger_specs) {
    const ev = equipment.ev_charger_specs
    specs.push(`${ev.rated_power_kw}kW`)
    if (ev.solar_compatible) specs.push('Solar Divert')
  }

  if (equipment.mounting_specs) {
    const mt = equipment.mounting_specs
    specs.push(mt.mounting_type.replace('_', ' '))
    if (mt.material) specs.push(mt.material)
  }

  return specs.slice(0, 4)
}

export function EquipmentCard({
  equipment,
  isFavourite = false,
  isSelected = false,
  onToggleFavourite,
  onSelect,
  onViewDetails,
  showPricing = false,
  compact = false,
  className,
}: EquipmentCardProps) {
  const CategoryIcon = categoryIcons[equipment.category] || Info
  const specs = getSpecsSummary(equipment)

  return (
    <Card
      variant={isSelected ? "outline" : "interactive"}
      className={cn(
        "group relative overflow-hidden transition-all duration-200",
        isSelected && "ring-2 ring-primary border-primary",
        compact ? "p-3" : "p-4",
        className
      )}
      onClick={() => onSelect?.(equipment)}
    >
      {/* Favourite Button */}
      {onToggleFavourite && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity z-10",
            isFavourite && "opacity-100"
          )}
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavourite(equipment.id, !isFavourite)
          }}
        >
          {isFavourite ? (
            <Star className="h-4 w-4 fill-teal-400 text-teal-400" />
          ) : (
            <StarOff className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      )}

      <CardContent className={cn("p-0", compact && "space-y-2")}>
        {/* Header */}
        <div className="flex items-start gap-3">
          {/* Icon/Image */}
          <div className={cn(
            "flex-shrink-0 rounded-lg bg-muted flex items-center justify-center",
            compact ? "h-10 w-10" : "h-12 w-12"
          )}>
            {equipment.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={equipment.thumbnail_url}
                alt={equipment.full_model_name}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-contain rounded-lg"
              />
            ) : (
              <CategoryIcon className={cn("text-muted-foreground", compact ? "h-5 w-5" : "h-6 w-6")} />
            )}
          </div>

          {/* Title & Manufacturer */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium">
              {equipment.manufacturer_name}
            </p>
            <h4 className={cn(
              "font-semibold truncate",
              compact ? "text-sm" : "text-base"
            )}>
              {equipment.model}
              {equipment.model_variant && (
                <span className="text-muted-foreground font-normal"> {equipment.model_variant}</span>
              )}
            </h4>
          </div>
        </div>

        {/* Specs Pills */}
        {!compact && specs.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {specs.map((spec, i) => (
              <Badge key={i} variant="secondary" className="text-xs font-normal">
                {spec}
              </Badge>
            ))}
          </div>
        )}

        {/* Compact specs */}
        {compact && specs.length > 0 && (
          <p className="text-xs text-muted-foreground truncate">
            {specs.join(' • ')}
          </p>
        )}

        {/* Certifications */}
        <div className="flex items-center gap-2 mt-3">
          {equipment.mcs_certified && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs gap-1 bg-green-50 text-green-700 border-green-200">
                    <ShieldCheck className="h-3 w-3" />
                    MCS
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  MCS Certified — Eligible for SEG
                  {equipment.mcs_certificate_number && (
                    <span className="block text-xs opacity-70">
                      Certificate: {equipment.mcs_certificate_number}
                    </span>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {equipment.inverter_specs?.g98_compliant && (
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              G98
            </Badge>
          )}

          {equipment.inverter_specs?.g99_compliant && (
            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
              G99
            </Badge>
          )}
        </div>

        {/* Pricing */}
        {showPricing && equipment.typical_trade_price_pence && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <div>
              <p className="text-xs text-muted-foreground">Trade Price</p>
              <p className="font-semibold">{formatPrice(equipment.typical_trade_price_pence)}</p>
            </div>
            {equipment.rrp_pence && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">RRP</p>
                <p className="text-sm text-muted-foreground">{formatPrice(equipment.rrp_pence)}</p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {(onSelect || onViewDetails) && !compact && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
            {onSelect && (
              <Button
                size="sm"
                variant={isSelected ? "default" : "outline"}
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect(equipment)
                }}
              >
                {isSelected ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Selected
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </>
                )}
              </Button>
            )}
            {onViewDetails && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  onViewDetails(equipment)
                }}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </CardContent>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 left-2">
          <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
            <Check className="h-4 w-4 text-primary-foreground" />
          </div>
        </div>
      )}
    </Card>
  )
}
