"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import {
  Search,
  Plus,
  Package,
  ChevronRight,
  ChevronLeft,
  Zap,
  Battery,
  Sun,
  Box,
  AlertCircle,
  Download,
  FileText,
  ExternalLink,
  Home,
  Car,
  Filter,
  Star,
  ArrowLeft,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import { cn } from "@/lib/utils"
import type { EquipmentWithSpecs, EquipmentCategory, Manufacturer } from "@/types/equipment"

// ============================================
// TYPES
// ============================================

interface NavigationState {
  category: EquipmentCategory | null
  subcategory: string | null
  manufacturerId: string | null
}

interface CategoryConfig {
  value: EquipmentCategory
  label: string
  icon: React.ElementType
  color: string
  bgColor: string
  description: string
  subcategories: {
    type: 'manufacturer' | 'spec' | 'both'
    specField?: string
    specLabel?: string
    specRanges?: { label: string; min?: number; max?: number }[]
  }
}

// ============================================
// CATEGORY CONFIGURATION
// ============================================

const CATEGORIES: CategoryConfig[] = [
  {
    value: 'panel',
    label: 'Products',
    icon: Sun,
    color: 'text-teal-400',
    bgColor: 'bg-teal-500',
    description: 'Core product catalogue',
    subcategories: {
      type: 'both',
      specField: 'power_rating_wp',
      specLabel: 'Rating',
      specRanges: [
        { label: '400+', min: 400 },
        { label: '350-399', min: 350, max: 399 },
        { label: '300-349', min: 300, max: 349 },
        { label: 'Under 300', max: 299 },
      ]
    }
  },
  {
    value: 'inverter',
    label: 'Software',
    icon: Zap,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500',
    description: 'Software tools and licences',
    subcategories: {
      type: 'both',
      specField: 'rated_ac_power_w',
      specLabel: 'Tier',
      specRanges: [
        { label: 'Enterprise', min: 10000 },
        { label: 'Professional', min: 6000, max: 9999 },
        { label: 'Standard', min: 3000, max: 5999 },
        { label: 'Starter', max: 2999 },
      ]
    }
  },
  {
    value: 'battery',
    label: 'Services',
    icon: Battery,
    color: 'text-teal-400',
    bgColor: 'bg-teal-600',
    description: 'Service packages and add-ons',
    subcategories: {
      type: 'both',
      specField: 'usable_capacity_kwh',
      specLabel: 'Package',
      specRanges: [
        { label: 'Premium', min: 15 },
        { label: 'Advanced', min: 10, max: 14.9 },
        { label: 'Standard', min: 5, max: 9.9 },
        { label: 'Basic', max: 4.9 },
      ]
    }
  },
  {
    value: 'ev_charger',
    label: 'Integrations',
    icon: Car,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-600',
    description: 'Third-party integration modules',
    subcategories: {
      type: 'manufacturer',
    }
  },
  {
    value: 'mounting',
    label: 'Accessories',
    icon: Box,
    color: 'text-teal-400',
    bgColor: 'bg-teal-500',
    description: 'Supporting tools and accessories',
    subcategories: {
      type: 'manufacturer',
    }
  },
]

// ============================================
// HOOKS
// ============================================

interface CataloguePagination {
  total: number
  limit: number
  offset: number
  totalPages: number
}

// Normalize specs from arrays to single objects (Supabase returns arrays for FK joins)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeEquipment(item: any): EquipmentWithSpecs {
  const normalized = { ...item }
  if (Array.isArray(item.panel_specs)) normalized.panel_specs = item.panel_specs[0]
  if (Array.isArray(item.inverter_specs)) normalized.inverter_specs = item.inverter_specs[0]
  if (Array.isArray(item.battery_specs)) normalized.battery_specs = item.battery_specs[0]
  if (Array.isArray(item.mounting_specs)) normalized.mounting_specs = item.mounting_specs[0]
  if (Array.isArray(item.ev_charger_specs)) normalized.ev_charger_specs = item.ev_charger_specs[0]
  return normalized as EquipmentWithSpecs
}

