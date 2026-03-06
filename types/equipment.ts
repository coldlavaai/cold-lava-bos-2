// Equipment System Types
// Cold Lava BOS - Enterprise Edition

export type EquipmentCategory =
  | 'panel'
  | 'inverter'
  | 'battery'
  | 'mounting'
  | 'ev_charger'
  | 'heat_pump'
  | 'accessory'
  | 'cable'
  | 'connector'
  | 'isolator'
  | 'optimiser'
  | 'microinverter'
  | 'consumer_unit'
  | 'meter'
  | 'ct_clamp'
  | 'surge_protector'
  | 'pigeon_mesh'
  | 'immersion_diverter'
  | 'other'

export type InverterType = 'string' | 'hybrid' | 'microinverter' | 'ac_coupled' | 'off_grid' | 'central'
export type PhaseType = 'single' | 'three'
export type BatteryChemistry = 'LFP' | 'NMC' | 'LTO' | 'Sodium-Ion' | 'Lead-Acid'
export type VoltageType = 'low_voltage' | 'high_voltage'
export type MountingType = 'on_roof' | 'in_roof' | 'flat_roof' | 'ground_mount' | 'carport' | 'facade'
export type EquipmentAssignmentStatus = 
  | 'planned'
  | 'quoted'
  | 'ordered'
  | 'shipped'
  | 'delivered'
  | 'installed'
  | 'commissioned'
  | 'warranty_registered'

export interface Manufacturer {
  id: string
  name: string
  display_name: string
  slug: string
  website_url?: string
  logo_url?: string
  categories: EquipmentCategory[]
  is_featured: boolean
  is_active: boolean
}

export interface EquipmentCatalogue {
  id: string
  sku: string
  manufacturer_id: string
  manufacturer_name: string
  model: string
  model_variant?: string
  full_model_name: string
  category: EquipmentCategory
  subcategory?: string
  is_active: boolean
  is_discontinued: boolean
  available_in_uk: boolean
  mcs_certified: boolean
  mcs_certificate_number?: string
  ena_type_test_id?: string
  rrp_pence?: number
  typical_trade_price_pence?: number
  primary_uk_distributor?: string
  image_url?: string
  thumbnail_url?: string
  datasheet_url?: string
  created_at: string
  updated_at: string
}

export interface PanelSpecs {
  id: string
  equipment_id: string
  power_rating_wp: number
  efficiency_percent?: number
  voc_v: number
  isc_a: number
  vmp_v: number
  imp_a: number
  length_mm: number
  width_mm: number
  depth_mm?: number
  weight_kg?: number
  cell_type?: string
  cell_count?: number
  half_cut: boolean
  bifacial: boolean
  frame_colour?: string
  backsheet_colour?: string
  product_warranty_years?: number
  performance_warranty_years?: number
  performance_warranty_year1_percent?: number
  performance_warranty_final_percent?: number
  annual_degradation_percent?: number
  temp_coeff_pmax_percent_per_c?: number
  temp_coeff_voc_percent_per_c?: number
}

export interface InverterSpecs {
  id: string
  equipment_id: string
  inverter_type: InverterType
  phase_type: PhaseType
  rated_ac_power_w: number
  max_ac_power_w?: number
  max_dc_power_w?: number
  max_dc_voltage_v: number
  mppt_voltage_range_min_v: number
  mppt_voltage_range_max_v: number
  mppt_count?: number
  max_efficiency_percent?: number
  battery_compatible: boolean
  max_charge_power_w?: number
  max_discharge_power_w?: number
  eps_capable: boolean
  eps_rated_power_w?: number
  g98_compliant: boolean
  g99_compliant: boolean
  wifi_built_in: boolean
  warranty_years?: number
  monitoring_platform?: string
}

export interface BatterySpecs {
  id: string
  equipment_id: string
  total_capacity_kwh: number
  usable_capacity_kwh: number
  depth_of_discharge_percent?: number
  nominal_power_kw?: number
  max_charge_power_kw?: number
  max_discharge_power_kw?: number
  nominal_voltage_v?: number
  voltage_type?: VoltageType
  chemistry: BatteryChemistry
  round_trip_efficiency_percent?: number
  cycle_life_cycles?: number
  weight_kg?: number
  warranty_years?: number
  is_modular: boolean
  compatible_inverter_brands?: string[]
}

export interface MountingSpecs {
  id: string
  equipment_id: string
  mounting_type: MountingType
  roof_type_compatible?: string[]
  component_type?: string
  material?: string
  colour?: string
  warranty_years?: number
}

export interface EVChargerSpecs {
  id: string
  equipment_id: string
  rated_power_kw: number
  max_power_kw?: number
  current_rating_a: number
  phase_type: PhaseType
  connector_type?: string
  cable_length_m?: number
  solar_compatible: boolean
  solar_divert_modes?: string[]
  wifi_enabled: boolean
  app_name?: string
  warranty_years?: number
}

// Combined equipment with specs
export interface EquipmentWithSpecs extends EquipmentCatalogue {
  panel_specs?: PanelSpecs
  inverter_specs?: InverterSpecs
  battery_specs?: BatterySpecs
  mounting_specs?: MountingSpecs
  ev_charger_specs?: EVChargerSpecs
}

// Tenant preferences
export interface TenantEquipmentPreference {
  id: string
  tenant_id: string
  equipment_id: string
  is_favourite: boolean
  is_hidden: boolean
  is_default_for_category: boolean
  cost_price_pence?: number
  sell_price_pence?: number
  quantity_in_stock?: number
}

