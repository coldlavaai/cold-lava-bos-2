"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/animated"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EquipmentCard } from "./equipment-card"
import {
  Search,
  Star,
  Sun,
  Zap,
  Battery,
  LayoutGrid,
  Car,
  X,
  Filter,
  Plus,
} from "lucide-react"
import {
  useEquipmentCatalogue,
  useFavouriteEquipment,
  useManufacturers,
  useToggleFavourite,
} from "@/lib/api/equipment-hooks"
import type { EquipmentWithSpecs, EquipmentCategory } from "@/types/equipment"
import { useDebounce } from "@/hooks/use-debounce"
import { toast } from "sonner"

const MAIN_CATEGORIES: { id: EquipmentCategory; label: string; icon: React.ElementType }[] = [
  { id: 'panel', label: 'Panels', icon: Sun },
  { id: 'inverter', label: 'Inverters', icon: Zap },
  { id: 'battery', label: 'Batteries', icon: Battery },
  { id: 'mounting', label: 'Mounting', icon: LayoutGrid },
  { id: 'ev_charger', label: 'EV Chargers', icon: Car },
]

interface EquipmentPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (equipment: EquipmentWithSpecs, quantity: number) => void
  selectedIds?: string[]
  defaultCategory?: EquipmentCategory
  mode?: 'dialog' | 'sheet'
  title?: string
  allowMultiple?: boolean
}

export function EquipmentPicker({
  open,
  onOpenChange,
  onSelect,
  selectedIds = [],
  defaultCategory = 'panel',
  mode = 'sheet',
  title = 'Add Equipment',
  allowMultiple = false,
}: EquipmentPickerProps) {
  const [activeTab, setActiveTab] = React.useState<EquipmentCategory | 'favourites'>(defaultCategory)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [manufacturerFilter, setManufacturerFilter] = React.useState<string>('all')
  const [selectedEquipment, setSelectedEquipment] = React.useState<EquipmentWithSpecs | null>(null)
  const [quantity, setQuantity] = React.useState(1)

  const debouncedSearch = useDebounce(searchQuery, 300)

  // Data fetching
  const currentCategory = activeTab === 'favourites' ? undefined : activeTab
  const { data: catalogueData, isLoading: catalogueLoading } = useEquipmentCatalogue({
    category: currentCategory,
    search: debouncedSearch || undefined,
    manufacturer_id: manufacturerFilter !== 'all' ? manufacturerFilter : undefined,
    is_active: true,
    available_in_uk: true,
    limit: 50,
  })
  const { data: favourites, isLoading: favouritesLoading } = useFavouriteEquipment()
  const { data: manufacturers } = useManufacturers(currentCategory ? [currentCategory] : undefined)
  const toggleFavourite = useToggleFavourite()

  const equipment = React.useMemo(() => {
    if (activeTab === 'favourites') {
      return favourites || []
    }
    return catalogueData?.data || []
  }, [activeTab, catalogueData, favourites])

  const isLoading = activeTab === 'favourites' ? favouritesLoading : catalogueLoading

  // Reset filters when category changes
  React.useEffect(() => {
    setManufacturerFilter('all')
    setSearchQuery('')
  }, [activeTab])

  // Reset state when opening
  React.useEffect(() => {
    if (open) {
      setSelectedEquipment(null)
      setQuantity(1)
    }
  }, [open])

  const handleToggleFavourite = async (id: string, isFavourite: boolean) => {
    try {
      await toggleFavourite.mutateAsync({ equipmentId: id, isFavourite })
      toast.success(isFavourite ? 'Added to favourites' : 'Removed from favourites')
    } catch {
      toast.error('Failed to update favourites')
    }
  }

  const handleSelect = (eq: EquipmentWithSpecs) => {
    if (allowMultiple) {
      onSelect(eq, 1)
      toast.success(`Added ${eq.model}`)
    } else {
      setSelectedEquipment(eq)
    }
  }

  const handleConfirm = () => {
    if (selectedEquipment) {
      onSelect(selectedEquipment, quantity)
      onOpenChange(false)
    }
  }

  const favouriteIds = favourites?.map(f => f.id) || []

  const content = (
    <div className="flex flex-col h-full">
      {/* Search & Filters */}
      <div className="px-4 pb-4 space-y-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by model, manufacturer, or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {activeTab !== 'favourites' && manufacturers && manufacturers.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={manufacturerFilter} onValueChange={setManufacturerFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Manufacturers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Manufacturers</SelectItem>
                {manufacturers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Category Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as EquipmentCategory | 'favourites')}
        className="flex-1 flex flex-col min-h-0"
      >
        <div className="px-4 pt-2 border-b">
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="favourites" className="gap-1">
              <Star className="h-4 w-4" />
              <span className="hidden sm:inline">Favourites</span>
            </TabsTrigger>
            {MAIN_CATEGORIES.map(cat => (
              <TabsTrigger key={cat.id} value={cat.id} className="gap-1">
                <cat.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{cat.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Equipment Grid */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-[180px] rounded-lg" />
                ))}
              </div>
            ) : equipment.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                {activeTab === 'favourites' ? (
                  <>
                    <Star className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <h3 className="font-semibold text-lg">No favourites yet</h3>
                    <p className="text-muted-foreground text-sm mt-1">
                      Star equipment to add it to your favourites for quick access
                    </p>
                  </>
                ) : searchQuery ? (
                  <>
                    <Search className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <h3 className="font-semibold text-lg">No results found</h3>
                    <p className="text-muted-foreground text-sm mt-1">
                      Try adjusting your search or filters
                    </p>
                  </>
                ) : (
                  <>
                    <LayoutGrid className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <h3 className="font-semibold text-lg">No equipment available</h3>
                    <p className="text-muted-foreground text-sm mt-1">
                      Equipment will appear here once added to the catalogue
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {equipment.map((eq) => (
                  <EquipmentCard
                    key={eq.id}
                    equipment={eq}
                    isFavourite={favouriteIds.includes(eq.id)}
                    isSelected={selectedEquipment?.id === eq.id || selectedIds.includes(eq.id)}
                    onToggleFavourite={handleToggleFavourite}
                    onSelect={handleSelect}
                    showPricing
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Selection Footer */}
        {selectedEquipment && !allowMultiple && (
          <div className="border-t p-4 bg-muted/30">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Zap className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">{selectedEquipment.manufacturer_name}</p>
                  <p className="font-medium truncate">{selectedEquipment.full_model_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Qty:</span>
                  <Input
                    type="number"
                    min={1}
                    max={999}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 text-center"
                  />
                </div>

                <Button onClick={handleConfirm} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add to Job
                </Button>
              </div>
            </div>
          </div>
        )}
      </Tabs>
    </div>
  )

  if (mode === 'dialog') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-4 pt-4 pb-0">
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-0">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        {content}
      </SheetContent>
    </Sheet>
  )
}
