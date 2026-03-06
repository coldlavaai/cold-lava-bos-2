-- ============================================
-- EQUIPMENT SYSTEM - MIGRATION 2: CATALOGUE
-- Solar BOS - Enterprise Edition
-- Date: 2026-01-29
-- ============================================

-- Equipment category enum
CREATE TYPE equipment_category AS ENUM (
  'panel',
  'inverter',
  'battery',
  'mounting',
  'ev_charger',
  'heat_pump',
  'accessory',
  'cable',
  'connector',
  'isolator',
  'optimiser',
  'microinverter',
  'consumer_unit',
  'meter',
  'ct_clamp',
  'surge_protector',
  'pigeon_mesh',
  'immersion_diverter',
  'other'
);

-- Data source enum
CREATE TYPE equipment_data_source AS ENUM (
  'manual',
  'segen_api',
  'midsummer_api',
  'enf_solar',
  'ena_connect',
  'manufacturer_api',
  'import'
);

-- ============================================
-- EQUIPMENT CATALOGUE (Platform Level)
-- ============================================
CREATE TABLE equipment_catalogue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  sku VARCHAR(100) NOT NULL UNIQUE,
  manufacturer_id UUID NOT NULL REFERENCES manufacturers(id),
  manufacturer_name VARCHAR(100) NOT NULL, -- Denormalized for performance
  model VARCHAR(200) NOT NULL,
  model_variant VARCHAR(100),
  full_model_name VARCHAR(300) GENERATED ALWAYS AS (
    CASE 
      WHEN model_variant IS NOT NULL THEN model || ' ' || model_variant
      ELSE model
    END
  ) STORED,
  
  -- Category
  category equipment_category NOT NULL,
  subcategory VARCHAR(50),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_discontinued BOOLEAN DEFAULT false,
  discontinued_at TIMESTAMPTZ,
  successor_product_id UUID REFERENCES equipment_catalogue(id),
  
  -- UK Market
  available_in_uk BOOLEAN DEFAULT true,
  uk_launch_date DATE,
  primary_uk_distributor VARCHAR(50),
  
  -- Certifications
  mcs_certified BOOLEAN DEFAULT false,
  mcs_certificate_number VARCHAR(50),
  mcs_expiry_date DATE,
  ena_type_test_id VARCHAR(50),
  ce_marked BOOLEAN DEFAULT true,
  ukca_marked BOOLEAN DEFAULT true,
  
  -- Pricing (indicative, in pence)
  rrp_pence INTEGER,
  typical_trade_price_pence INTEGER,
  price_updated_at TIMESTAMPTZ,
  
  -- Media
  image_url VARCHAR(500),
  thumbnail_url VARCHAR(500),
  datasheet_url VARCHAR(500),
  installation_manual_url VARCHAR(500),
  warranty_document_url VARCHAR(500),
  
  -- External IDs (for API integrations)
  segen_product_code VARCHAR(50),
  midsummer_product_code VARCHAR(50),
  alternergy_product_code VARCHAR(50),
  enf_product_id VARCHAR(50),
  manufacturer_part_number VARCHAR(100),
  ean_barcode VARCHAR(20),
  
  -- Search
  search_keywords TEXT[] DEFAULT '{}',
  search_vector TSVECTOR,
  
  -- Sync metadata
  data_source equipment_data_source DEFAULT 'manual',
  last_synced_at TIMESTAMPTZ,
  sync_hash VARCHAR(64),
  
  -- Audit
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_manufacturer_model UNIQUE (manufacturer_id, model, model_variant)
);