// Job equipment assignment
export interface JobEquipmentAssignment {
  id: string
  tenant_id: string
  job_id: string
  equipment_catalogue_id?: string
  custom_manufacturer?: string
  custom_model?: string
  custom_category?: EquipmentCategory
  custom_specifications?: Record<string, unknown>
  manufacturer_name: string
  model_name: string
  category: EquipmentCategory
  quantity: number
  location?: string
  orientation?: string
  tilt_degrees?: number
  azimuth_degrees?: number
  unit_cost_pence?: number
  unit_price_pence?: number
  total_cost_pence?: number
  total_price_pence?: number
  margin_percent?: number
  string_number?: number
  mppt_input?: number
  panels_in_string?: number
  string_voc_v?: number
  string_vmp_v?: number
  serial_numbers?: string[]
  status: EquipmentAssignmentStatus
  supplier_code?: string
  supplier_order_reference?: string
  ordered_at?: string
  expected_delivery_date?: string
  delivered_at?: string
  installed_at?: string
  warranty_registered: boolean
  warranty_registration_date?: string
  warranty_expiry_date?: string
  internal_notes?: string
  customer_facing_notes?: string
  created_at: string
  updated_at: string
  
  // Joined data
  equipment?: EquipmentWithSpecs
}

// Equipment compatibility
export type CompatibilityRelationship = 
  | 'compatible'
  | 'incompatible'
  | 'requires'
  | 'recommended'
  | 'replaces'
  | 'alternative'

export interface EquipmentCompatibility {
  id: string
  equipment_a_id: string
  equipment_b_id: string
  relationship_type: CompatibilityRelationship
  compatibility_notes?: string
  requires_adapter: boolean
  confidence_level: 'confirmed' | 'likely' | 'unverified' | 'reported_issues'
}

// System calculations
export interface StringConfiguration {
  string_number: number
  mppt_input: number
  panels_in_string: number
  panel_id: string
  voc_at_min_temp: number
  vmp_at_max_temp: number
  is_valid: boolean
  warnings: string[]
}

export interface SystemDesign {
  total_kwp: number
  total_panels: number
  inverter_power_w: number
  battery_capacity_kwh?: number
  dc_ac_ratio: number
  estimated_annual_kwh: number
  requires_g99: boolean
  g98_g99_recommendation: string
  string_configurations: StringConfiguration[]
  compatibility_warnings: string[]
}

// Category display info
export const EQUIPMENT_CATEGORIES: Record<EquipmentCategory, { label: string; icon: string; colour: string }> = {
  panel: { label: 'Solar Panels', icon: 'Sun', colour: 'bg-amber-500' },
  inverter: { label: 'Inverters', icon: 'Zap', colour: 'bg-blue-500' },
  battery: { label: 'Batteries', icon: 'Battery', colour: 'bg-green-500' },
  mounting: { label: 'Mounting', icon: 'LayoutGrid', colour: 'bg-slate-500' },
  ev_charger: { label: 'EV Chargers', icon: 'Car', colour: 'bg-purple-500' },
  heat_pump: { label: 'Heat Pumps', icon: 'Flame', colour: 'bg-orange-500' },
  accessory: { label: 'Accessories', icon: 'Package', colour: 'bg-gray-500' },
  cable: { label: 'Cables', icon: 'Cable', colour: 'bg-gray-400' },
  connector: { label: 'Connectors', icon: 'Plug', colour: 'bg-gray-400' },
  isolator: { label: 'Isolators', icon: 'Power', colour: 'bg-red-500' },
  optimiser: { label: 'Optimisers', icon: 'Gauge', colour: 'bg-indigo-500' },
  microinverter: { label: 'Microinverters', icon: 'Cpu', colour: 'bg-cyan-500' },
  consumer_unit: { label: 'Consumer Units', icon: 'LayoutDashboard', colour: 'bg-gray-600' },
  meter: { label: 'Meters', icon: 'Activity', colour: 'bg-teal-500' },
  ct_clamp: { label: 'CT Clamps', icon: 'CircleDot', colour: 'bg-gray-400' },
  surge_protector: { label: 'Surge Protectors', icon: 'Shield', colour: 'bg-yellow-500' },
  pigeon_mesh: { label: 'Pigeon Mesh', icon: 'Grid3X3', colour: 'bg-gray-400' },
  immersion_diverter: { label: 'Immersion Diverters', icon: 'Droplets', colour: 'bg-blue-400' },
  other: { label: 'Other', icon: 'MoreHorizontal', colour: 'bg-gray-400' },
}

// Status display info
export const ASSIGNMENT_STATUSES: Record<EquipmentAssignmentStatus, { label: string; colour: string }> = {
  planned: { label: 'Planned', colour: 'bg-slate-100 text-slate-800' },
  quoted: { label: 'Quoted', colour: 'bg-blue-100 text-blue-800' },
  ordered: { label: 'Ordered', colour: 'bg-amber-100 text-amber-800' },
  shipped: { label: 'Shipped', colour: 'bg-purple-100 text-purple-800' },
  delivered: { label: 'Delivered', colour: 'bg-cyan-100 text-cyan-800' },
  installed: { label: 'Installed', colour: 'bg-green-100 text-green-800' },
  commissioned: { label: 'Commissioned', colour: 'bg-emerald-100 text-emerald-800' },
  warranty_registered: { label: 'Warranty Registered', colour: 'bg-teal-100 text-teal-800' },
}
