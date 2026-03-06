/**
 * Equipment System API Hooks
 * Cold Lava BOS - Enterprise Edition
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "./client"
import type {
  EquipmentWithSpecs,
  EquipmentCategory,
  Manufacturer,
  TenantEquipmentPreference,
  JobEquipmentAssignment,
  EquipmentCompatibility,
  SystemDesign,
} from "@/types/equipment"

// Query params
export interface EquipmentQueryParams {
  category?: EquipmentCategory
  manufacturer_id?: string
  search?: string
  mcs_certified?: boolean
  available_in_uk?: boolean
  is_active?: boolean
  favourites_only?: boolean
  limit?: number
  offset?: number
}

export interface JobEquipmentQueryParams {
  job_id: string
  category?: EquipmentCategory
  status?: string
}

// Helper to build query string
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildQueryString(params: any): string {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value))
    }
  })
  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ""
}

// ============================================
// MANUFACTURERS
// ============================================

export function useManufacturers(categories?: EquipmentCategory[]) {
  return useQuery({
    queryKey: ["manufacturers", categories],
    queryFn: async () => {
      const params = categories?.length ? `?categories=${categories.join(',')}` : ''
      const response = await api.get<Manufacturer[]>(`/equipment/manufacturers${params}`)
      return response.data
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - manufacturers rarely change
  })
}

// ============================================
// EQUIPMENT CATALOGUE
// ============================================

export function useEquipmentCatalogue(params: EquipmentQueryParams = {}) {
  return useQuery({
    queryKey: ["equipment", "catalogue", params],
    queryFn: async () => {
      const response = await api.get<EquipmentWithSpecs[]>(`/equipment/catalogue${buildQueryString(params)}`)
      return response
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  })
}

export function useEquipmentItem(id: string) {
  return useQuery({
    queryKey: ["equipment", "catalogue", id],
    queryFn: async () => {
      const response = await api.get<EquipmentWithSpecs>(`/equipment/catalogue/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

export function useEquipmentSearch(searchTerm: string, category?: EquipmentCategory) {
  return useQuery({
    queryKey: ["equipment", "search", searchTerm, category],
    queryFn: async () => {
      const params: EquipmentQueryParams = {
        search: searchTerm,
        category,
        is_active: true,
        available_in_uk: true,
        limit: 50,
      }
      const response = await api.get<EquipmentWithSpecs[]>(`/equipment/catalogue${buildQueryString(params)}`)
      return response.data
    },
    enabled: searchTerm.length >= 2,
    staleTime: 2 * 60 * 1000,
  })
}

// ============================================
// TENANT PREFERENCES
// ============================================

export function useTenantEquipmentPreferences() {
  return useQuery({
    queryKey: ["equipment", "preferences"],
    queryFn: async () => {
      const response = await api.get<TenantEquipmentPreference[]>(`/equipment/preferences`)
      return response.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useFavouriteEquipment(category?: EquipmentCategory) {
  return useQuery({
    queryKey: ["equipment", "favourites", category],
    queryFn: async () => {
      const params = category ? `?category=${category}` : ''
      const response = await api.get<EquipmentWithSpecs[]>(`/equipment/favourites${params}`)
      return response.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useToggleFavourite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ equipmentId, isFavourite }: { equipmentId: string; isFavourite: boolean }) => {
      const response = await api.post(`/equipment/preferences/${equipmentId}/favourite`, { is_favourite: isFavourite })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment", "favourites"] })
      queryClient.invalidateQueries({ queryKey: ["equipment", "preferences"] })
    },
  })
}

export function useUpdateEquipmentPreference() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      equipmentId, 
      ...updates 
    }: { 
      equipmentId: string
      cost_price_pence?: number
      sell_price_pence?: number
      internal_notes?: string
    }) => {
      const response = await api.patch(`/equipment/preferences/${equipmentId}`, updates)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment", "preferences"] })
    },
  })
}

// ============================================
// JOB EQUIPMENT ASSIGNMENTS
// ============================================

export function useJobEquipment(jobId: string) {
  return useQuery({
    queryKey: ["jobs", jobId, "equipment"],
    queryFn: async () => {
      const response = await api.get<JobEquipmentAssignment[]>(`/jobs/${jobId}/equipment`)
      return response.data
    },
    enabled: !!jobId,
  })
}

export function useAddJobEquipment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      jobId, 
      ...data 
    }: { 
      jobId: string
      equipment_catalogue_id?: string
      custom_manufacturer?: string
      custom_model?: string
      custom_category?: EquipmentCategory
      quantity: number
      location?: string
      unit_cost_pence?: number
      unit_price_pence?: number
      internal_notes?: string
    }) => {
      const response = await api.post<JobEquipmentAssignment>(`/jobs/${jobId}/equipment`, data)
      return response.data
    },
    onSuccess: (_, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "equipment"] })
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "system-design"] })
    },
  })
}

export function useUpdateJobEquipment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      jobId, 
      assignmentId,
      ...updates 
    }: { 
      jobId: string
      assignmentId: string
      quantity?: number
      location?: string
      orientation?: string
      tilt_degrees?: number
      azimuth_degrees?: number
      unit_cost_pence?: number
      unit_price_pence?: number
      string_number?: number
      mppt_input?: number
      panels_in_string?: number
      serial_numbers?: string[]
      status?: string
      internal_notes?: string
      customer_facing_notes?: string
    }) => {
      const response = await api.patch<JobEquipmentAssignment>(`/jobs/${jobId}/equipment/${assignmentId}`, updates)
      return response.data
    },
    onSuccess: (_, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "equipment"] })
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "system-design"] })
    },
  })
}

export function useRemoveJobEquipment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ jobId, assignmentId }: { jobId: string; assignmentId: string }) => {
      await api.delete(`/jobs/${jobId}/equipment/${assignmentId}`)
    },
    onSuccess: (_, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "equipment"] })
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "system-design"] })
    },
  })
}

// ============================================
// SYSTEM DESIGN & CALCULATIONS
// ============================================

export function useJobSystemDesign(jobId: string) {
  return useQuery({
    queryKey: ["jobs", jobId, "system-design"],
    queryFn: async () => {
      const response = await api.get<SystemDesign>(`/jobs/${jobId}/equipment/system-design`)
      return response.data
    },
    enabled: !!jobId,
  })
}

export function useValidateStringConfiguration() {
  return useMutation({
    mutationFn: async (data: {
      panel_id: string
      inverter_id: string
      panels_per_string: number
      min_temp_c?: number
      max_temp_c?: number
    }) => {
      const response = await api.post(`/equipment/validate-string`, data)
      return response.data
    },
  })
}

// ============================================
// COMPATIBILITY
// ============================================

export function useEquipmentCompatibility(equipmentAId: string, equipmentBId: string) {
  return useQuery({
    queryKey: ["equipment", "compatibility", equipmentAId, equipmentBId],
    queryFn: async () => {
      const response = await api.get<EquipmentCompatibility>(`/equipment/compatibility?a=${equipmentAId}&b=${equipmentBId}`)
      return response.data
    },
    enabled: !!equipmentAId && !!equipmentBId,
  })
}

export function useCompatibleEquipment(equipmentId: string, category?: EquipmentCategory) {
  return useQuery({
    queryKey: ["equipment", "compatible", equipmentId, category],
    queryFn: async () => {
      const params = category ? `&category=${category}` : ''
      const response = await api.get<EquipmentWithSpecs[]>(`/equipment/compatible?equipment_id=${equipmentId}${params}`)
      return response.data
    },
    enabled: !!equipmentId,
  })
}

// ============================================
// EQUIPMENT BY CATEGORY (Convenience hooks)
// ============================================

export function usePanels(params: Omit<EquipmentQueryParams, 'category'> = {}) {
  return useEquipmentCatalogue({ ...params, category: 'panel' })
}

export function useInverters(params: Omit<EquipmentQueryParams, 'category'> = {}) {
  return useEquipmentCatalogue({ ...params, category: 'inverter' })
}

export function useBatteries(params: Omit<EquipmentQueryParams, 'category'> = {}) {
  return useEquipmentCatalogue({ ...params, category: 'battery' })
}

export function useMountingSystems(params: Omit<EquipmentQueryParams, 'category'> = {}) {
  return useEquipmentCatalogue({ ...params, category: 'mounting' })
}

export function useEVChargers(params: Omit<EquipmentQueryParams, 'category'> = {}) {
  return useEquipmentCatalogue({ ...params, category: 'ev_charger' })
}
