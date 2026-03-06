"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/animated"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { EquipmentPicker } from "./equipment-picker"
import { cn } from "@/lib/utils"
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Sun,
  Zap,
  Battery,
  LayoutGrid,
  Car,
  Package,
  AlertTriangle,
  FileText,
} from "lucide-react"
import {
  useJobEquipment,
  useAddJobEquipment,
  useRemoveJobEquipment,
  useJobSystemDesign,
} from "@/lib/api/equipment-hooks"
import type { JobEquipmentAssignment, EquipmentWithSpecs, EquipmentCategory } from "@/types/equipment"
import { toast } from "sonner"

interface JobEquipmentSectionProps {
  jobId: string
  isEditable?: boolean
  className?: string
}

const categoryIcons: Record<EquipmentCategory, React.ElementType> = {
  panel: Sun,
  inverter: Zap,
  battery: Battery,
  mounting: LayoutGrid,
  ev_charger: Car,
  heat_pump: Zap,
  accessory: Package,
  cable: Package,
  connector: Package,
  isolator: Package,
  optimiser: Zap,
  microinverter: Zap,
  consumer_unit: LayoutGrid,
  meter: Package,
  ct_clamp: Package,
  surge_protector: Package,
  pigeon_mesh: LayoutGrid,
  immersion_diverter: Package,
  other: Package,
}

const statusColors: Record<string, string> = {
  planned: 'bg-white/[0.06] text-white/70 border-white/[0.08]',
  quoted: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  ordered: 'bg-teal-500/15 text-teal-300 border-teal-500/20',
  shipped: 'bg-purple-500/15 text-purple-300 border-purple-500/20',
  delivered: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
  installed: 'bg-green-500/15 text-green-300 border-green-500/20',
  commissioned: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  warranty_registered: 'bg-teal-500/15 text-teal-300 border-teal-500/20',
}