-- Indexes
CREATE INDEX idx_equipment_catalogue_manufacturer ON equipment_catalogue(manufacturer_id);
CREATE INDEX idx_equipment_catalogue_category ON equipment_catalogue(category);
CREATE INDEX idx_equipment_catalogue_category_active ON equipment_catalogue(category, is_active) WHERE is_active = true;
CREATE INDEX idx_equipment_catalogue_sku ON equipment_catalogue(sku);
CREATE INDEX idx_equipment_catalogue_segen ON equipment_catalogue(segen_product_code) WHERE segen_product_code IS NOT NULL;
CREATE INDEX idx_equipment_catalogue_search ON equipment_catalogue USING GIN(search_vector);
CREATE INDEX idx_equipment_catalogue_mcs ON equipment_catalogue(mcs_certified) WHERE mcs_certified = true;

-- Updated at trigger
CREATE TRIGGER trigger_equipment_catalogue_updated_at
  BEFORE UPDATE ON equipment_catalogue
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

-- Search vector update function
CREATE OR REPLACE FUNCTION update_equipment_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.manufacturer_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.model, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.model_variant, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.subcategory, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.search_keywords, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_equipment_catalogue_search_vector
  BEFORE INSERT OR UPDATE ON equipment_catalogue
  FOR EACH ROW
  EXECUTE FUNCTION update_equipment_search_vector();

-- RLS
ALTER TABLE equipment_catalogue ENABLE ROW LEVEL SECURITY;

CREATE POLICY equipment_catalogue_read_all ON equipment_catalogue
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY equipment_catalogue_admin_all ON equipment_catalogue
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

COMMENT ON TABLE equipment_catalogue IS 'Platform-level equipment catalogue shared across all tenants';

-- ============================================
-- PANEL SPECIFICATIONS
-- ============================================
CREATE TABLE panel_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL UNIQUE REFERENCES equipment_catalogue(id) ON DELETE CASCADE,
  
  -- Power ratings (STC)
  power_rating_wp INTEGER NOT NULL,
  power_tolerance_plus_percent DECIMAL(4,2) DEFAULT 3.0,
  power_tolerance_minus_percent DECIMAL(4,2) DEFAULT 0.0,
  efficiency_percent DECIMAL(4,2),
  
  -- Electrical (STC)
  voc_v DECIMAL(6,2) NOT NULL,
  isc_a DECIMAL(5,2) NOT NULL,
  vmp_v DECIMAL(6,2) NOT NULL,
  imp_a DECIMAL(5,2) NOT NULL,
  
  -- NOCT ratings
  noct_power_wp INTEGER,
  noct_voc_v DECIMAL(6,2),
  noct_vmp_v DECIMAL(6,2),
  
  -- Temperature coefficients
  temp_coeff_pmax_percent_per_c DECIMAL(5,3) DEFAULT -0.35,
  temp_coeff_voc_percent_per_c DECIMAL(5,3) DEFAULT -0.28,
  temp_coeff_isc_percent_per_c DECIMAL(5,3) DEFAULT 0.05,
  noct_c INTEGER DEFAULT 45,
  
  -- Physical
  length_mm INTEGER NOT NULL,
  width_mm INTEGER NOT NULL,
  depth_mm INTEGER DEFAULT 35,
  weight_kg DECIMAL(5,2),
  
  -- Cell technology
  cell_type VARCHAR(50), -- mono, poly, n-type, HJT, TOPCon, IBC
  cell_count INTEGER,
  cell_size_mm INTEGER, -- 166, 182, 210
  half_cut BOOLEAN DEFAULT true,
  bifacial BOOLEAN DEFAULT false,
  bifaciality_factor_percent DECIMAL(4,1),
  
  -- Appearance
  frame_colour VARCHAR(20) DEFAULT 'black', -- black, silver, none
  backsheet_colour VARCHAR(20) DEFAULT 'white', -- white, black, transparent
  
  -- Connectors & cables
  connector_type VARCHAR(20) DEFAULT 'MC4',
  cable_length_mm INTEGER DEFAULT 1200,
  
  -- Warranty
  product_warranty_years INTEGER DEFAULT 12,
  performance_warranty_years INTEGER DEFAULT 25,
  performance_warranty_year1_percent DECIMAL(4,1) DEFAULT 98.0,
  performance_warranty_final_percent DECIMAL(4,1) DEFAULT 84.8,
  annual_degradation_percent DECIMAL(4,2) DEFAULT 0.5,
  
  -- Limits
  max_system_voltage_v INTEGER DEFAULT 1500,
  max_series_fuse_a INTEGER DEFAULT 25,
  operating_temp_min_c INTEGER DEFAULT -40,
  operating_temp_max_c INTEGER DEFAULT 85,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trigger_panel_specs_updated_at
  BEFORE UPDATE ON panel_specs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE panel_specs ENABLE ROW LEVEL SECURITY;

