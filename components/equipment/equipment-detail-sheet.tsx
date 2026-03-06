"use client"

import * as React from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/animated"
import {
  Star,
  StarOff,
  ExternalLink,
  FileText,
  ShieldCheck,
  Zap,
  Sun,
  Battery,
  LayoutGrid,
  Car,
  Plus,
  Copy,
  Check,
} from "lucide-react"
import { useEquipmentItem, useToggleFavourite, useFavouriteEquipment } from "@/lib/api/equipment-hooks"
import type { EquipmentWithSpecs, EquipmentCategory } from "@/types/equipment"
import { toast } from "sonner"

interface EquipmentDetailSheetProps {
  equipmentId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddToJob?: (equipment: EquipmentWithSpecs) => void
}

const categoryIcons: Record<EquipmentCategory, React.ElementType> = {
  panel: Sun,
  inverter: Zap,
  battery: Battery,
  mounting: LayoutGrid,
  ev_charger: Car,
  heat_pump: Zap,
  accessory: Zap,
  cable: Zap,
  connector: Zap,
  isolator: Zap,
  optimiser: Zap,
  microinverter: Zap,
  consumer_unit: LayoutGrid,
  meter: Zap,
  ct_clamp: Zap,
  surge_protector: Zap,
  pigeon_mesh: LayoutGrid,
  immersion_diverter: Zap,
  other: Zap,
}