function formatPrice(pence: number | undefined | null): string {
  if (!pence) return '—'
  return `£${(pence / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function EquipmentRow({
  assignment,
  isEditable,
  onEdit,
  onDelete,
}: {
  assignment: JobEquipmentAssignment
  isEditable: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const CategoryIcon = categoryIcons[assignment.category] || Package

  return (
    <div className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors group">
      {/* Icon */}
      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        <CategoryIcon className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{assignment.model_name}</p>
          <Badge variant="outline" className={cn("text-xs", statusColors[assignment.status])}>
            {assignment.status.replace('_', ' ')}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {assignment.manufacturer_name}
          {assignment.location && ` • ${assignment.location}`}
        </p>
      </div>

      {/* Quantity & Price */}
      <div className="text-right flex-shrink-0">
        <p className="font-medium">×{assignment.quantity}</p>
        {assignment.total_price_pence && (
          <p className="text-sm text-muted-foreground">
            {formatPrice(assignment.total_price_pence)}
          </p>
        )}
      </div>

      {/* Actions */}
      {isEditable && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

function SystemSummaryCard({
  jobId,
}: {
  jobId: string
}) {
  const { data: systemDesign, isLoading } = useJobSystemDesign(jobId)

  if (isLoading) {
    return <Skeleton className="h-32" />
  }

  if (!systemDesign || systemDesign.total_kwp === 0) {
    return null
  }

  return (
    <Card className="bg-gradient-to-r from-teal-950/30 to-cyan-950/30 border-teal-800">
      <CardContent className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* System Size */}
          <div>
            <p className="text-xs text-muted-foreground font-medium">System Size</p>
            <p className="text-2xl font-bold text-teal-400">
              {systemDesign.total_kwp.toFixed(2)} <span className="text-sm font-normal">kWp</span>
            </p>
          </div>

          {/* Est. Generation */}
          <div>
            <p className="text-xs text-muted-foreground font-medium">Est. Annual Generation</p>
            <p className="text-2xl font-bold text-green-400">
              {systemDesign.estimated_annual_kwh.toLocaleString()} <span className="text-sm font-normal">kWh</span>
            </p>
          </div>

          {/* Battery */}
          {systemDesign.battery_capacity_kwh && (
            <div>
              <p className="text-xs text-muted-foreground font-medium">Battery Storage</p>
              <p className="text-2xl font-bold text-blue-400">
                {systemDesign.battery_capacity_kwh.toFixed(1)} <span className="text-sm font-normal">kWh</span>
              </p>
            </div>
          )}

          {/* G98/G99 */}
          <div>
            <p className="text-xs text-muted-foreground font-medium">Grid Connection</p>
            <div className="flex items-center gap-2 mt-1">
              {systemDesign.requires_g99 ? (
                <Badge className="bg-purple-500/15 text-purple-300 border-purple-500/20">G99 Required</Badge>
              ) : (
                <Badge className="bg-green-500/15 text-green-300 border-green-500/20">G98</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Warnings */}
        {systemDesign.compatibility_warnings.length > 0 && (
          <div className="mt-4 pt-4 border-t border-teal-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-teal-200">
                {systemDesign.compatibility_warnings.map((w, i) => (
                  <p key={i}>{w}</p>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function JobEquipmentSection({
  jobId,
  isEditable = true,
  className,
}: JobEquipmentSectionProps) {
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)
  const [itemToDelete, setItemToDelete] = React.useState<JobEquipmentAssignment | null>(null)

  const { data: equipment, isLoading } = useJobEquipment(jobId)
  const addEquipment = useAddJobEquipment()
  const removeEquipment = useRemoveJobEquipment()

  const handleAddEquipment = async (eq: EquipmentWithSpecs, quantity: number) => {
    try {
      await addEquipment.mutateAsync({
        jobId,
        equipment_catalogue_id: eq.id,
        quantity,
      })
      toast.success(`Added ${eq.model} to job`)
      setPickerOpen(false)
    } catch (_error) {
      toast.error('Failed to add equipment')
    }
  }

  const handleRemoveEquipment = async () => {
    if (!itemToDelete) return

    try {
      await removeEquipment.mutateAsync({
        jobId,
        assignmentId: itemToDelete.id,
      })
      toast.success('Equipment removed')
      setDeleteConfirmOpen(false)
      setItemToDelete(null)
    } catch (_error) {
      toast.error('Failed to remove equipment')
    }
  }

  const confirmDelete = (assignment: JobEquipmentAssignment) => {
    setItemToDelete(assignment)
    setDeleteConfirmOpen(true)
  }

  // Group equipment by category
  const groupedEquipment = React.useMemo(() => {
    if (!equipment) return {}
    return equipment.reduce((acc, item) => {
      const category = item.category
      if (!acc[category]) acc[category] = []
      acc[category].push(item)
      return acc
    }, {} as Record<EquipmentCategory, JobEquipmentAssignment[]>)
  }, [equipment])

  const totalValue = equipment?.reduce((sum, e) => sum + (e.total_price_pence || 0), 0) || 0
  const selectedIds = equipment?.map(e => e.equipment_catalogue_id).filter(Boolean) as string[] || []

  return (
    <div className={cn("space-y-4", className)}>
      {/* System Summary */}
      <SystemSummaryCard jobId={jobId} />

      {/* Equipment List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg font-semibold">Equipment</CardTitle>
            {equipment && equipment.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {equipment.length} item{equipment.length !== 1 ? 's' : ''} • {formatPrice(totalValue)} total
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {equipment && equipment.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => window.open(`/api/jobs/${jobId}/spec-sheet`, '_blank')}
              >
                <FileText className="h-4 w-4" />
                Spec Sheet
              </Button>
            )}
            {isEditable && (
              <Button onClick={() => setPickerOpen(true)} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Equipment
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : !equipment || equipment.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold text-lg">No equipment added</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-sm">
                Add panels, inverters, batteries and other equipment to this job
              </p>
              {isEditable && (
                <Button onClick={() => setPickerOpen(true)} className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  Add Equipment
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {(Object.entries(groupedEquipment) as [string, JobEquipmentAssignment[]][]).map(([category, items]) => (
                <div key={category}>
                  {Object.keys(groupedEquipment).length > 1 && (
                    <div className="px-4 py-2 bg-muted/30">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {category.replace('_', ' ')}s
                      </p>
                    </div>
                  )}
                  {items.map((assignment) => (
                    <EquipmentRow
                      key={assignment.id}
                      assignment={assignment}
                      isEditable={isEditable}
                      onEdit={() => {
                        // TODO: Open edit modal
                        toast.info('Edit coming soon')
                      }}
                      onDelete={() => confirmDelete(assignment)}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Equipment Picker */}
      <EquipmentPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handleAddEquipment}
        selectedIds={selectedIds}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Equipment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {itemToDelete?.model_name} from this job?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveEquipment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