CREATE POLICY panel_specs_read_all ON panel_specs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY panel_specs_admin_all ON panel_specs
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ============================================
-- INVERTER SPECIFICATIONS
-- ============================================
CREATE TYPE inverter_type AS ENUM (
  'string',
  'hybrid',
  'microinverter',
  'ac_coupled',
  'off_grid',
  'central'
);

CREATE TYPE phase_type AS ENUM (
  'single',
  'three'
);

CREATE TABLE inverter_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL UNIQUE REFERENCES equipment_catalogue(id) ON DELETE CASCADE,
  
  -- Type
  inverter_type inverter_type NOT NULL,
  phase_type phase_type NOT NULL DEFAULT 'single',
  
  -- AC output
  rated_ac_power_w INTEGER NOT NULL,
  max_ac_power_w INTEGER,
  max_apparent_power_va INTEGER,
  ac_voltage_nominal_v INTEGER DEFAULT 230,
  ac_voltage_range_min_v INTEGER DEFAULT 184,
  ac_voltage_range_max_v INTEGER DEFAULT 276,
  
  -- DC input
  max_dc_power_w INTEGER,
  max_dc_voltage_v INTEGER NOT NULL,
  start_voltage_v INTEGER,
  
  -- MPPT
  mppt_voltage_range_min_v INTEGER NOT NULL,
  mppt_voltage_range_max_v INTEGER NOT NULL,
  mppt_count INTEGER DEFAULT 1,
  strings_per_mppt INTEGER DEFAULT 1,
  max_input_current_per_mppt_a DECIMAL(5,1),
  
  -- Efficiency
  max_efficiency_percent DECIMAL(4,1),
  euro_efficiency_percent DECIMAL(4,1),
  
  -- Battery (for hybrids)
  battery_compatible BOOLEAN DEFAULT false,
  battery_voltage_range_min_v INTEGER,
  battery_voltage_range_max_v INTEGER,
  max_charge_current_a INTEGER,
  max_discharge_current_a INTEGER,
  max_charge_power_w INTEGER,
  max_discharge_power_w INTEGER,
  
  -- EPS/Backup
  eps_capable BOOLEAN DEFAULT false,
  eps_rated_power_w INTEGER,
  eps_switchover_time_ms INTEGER,
  
  -- Physical
  width_mm INTEGER,
  height_mm INTEGER,
  depth_mm INTEGER,
  weight_kg DECIMAL(5,1),
  ip_rating VARCHAR(10) DEFAULT 'IP65',
  noise_level_db INTEGER,
  indoor_outdoor VARCHAR(10) DEFAULT 'both',
  
  -- Grid compliance (UK)
  g98_compliant BOOLEAN DEFAULT true,
  g99_compliant BOOLEAN DEFAULT false,
  g100_compliant BOOLEAN DEFAULT false,
  ena_type_test_number VARCHAR(50),
  
  -- Connectivity
  wifi_built_in BOOLEAN DEFAULT true,
  ethernet_port BOOLEAN DEFAULT false,
  ct_clamp_included BOOLEAN DEFAULT false,
  monitoring_platform VARCHAR(100),
  app_name VARCHAR(100),
  
  -- Warranty
  warranty_years INTEGER DEFAULT 10,
  extended_warranty_available BOOLEAN DEFAULT true,
  max_warranty_years INTEGER DEFAULT 15,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trigger_inverter_specs_updated_at
  BEFORE UPDATE ON inverter_specs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE inverter_specs ENABLE ROW LEVEL SECURITY;