function useEquipmentCatalogue(params: {
  category?: EquipmentCategory
  manufacturer_id?: string
  search?: string
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: ["equipment", "catalogue", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (params.category) searchParams.set("category", params.category)
      if (params.manufacturer_id) searchParams.set("manufacturer_id", params.manufacturer_id)
      if (params.search) searchParams.set("search", params.search)
      if (params.limit) searchParams.set("limit", String(params.limit))
      if (params.offset) searchParams.set("offset", String(params.offset))
      
      // API returns { data: EquipmentWithSpecs[], meta: { pagination: {...} } }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await api.get<any[]>(`/equipment/catalogue?${searchParams.toString()}`)
      const items = (response.data || []).map(normalizeEquipment)
      return {
        items,
        pagination: response.meta?.pagination as CataloguePagination | undefined
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}

function useManufacturers(category?: EquipmentCategory) {
  return useQuery({
    queryKey: ["manufacturers", category],
    queryFn: async (): Promise<Manufacturer[]> => {
      const params = category ? `?categories=${category}` : ''
      const response = await api.get<Manufacturer[]>(`/equipment/manufacturers${params}`)
      return response.data || []
    },
    staleTime: 30 * 60 * 1000,
  })
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatCurrency(pence: number | null | undefined) {
  if (pence === null || pence === undefined) return "—"
  return `£${(pence / 100).toFixed(2)}`
}

// Helper to get first item if array, or the object itself
function getFirstOrSelf<T>(value: T | T[] | undefined | null): T | undefined {
  if (!value) return undefined
  return Array.isArray(value) ? value[0] : value
}

function getSpecValue(equipment: EquipmentWithSpecs, category: EquipmentCategory): string {
  switch (category) {
    case 'panel':
      const panelSpecs = getFirstOrSelf(equipment.panel_specs)
      if (panelSpecs?.power_rating_wp) {
        return `${panelSpecs.power_rating_wp}W`
      }
      break
    case 'inverter':
      const inverterSpecs = getFirstOrSelf(equipment.inverter_specs)
      if (inverterSpecs?.rated_ac_power_w) {
        return `${(inverterSpecs.rated_ac_power_w / 1000).toFixed(1)}kW`
      }
      break
    case 'battery':
      const batterySpecs = getFirstOrSelf(equipment.battery_specs)
      if (batterySpecs?.usable_capacity_kwh) {
        return `${batterySpecs.usable_capacity_kwh}kWh`
      }
      break
    case 'ev_charger':
      const evSpecs = getFirstOrSelf(equipment.ev_charger_specs)
      if (evSpecs && 'rated_power_kw' in evSpecs) {
        return `${evSpecs.rated_power_kw}kW`
      }
      break
  }
  return ''
}

function getSpecNumericValue(equipment: EquipmentWithSpecs, category: EquipmentCategory): number | null {
  switch (category) {
    case 'panel':
      return getFirstOrSelf(equipment.panel_specs)?.power_rating_wp ?? null
    case 'inverter':
      return getFirstOrSelf(equipment.inverter_specs)?.rated_ac_power_w ?? null
    case 'battery':
      return getFirstOrSelf(equipment.battery_specs)?.usable_capacity_kwh ?? null
  }
  return null
}

// ============================================
// COMPONENTS
// ============================================

function CategoryCard({ 
  config, 
  isActive, 
  onClick,
  productCount 
}: { 
  config: CategoryConfig
  isActive: boolean
  onClick: () => void
  productCount?: number
}) {
  const Icon = config.icon
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-200",
        "hover:scale-[1.02] hover:shadow-lg",
        isActive 
          ? "border-primary bg-primary/5 shadow-md" 
          : "border-transparent bg-muted/50 hover:bg-muted hover:border-muted-foreground/20"
      )}
    >
      <div className={cn("p-4 rounded-xl text-white shadow-lg", config.bgColor)}>
        <Icon className="h-7 w-7" />
      </div>
      <div className="text-center">
        <span className={cn("text-sm font-semibold block", isActive && "text-primary")}>
          {config.label}
        </span>
        <span className="text-xs text-muted-foreground mt-0.5 block">
          {config.description}
        </span>
      </div>
      {productCount !== undefined && (
        <Badge variant="secondary" className="absolute top-2 right-2 text-xs">
          {productCount}
        </Badge>
      )}
      <ChevronRight className={cn(
        "absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-transform",
        isActive && "translate-x-1"
      )} />
    </button>
  )
}

function SubcategoryCard({ 
  label, 
  icon: Icon, 
  count, 
  isActive, 
  onClick 
}: { 
  label: string
  icon?: React.ElementType
  count?: number
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-4 rounded-xl border transition-all",
        "hover:bg-muted hover:border-muted-foreground/20",
        isActive 
          ? "border-primary bg-primary/5" 
          : "border-border bg-card"
      )}
    >
      {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
      <span className="flex-1 text-left font-medium">{label}</span>
      {count !== undefined && (
        <Badge variant="outline" className="text-xs">{count}</Badge>
      )}
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  )
}