function formatPrice(pence: number | undefined): string {
  if (!pence) return '—'
  return `£${(pence / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function SpecRow({ label, value, unit }: { label: string; value: React.ReactNode; unit?: string }) {
  if (value === undefined || value === null) return null
  return (
    <div className="flex justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">
        {value}
        {unit && <span className="text-muted-foreground ml-1">{unit}</span>}
      </span>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </Button>
  )
}

export function EquipmentDetailSheet({
  equipmentId,
  open,
  onOpenChange,
  onAddToJob,
}: EquipmentDetailSheetProps) {
  const { data: equipment, isLoading } = useEquipmentItem(equipmentId || '')
  const { data: favourites } = useFavouriteEquipment()
  const toggleFavourite = useToggleFavourite()

  const isFavourite = favourites?.some(f => f.id === equipmentId) || false
  const CategoryIcon = equipment ? categoryIcons[equipment.category] : Zap

  const handleToggleFavourite = async () => {
    if (!equipmentId) return
    try {
      await toggleFavourite.mutateAsync({ equipmentId, isFavourite: !isFavourite })
      toast.success(isFavourite ? 'Removed from favourites' : 'Added to favourites')
    } catch {
      toast.error('Failed to update favourites')
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-[200px]" />
          </div>
        ) : equipment ? (
          <>
            <SheetHeader className="p-6 pb-0">
              <div className="flex items-start gap-4">
                {/* Icon/Image */}
                <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  {equipment.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={equipment.image_url}
                      alt={equipment.full_model_name}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-contain rounded-xl"
                    />
                  ) : (
                    <CategoryIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">{equipment.manufacturer_name}</p>
                  <SheetTitle className="text-xl">{equipment.full_model_name}</SheetTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary">{equipment.category.replace('_', ' ')}</Badge>
                    {equipment.mcs_certified && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        Certified
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Favourite Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleToggleFavourite}
                >
                  {isFavourite ? (
                    <Star className="h-5 w-5 fill-teal-400 text-teal-400" />
                  ) : (
                    <StarOff className="h-5 w-5 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </SheetHeader>

            <ScrollArea className="flex-1 p-6">
              <Tabs defaultValue="specs" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="specs">Specifications</TabsTrigger>
                  <TabsTrigger value="warranty">Warranty</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                </TabsList>

                <TabsContent value="specs" className="mt-4 space-y-6">
                  {/* Pricing */}
                  <div className="rounded-lg bg-muted/50 p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">TRADE PRICE</p>
                        <p className="text-2xl font-bold">{formatPrice(equipment.typical_trade_price_pence)}</p>
                      </div>
                      {equipment.rrp_pence && (
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground font-medium">RRP</p>
                          <p className="text-lg text-muted-foreground">{formatPrice(equipment.rrp_pence)}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SKU */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">SKU</span>
                    <div className="flex items-center gap-1">
                      <code className="bg-muted px-2 py-1 rounded text-xs">{equipment.sku}</code>
                      <CopyButton text={equipment.sku} />
                    </div>
                  </div>

                  <Separator />

                  {/* Panel Specs */}
                  {equipment.panel_specs && (
                    <div className="space-y-1">
                      <h4 className="font-semibold text-sm mb-3">Electrical Specifications (STC)</h4>
                      <SpecRow label="Power Rating" value={equipment.panel_specs.power_rating_wp} unit="W" />
                      <SpecRow label="Efficiency" value={equipment.panel_specs.efficiency_percent?.toFixed(1)} unit="%" />
                      <SpecRow label="Open Circuit Voltage (Voc)" value={equipment.panel_specs.voc_v} unit="V" />
                      <SpecRow label="Short Circuit Current (Isc)" value={equipment.panel_specs.isc_a} unit="A" />
                      <SpecRow label="Max Power Voltage (Vmp)" value={equipment.panel_specs.vmp_v} unit="V" />
                      <SpecRow label="Max Power Current (Imp)" value={equipment.panel_specs.imp_a} unit="A" />

                      <h4 className="font-semibold text-sm mt-6 mb-3">Physical Specifications</h4>
                      <SpecRow label="Dimensions" value={`${equipment.panel_specs.length_mm} × ${equipment.panel_specs.width_mm} × ${equipment.panel_specs.depth_mm || 35}`} unit="mm" />
                      <SpecRow label="Weight" value={equipment.panel_specs.weight_kg} unit="kg" />
                      <SpecRow label="Cell Type" value={equipment.panel_specs.cell_type} />
                      <SpecRow label="Cell Count" value={equipment.panel_specs.cell_count} />
                      <SpecRow label="Frame Colour" value={equipment.panel_specs.frame_colour} />
                      <SpecRow label="Backsheet Colour" value={equipment.panel_specs.backsheet_colour} />

                      <h4 className="font-semibold text-sm mt-6 mb-3">Temperature Coefficients</h4>
                      <SpecRow label="Pmax Temp Coeff" value={equipment.panel_specs.temp_coeff_pmax_percent_per_c} unit="%/°C" />
                      <SpecRow label="Voc Temp Coeff" value={equipment.panel_specs.temp_coeff_voc_percent_per_c} unit="%/°C" />
                    </div>
                  )}

                  {/* Inverter Specs */}
                  {equipment.inverter_specs && (
                    <div className="space-y-1">
                      <h4 className="font-semibold text-sm mb-3">Power Specifications</h4>
                      <SpecRow label="Rated AC Power" value={(equipment.inverter_specs.rated_ac_power_w / 1000).toFixed(1)} unit="kW" />
                      <SpecRow label="Max DC Power" value={equipment.inverter_specs.max_dc_power_w ? (equipment.inverter_specs.max_dc_power_w / 1000).toFixed(1) : undefined} unit="kW" />
                      <SpecRow label="Type" value={equipment.inverter_specs.inverter_type.replace('_', ' ')} />
                      <SpecRow label="Phase" value={equipment.inverter_specs.phase_type === 'single' ? 'Single Phase' : 'Three Phase'} />
                      <SpecRow label="Max Efficiency" value={equipment.inverter_specs.max_efficiency_percent} unit="%" />

                      <h4 className="font-semibold text-sm mt-6 mb-3">MPPT Specifications</h4>
                      <SpecRow label="Max DC Voltage" value={equipment.inverter_specs.max_dc_voltage_v} unit="V" />
                      <SpecRow label="MPPT Voltage Range" value={`${equipment.inverter_specs.mppt_voltage_range_min_v} - ${equipment.inverter_specs.mppt_voltage_range_max_v}`} unit="V" />
                      <SpecRow label="MPPT Count" value={equipment.inverter_specs.mppt_count} />

                      {equipment.inverter_specs.battery_compatible && (
                        <>
                          <h4 className="font-semibold text-sm mt-6 mb-3">Battery Specifications</h4>
                          <SpecRow label="Battery Compatible" value="Yes" />
                          <SpecRow label="Max Charge Power" value={equipment.inverter_specs.max_charge_power_w ? (equipment.inverter_specs.max_charge_power_w / 1000).toFixed(1) : undefined} unit="kW" />
                          <SpecRow label="Max Discharge Power" value={equipment.inverter_specs.max_discharge_power_w ? (equipment.inverter_specs.max_discharge_power_w / 1000).toFixed(1) : undefined} unit="kW" />
                        </>
                      )}

                      <h4 className="font-semibold text-sm mt-6 mb-3">Grid Compliance</h4>
                      <SpecRow label="G98 Compliant" value={equipment.inverter_specs.g98_compliant ? 'Yes' : 'No'} />
                      <SpecRow label="G99 Compliant" value={equipment.inverter_specs.g99_compliant ? 'Yes' : 'No'} />
                    </div>
                  )}

                  {/* Battery Specs */}
                  {equipment.battery_specs && (
                    <div className="space-y-1">
                      <h4 className="font-semibold text-sm mb-3">Capacity</h4>
                      <SpecRow label="Total Capacity" value={equipment.battery_specs.total_capacity_kwh} unit="kWh" />
                      <SpecRow label="Usable Capacity" value={equipment.battery_specs.usable_capacity_kwh} unit="kWh" />
                      <SpecRow label="Depth of Discharge" value={equipment.battery_specs.depth_of_discharge_percent} unit="%" />

                      <h4 className="font-semibold text-sm mt-6 mb-3">Power</h4>
                      <SpecRow label="Nominal Power" value={equipment.battery_specs.nominal_power_kw} unit="kW" />
                      <SpecRow label="Max Charge Power" value={equipment.battery_specs.max_charge_power_kw} unit="kW" />
                      <SpecRow label="Max Discharge Power" value={equipment.battery_specs.max_discharge_power_kw} unit="kW" />

                      <h4 className="font-semibold text-sm mt-6 mb-3">Technology</h4>
                      <SpecRow label="Chemistry" value={equipment.battery_specs.chemistry} />
                      <SpecRow label="Round-trip Efficiency" value={equipment.battery_specs.round_trip_efficiency_percent} unit="%" />
                      <SpecRow label="Cycle Life" value={equipment.battery_specs.cycle_life_cycles?.toLocaleString()} unit="cycles" />
                      <SpecRow label="Weight" value={equipment.battery_specs.weight_kg} unit="kg" />
                    </div>
                  )}

                  {/* EV Charger Specs */}
                  {equipment.ev_charger_specs && (
                    <div className="space-y-1">
                      <h4 className="font-semibold text-sm mb-3">Power</h4>
                      <SpecRow label="Rated Power" value={equipment.ev_charger_specs.rated_power_kw} unit="kW" />
                      <SpecRow label="Current Rating" value={equipment.ev_charger_specs.current_rating_a} unit="A" />
                      <SpecRow label="Phase" value={equipment.ev_charger_specs.phase_type === 'single' ? 'Single Phase' : 'Three Phase'} />

                      <h4 className="font-semibold text-sm mt-6 mb-3">Features</h4>
                      <SpecRow label="Connector Type" value={equipment.ev_charger_specs.connector_type} />
                      <SpecRow label="Cable Length" value={equipment.ev_charger_specs.cable_length_m} unit="m" />
                      <SpecRow label="Solar Compatible" value={equipment.ev_charger_specs.solar_compatible ? 'Yes' : 'No'} />
                      <SpecRow label="WiFi Enabled" value={equipment.ev_charger_specs.wifi_enabled ? 'Yes' : 'No'} />
                      <SpecRow label="App" value={equipment.ev_charger_specs.app_name} />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="warranty" className="mt-4 space-y-4">
                  {equipment.panel_specs && (
                    <>
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Product Warranty</p>
                        <p className="text-2xl font-bold">{equipment.panel_specs.product_warranty_years} years</p>
                      </div>
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Performance Warranty</p>
                        <p className="text-2xl font-bold">{equipment.panel_specs.performance_warranty_years} years</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {equipment.panel_specs.performance_warranty_year1_percent}% Year 1, 
                          {' '}{equipment.panel_specs.performance_warranty_final_percent}% Year {equipment.panel_specs.performance_warranty_years}
                        </p>
                      </div>
                    </>
                  )}

                  {equipment.inverter_specs && (
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">Warranty</p>
                      <p className="text-2xl font-bold">{equipment.inverter_specs.warranty_years} years</p>
                    </div>
                  )}

                  {equipment.battery_specs && (
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">Warranty</p>
                      <p className="text-2xl font-bold">{equipment.battery_specs.warranty_years} years</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="documents" className="mt-4 space-y-3">
                  {equipment.datasheet_url && (
                    <a
                      href={equipment.datasheet_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">Datasheet</p>
                        <p className="text-xs text-muted-foreground">Technical specifications PDF</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </a>
                  )}

                  {!equipment.datasheet_url && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No documents available
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </ScrollArea>

            {/* Actions */}
            {onAddToJob && (
              <div className="border-t p-4">
                <Button onClick={() => onAddToJob(equipment)} className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  Add to Job
                </Button>
              </div>
            )}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