CREATE POLICY inverter_specs_read_all ON inverter_specs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY inverter_specs_admin_all ON inverter_specs
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ============================================
-- BATTERY SPECIFICATIONS
-- ============================================
CREATE TYPE battery_chemistry AS ENUM (
  'LFP',
  'NMC',
  'LTO',
  'Sodium-Ion',
  'Lead-Acid'
);

CREATE TYPE voltage_type AS ENUM (
  'low_voltage',
  'high_voltage'
);

CREATE TABLE battery_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL UNIQUE REFERENCES equipment_catalogue(id) ON DELETE CASCADE,
  
  -- Capacity
  total_capacity_kwh DECIMAL(5,2) NOT NULL,
  usable_capacity_kwh DECIMAL(5,2) NOT NULL,
  depth_of_discharge_percent DECIMAL(4,1) DEFAULT 100.0,
  
  -- Power
  nominal_power_kw DECIMAL(5,2),
  max_charge_power_kw DECIMAL(5,2),
  max_discharge_power_kw DECIMAL(5,2),
  continuous_power_kw DECIMAL(5,2),
  peak_power_kw DECIMAL(5,2),
  
  -- Voltage
  nominal_voltage_v DECIMAL(6,1),
  voltage_range_min_v DECIMAL(6,1),
  voltage_range_max_v DECIMAL(6,1),
  voltage_type voltage_type DEFAULT 'low_voltage',
  
  -- Chemistry
  chemistry battery_chemistry DEFAULT 'LFP',
  round_trip_efficiency_percent DECIMAL(4,1) DEFAULT 95.0,
  
  -- Lifespan
  cycle_life_cycles INTEGER DEFAULT 6000,
  cycle_life_dod_percent INTEGER DEFAULT 100,
  calendar_life_years INTEGER DEFAULT 15,
  
  -- Physical
  width_mm INTEGER,
  height_mm INTEGER,
  depth_mm INTEGER,
  weight_kg DECIMAL(5,1),
  ip_rating VARCHAR(10) DEFAULT 'IP65',
  indoor_outdoor VARCHAR(10) DEFAULT 'indoor',
  
  -- Modularity
  is_modular BOOLEAN DEFAULT false,
  module_capacity_kwh DECIMAL(4,2),
  min_modules INTEGER DEFAULT 1,
  max_modules INTEGER DEFAULT 1,
  
  -- Compatibility
  requires_specific_inverter BOOLEAN DEFAULT false,
  compatible_inverter_brands TEXT[] DEFAULT '{}',
  
  -- Warranty
  warranty_years INTEGER DEFAULT 10,
  warranty_cycles INTEGER,
  warranty_throughput_mwh DECIMAL(6,1),
  warranted_capacity_eol_percent DECIMAL(4,1) DEFAULT 70.0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trigger_battery_specs_updated_at
  BEFORE UPDATE ON battery_specs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE battery_specs ENABLE ROW LEVEL SECURITY;

CREATE POLICY battery_specs_read_all ON battery_specs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY battery_specs_admin_all ON battery_specs
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ============================================
-- MOUNTING SYSTEM SPECIFICATIONS
-- ============================================
CREATE TYPE mounting_type AS ENUM (
  'on_roof',
  'in_roof',
  'flat_roof',
  'ground_mount',
  'carport',
  'facade'
);