function Breadcrumbs({ 
  nav, 
  onNavigate,
  categoryConfig,
  manufacturers
}: { 
  nav: NavigationState
  onNavigate: (nav: Partial<NavigationState>) => void
  categoryConfig?: CategoryConfig
  manufacturers?: Manufacturer[]
}) {
  const items = [
    { label: 'Equipment', onClick: () => onNavigate({ category: null, subcategory: null, manufacturerId: null }) }
  ]
  
  if (nav.category && categoryConfig) {
    items.push({ 
      label: categoryConfig.label, 
      onClick: () => onNavigate({ subcategory: null, manufacturerId: null }) 
    })
  }
  
  if (nav.manufacturerId && manufacturers) {
    const manufacturer = manufacturers.find(m => m.id === nav.manufacturerId)
    if (manufacturer) {
      items.push({ label: manufacturer.name, onClick: () => {} })
    }
  }
  
  if (nav.subcategory) {
    items.push({ label: nav.subcategory, onClick: () => {} })
  }
  
  return (
    <nav className="flex items-center gap-2 text-sm">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <button
            onClick={item.onClick}
            className={cn(
              "hover:text-primary transition-colors",
              index === items.length - 1 ? "text-foreground font-medium" : "text-muted-foreground"
            )}
          >
            {index === 0 && <Home className="h-4 w-4 inline-block mr-1" />}
            {item.label}
          </button>
        </React.Fragment>
      ))}
    </nav>
  )
}

function ProductCard({ 
  equipment, 
  category,
  onClick 
}: { 
  equipment: EquipmentWithSpecs
  category: EquipmentCategory
  onClick: () => void
}) {
  const specValue = getSpecValue(equipment, category)
  const categoryConfig = CATEGORIES.find(c => c.value === category)
  const Icon = categoryConfig?.icon || Package
  
  return (
    <Card 
      className="p-4 cursor-pointer hover:shadow-md transition-all hover:border-primary/50 group"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "p-2.5 rounded-lg shrink-0",
          categoryConfig?.bgColor || 'bg-muted',
          "bg-opacity-10"
        )}>
          <Icon className={cn("h-5 w-5", categoryConfig?.color || 'text-muted-foreground')} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                {equipment.model}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {equipment.manufacturer_name}
              </p>
            </div>
            {specValue && (
              <Badge variant="secondary" className="shrink-0 text-xs font-semibold">
                {specValue}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground">Trade Price</p>
              <p className="font-semibold text-sm">{formatCurrency(equipment.typical_trade_price_pence)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">RRP</p>
              <p className="font-semibold text-sm">{formatCurrency(equipment.rrp_pence)}</p>
            </div>
          </div>
          
          {equipment.mcs_certified && (
            <Badge variant="outline" className="mt-2 text-xs bg-green-500/15 text-green-300 border-green-500/30">
              MCS Certified
            </Badge>
          )}
        </div>
      </div>
    </Card>
  )
}

function ProductDetailSheet({ 
  equipment, 
  category,
  onClose 
}: { 
  equipment: EquipmentWithSpecs | null
  category: EquipmentCategory | null
  onClose: () => void
}) {
  if (!equipment || !category) return null
  
  const categoryConfig = CATEGORIES.find(c => c.value === category)
  const Icon = categoryConfig?.icon || Package
  const specValue = getSpecValue(equipment, category)
  
  // Get category-specific specs
  const specs: { label: string; value: string | number | boolean | null | undefined }[] = []
  
  const panelSpecs = getFirstOrSelf(equipment.panel_specs)
  const inverterSpecs = getFirstOrSelf(equipment.inverter_specs)
  const batterySpecs = getFirstOrSelf(equipment.battery_specs)
  
  if (category === 'panel' && panelSpecs) {
    const s = panelSpecs
    specs.push(
      { label: 'Power Rating', value: `${s.power_rating_wp}W` },
      { label: 'Efficiency', value: s.efficiency_percent ? `${s.efficiency_percent}%` : null },
      { label: 'Voc', value: s.voc_v ? `${s.voc_v}V` : null },
      { label: 'Isc', value: s.isc_a ? `${s.isc_a}A` : null },
      { label: 'Vmp', value: s.vmp_v ? `${s.vmp_v}V` : null },
      { label: 'Imp', value: s.imp_a ? `${s.imp_a}A` : null },
      { label: 'Dimensions', value: `${s.length_mm} × ${s.width_mm}mm` },
      { label: 'Weight', value: s.weight_kg ? `${s.weight_kg}kg` : null },
      { label: 'Cell Type', value: s.cell_type },
      { label: 'Half Cut', value: s.half_cut ? 'Yes' : 'No' },
      { label: 'Bifacial', value: s.bifacial ? 'Yes' : 'No' },
    )
  }
  
  if (category === 'inverter' && inverterSpecs) {
    const s = inverterSpecs
    specs.push(
      { label: 'AC Power', value: `${(s.rated_ac_power_w / 1000).toFixed(1)}kW` },
      { label: 'Type', value: s.inverter_type },
      { label: 'Phase', value: s.phase_type },
      { label: 'Max DC Voltage', value: s.max_dc_voltage_v ? `${s.max_dc_voltage_v}V` : null },
      { label: 'MPPT Range', value: `${s.mppt_voltage_range_min_v}-${s.mppt_voltage_range_max_v}V` },
      { label: 'MPPT Count', value: s.mppt_count },
      { label: 'Max Efficiency', value: s.max_efficiency_percent ? `${s.max_efficiency_percent}%` : null },
      { label: 'Battery Compatible', value: s.battery_compatible ? 'Yes' : 'No' },
    )
  }
  
  if (category === 'battery' && batterySpecs) {
    const s = batterySpecs
    specs.push(
      { label: 'Usable Capacity', value: `${s.usable_capacity_kwh}kWh` },
      { label: 'Total Capacity', value: `${s.total_capacity_kwh}kWh` },
      { label: 'Max Charge', value: s.max_charge_power_kw ? `${s.max_charge_power_kw}kW` : null },
      { label: 'Max Discharge', value: s.max_discharge_power_kw ? `${s.max_discharge_power_kw}kW` : null },
      { label: 'Chemistry', value: s.chemistry },
      { label: 'Cycle Life', value: s.cycle_life_cycles ? `${s.cycle_life_cycles} cycles` : null },
      { label: 'Round-trip Efficiency', value: s.round_trip_efficiency_percent ? `${s.round_trip_efficiency_percent}%` : null },
    )
  }
  
  return (
    <Sheet open={!!equipment} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start gap-3">
            <div className={cn("p-3 rounded-xl text-white shrink-0", categoryConfig?.bgColor || 'bg-muted')}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg leading-tight">{equipment.model}</SheetTitle>
              <SheetDescription className="mt-1">
                {equipment.manufacturer_name}
                {equipment.model_variant && ` • ${equipment.model_variant}`}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Key Spec Badge */}
          {specValue && (
            <div className="flex items-center gap-2">
              <Badge className={cn("text-lg py-2 px-4", categoryConfig?.bgColor, "text-white")}>
                {specValue}
              </Badge>
              {equipment.mcs_certified && (
                <Badge variant="outline" className="bg-green-500/15 text-green-300 border-green-500/30">
                  MCS Certified
                </Badge>
              )}
            </div>
          )}
          
          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-muted/50 border">
              <p className="text-xs text-muted-foreground">Trade Price</p>
              <p className="text-xl font-bold">{formatCurrency(equipment.typical_trade_price_pence)}</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/50 border">
              <p className="text-xs text-muted-foreground">RRP</p>
              <p className="text-xl font-bold">{formatCurrency(equipment.rrp_pence)}</p>
            </div>
          </div>

          {/* Specifications */}
          {specs.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Specifications</h4>
              <div className="space-y-1">
                {specs.filter(s => s.value !== null && s.value !== undefined).map((spec, i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-border text-sm">
                    <span className="text-muted-foreground">{spec.label}</span>
                    <span className="font-medium">{String(spec.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Product Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Product Info</h4>
            <div className="space-y-1 text-sm">
              {equipment.sku && (
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">SKU</span>
                  <span className="font-mono text-xs">{equipment.sku}</span>
                </div>
              )}
              {equipment.primary_uk_distributor && (
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">UK Distributor</span>
                  <span className="font-medium capitalize">{equipment.primary_uk_distributor}</span>
                </div>
              )}
            </div>
          </div>

          {/* Documents */}
          <div className="space-y-3 pt-4 border-t border-border">
            <h4 className="text-sm font-semibold">Documents</h4>
            {equipment.datasheet_url ? (
              <Button asChild className="w-full gap-2">
                <a href={equipment.datasheet_url} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4" />
                  Download Datasheet
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </a>
              </Button>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                <FileText className="h-5 w-5" />
                <span>No datasheet available yet</span>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function EquipmentPage() {
  const [nav, setNav] = React.useState<NavigationState>({
    category: null,
    subcategory: null,
    manufacturerId: null,
  })
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedEquipment, setSelectedEquipment] = React.useState<EquipmentWithSpecs | null>(null)
  const limit = 999 // Load all records — no pagination

  const categoryConfig = nav.category ? CATEGORIES.find(c => c.value === nav.category) : null

  // Fetch manufacturers for the selected category
  const { data: manufacturers = [] } = useManufacturers(nav.category || undefined)

  // Fetch equipment when we have filters
  const shouldFetchEquipment = nav.category && (nav.manufacturerId || nav.subcategory || searchQuery)
  const { data: equipmentResponse, isLoading: isLoadingEquipment } = useEquipmentCatalogue({
    category: nav.category || undefined,
    manufacturer_id: nav.manufacturerId || undefined,
    search: searchQuery || undefined,
    limit,
    offset: 0,
  })

  // Extract equipment data from response
  const equipment = shouldFetchEquipment && equipmentResponse?.items ? equipmentResponse.items : [] as EquipmentWithSpecs[]
  const pagination = equipmentResponse?.pagination

  // Filter by spec range if subcategory is a spec range
  const filteredEquipment = React.useMemo(() => {
    if (!nav.subcategory || !categoryConfig?.subcategories.specRanges) {
      return equipment
    }
    
    const range = categoryConfig.subcategories.specRanges.find(r => r.label === nav.subcategory)
    if (!range) return equipment
    
    return equipment.filter(e => {
      const value = getSpecNumericValue(e, nav.category!)
      if (value === null) return false
      if (range.min !== undefined && value < range.min) return false
      if (range.max !== undefined && value > range.max) return false
      return true
    })
  }, [equipment, nav.subcategory, nav.category, categoryConfig])

  const handleNavigate = (update: Partial<NavigationState>) => {
    setNav(prev => ({ ...prev, ...update }))
    setSearchQuery("")
  }

  const handleBack = () => {
    if (nav.manufacturerId || nav.subcategory) {
      handleNavigate({ manufacturerId: null, subcategory: null })
    } else if (nav.category) {
      handleNavigate({ category: null })
    }
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {(nav.category || nav.manufacturerId || nav.subcategory) && (
              <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div>
              <h1 className="text-xl md:text-2xl font-display font-bold gradient-text-solar">
                Equipment Catalog
              </h1>
              {!nav.category && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  Browse solar equipment by category
                </p>
              )}
            </div>
          </div>
          <Button className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Equipment</span>
          </Button>
        </div>

        {/* Breadcrumbs */}
        {nav.category && (
          <Breadcrumbs 
            nav={nav} 
            onNavigate={handleNavigate} 
            categoryConfig={categoryConfig!}
            manufacturers={manufacturers}
          />
        )}

        {/* Category Selection (Home View) */}
        {!nav.category && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {CATEGORIES.map(category => (
              <CategoryCard
                key={category.value}
                config={category}
                isActive={false}
                onClick={() => handleNavigate({ category: category.value })}
              />
            ))}
          </div>
        )}

        {/* Subcategory Selection */}
        {nav.category && !nav.manufacturerId && !nav.subcategory && !searchQuery && (
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={`Search ${categoryConfig?.label.toLowerCase()}...`}
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Manufacturers */}
              <Card className="p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  By Manufacturer
                </h3>
                <div className="space-y-2">
                  {manufacturers.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No manufacturers found
                    </p>
                  ) : (
                    manufacturers.slice(0, 10).map(manufacturer => (
                      <SubcategoryCard
                        key={manufacturer.id}
                        label={manufacturer.name}
                        isActive={false}
                        onClick={() => handleNavigate({ manufacturerId: manufacturer.id })}
                      />
                    ))
                  )}
                </div>
              </Card>

              {/* Spec Ranges */}
              {categoryConfig?.subcategories.specRanges && (
                <Card className="p-5">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    By {categoryConfig.subcategories.specLabel}
                  </h3>
                  <div className="space-y-2">
                    {categoryConfig.subcategories.specRanges.map(range => (
                      <SubcategoryCard
                        key={range.label}
                        label={range.label}
                        isActive={false}
                        onClick={() => handleNavigate({ subcategory: range.label })}
                      />
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Product List */}
        {(nav.manufacturerId || nav.subcategory || searchQuery) && (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search products..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="text-sm text-muted-foreground">
                {filteredEquipment.length} products
              </div>
            </div>

            {/* Product Grid */}
            {isLoadingEquipment ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <LoadingSkeleton key={i} className="h-40" />
                ))}
              </div>
            ) : filteredEquipment.length === 0 ? (
              <Card className="p-8 text-center">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium mb-1">No products found</p>
                <p className="text-xs text-muted-foreground">
                  Try adjusting your filters or search term
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredEquipment.map(item => (
                  <ProductCard
                    key={item.id}
                    equipment={item}
                    category={nav.category!}
                    onClick={() => setSelectedEquipment(item)}
                  />
                ))}
              </div>
            )}

            {/* Pagination removed — show all results */}
          </div>
        )}
      </div>

      {/* Product Detail Sheet */}
      <ProductDetailSheet
        equipment={selectedEquipment}
        category={nav.category}
        onClose={() => setSelectedEquipment(null)}
      />
    </>
  )
}