CREATE TABLE mounting_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL UNIQUE REFERENCES equipment_catalogue(id) ON DELETE CASCADE,
  
  -- Type
  mounting_type mounting_type NOT NULL,
  roof_type_compatible TEXT[] DEFAULT '{}', -- tile, slate, metal, flat, trapezoidal
  component_type VARCHAR(50), -- rail, clamp, hook, ballast, anchor
  tile_type VARCHAR(50), -- plain, interlocking, slate, pantile
  
  -- Adjustability
  adjustable_height BOOLEAN DEFAULT false,
  height_adjustment_range_mm VARCHAR(20),
  
  -- Sizing
  rail_length_mm INTEGER,
  max_span_mm INTEGER,
  
  -- Clamp specs
  clamp_type VARCHAR(50), -- end, mid, universal
  panel_thickness_range_mm VARCHAR(20),
  
  -- Load ratings
  max_wind_load_pa INTEGER,
  max_snow_load_pa INTEGER,
  max_panel_weight_kg INTEGER,
  
  -- Materials
  material VARCHAR(50) DEFAULT 'aluminium',
  colour VARCHAR(20) DEFAULT 'silver',
  
  -- Physical
  length_mm INTEGER,
  width_mm INTEGER,
  height_mm INTEGER,
  weight_kg DECIMAL(5,2),
  
  -- Warranty
  warranty_years INTEGER DEFAULT 10,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trigger_mounting_specs_updated_at
  BEFORE UPDATE ON mounting_specs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE mounting_specs ENABLE ROW LEVEL SECURITY;

CREATE POLICY mounting_specs_read_all ON mounting_specs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY mounting_specs_admin_all ON mounting_specs
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ============================================
-- EV CHARGER SPECIFICATIONS
-- ============================================
CREATE TABLE ev_charger_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL UNIQUE REFERENCES equipment_catalogue(id) ON DELETE CASCADE,
  
  -- Power
  rated_power_kw DECIMAL(4,1) NOT NULL,
  max_power_kw DECIMAL(4,1),
  current_rating_a INTEGER NOT NULL,
  voltage_v INTEGER DEFAULT 230,
  phase_type phase_type DEFAULT 'single',
  
  -- Connector
  connector_type VARCHAR(30) DEFAULT 'Type 2', -- Type 1, Type 2, Tethered
  cable_length_m DECIMAL(3,1),
  
  -- Solar integration
  solar_compatible BOOLEAN DEFAULT false,
  solar_divert_modes TEXT[] DEFAULT '{}', -- eco, eco+, fast
  ct_clamp_required BOOLEAN DEFAULT false,
  ct_clamp_included BOOLEAN DEFAULT false,
  
  -- Smart features
  wifi_enabled BOOLEAN DEFAULT true,
  app_name VARCHAR(100),
  ocpp_compliant BOOLEAN DEFAULT false,
  load_balancing BOOLEAN DEFAULT false,
  scheduled_charging BOOLEAN DEFAULT true,
  tariff_integration BOOLEAN DEFAULT false,
  v2g_capable BOOLEAN DEFAULT false,
  
  -- Physical
  width_mm INTEGER,
  height_mm INTEGER,
  depth_mm INTEGER,
  weight_kg DECIMAL(4,1),
  ip_rating VARCHAR(10) DEFAULT 'IP65',
  indoor_outdoor VARCHAR(10) DEFAULT 'outdoor',
  
  -- Customisation
  customisable_front BOOLEAN DEFAULT false,
  colour_options TEXT[] DEFAULT '{}',
  
  -- Warranty
  warranty_years INTEGER DEFAULT 3,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trigger_ev_charger_specs_updated_at
  BEFORE UPDATE ON ev_charger_specs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE ev_charger_specs ENABLE ROW LEVEL SECURITY;

CREATE POLICY ev_charger_specs_read_all ON ev_charger_specs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY ev_charger_specs_admin_all ON ev_charger_specs
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

COMMENT ON TABLE panel_specs IS 'Technical specifications for solar panels';
COMMENT ON TABLE inverter_specs IS 'Technical specifications for inverters (string, hybrid, micro)';
COMMENT ON TABLE battery_specs IS 'Technical specifications for battery storage systems';
COMMENT ON TABLE mounting_specs IS 'Technical specifications for mounting systems';
COMMENT ON TABLE ev_charger_specs IS 'Technical specifications for EV chargers';
