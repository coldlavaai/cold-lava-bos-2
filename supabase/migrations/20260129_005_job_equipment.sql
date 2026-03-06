-- ============================================
-- EQUIPMENT SYSTEM - MIGRATION 5: JOB EQUIPMENT
-- Solar BOS - Enterprise Edition
-- Date: 2026-01-29
-- ============================================

-- Equipment assignment status
CREATE TYPE equipment_assignment_status AS ENUM (
  'planned',           -- Added to job, not yet quoted
  'quoted',            -- Included in customer quote
  'ordered',           -- PO sent to supplier
  'shipped',           -- In transit from supplier
  'delivered',         -- On site
  'installed',         -- Physically installed
  'commissioned',      -- Tested and working
  'warranty_registered' -- Registered with manufacturer
);

-- ============================================
-- JOB EQUIPMENT ASSIGNMENTS
-- ============================================
CREATE TABLE job_equipment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  
  -- Equipment reference (can be from catalogue or custom)
  equipment_catalogue_id UUID REFERENCES equipment_catalogue(id),
  
  -- Custom equipment (when not in catalogue)
  custom_manufacturer VARCHAR(100),
  custom_model VARCHAR(200),
  custom_category equipment_category,
  custom_specifications JSONB,
  
  -- Denormalized (for performance/display)
  manufacturer_name VARCHAR(100) NOT NULL,
  model_name VARCHAR(200) NOT NULL,
  category equipment_category NOT NULL,
  
  -- Quantity & placement
  quantity INTEGER NOT NULL DEFAULT 1,
  location VARCHAR(100), -- roof_south, roof_east, garage, etc.
  orientation VARCHAR(20), -- portrait, landscape
  tilt_degrees INTEGER,
  azimuth_degrees INTEGER,
  
  -- Pricing (in pence, locked at quote time)
  unit_cost_pence INTEGER,
  unit_price_pence INTEGER,
  total_cost_pence INTEGER GENERATED ALWAYS AS (unit_cost_pence * quantity) STORED,
  total_price_pence INTEGER GENERATED ALWAYS AS (unit_price_pence * quantity) STORED,
  margin_percent DECIMAL(5,2),
  
  -- String configuration (for panels)
  string_number INTEGER,
  mppt_input INTEGER,
  panels_in_string INTEGER,
  string_voc_v DECIMAL(6,2),
  string_vmp_v DECIMAL(6,2),
  
  -- Serial numbers (array for multiple items)
  serial_numbers TEXT[] DEFAULT '{}',
  
  -- Status tracking
  status equipment_assignment_status DEFAULT 'planned',
  
  -- Ordering
  supplier_code supplier_code,
  supplier_order_reference VARCHAR(100),
  ordered_at TIMESTAMPTZ,
  expected_delivery_date DATE,
  delivered_at TIMESTAMPTZ,
  
  -- Installation
  installed_at TIMESTAMPTZ,
  installed_by_user_id UUID REFERENCES users(id),
  installation_notes TEXT,
  
  -- Warranty
  warranty_registered BOOLEAN DEFAULT false,
  warranty_registration_date DATE,
  warranty_registration_reference VARCHAR(100),
  warranty_expiry_date DATE,
  
  -- Notes
  internal_notes TEXT,
  customer_facing_notes TEXT,
  
  -- Versioning
  version INTEGER DEFAULT 1,
  deleted_at TIMESTAMPTZ,
  
  -- Audit
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_job_equipment_tenant ON job_equipment_assignments(tenant_id);
CREATE INDEX idx_job_equipment_job ON job_equipment_assignments(job_id);
CREATE INDEX idx_job_equipment_tenant_job ON job_equipment_assignments(tenant_id, job_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_job_equipment_catalogue ON job_equipment_assignments(equipment_catalogue_id) WHERE equipment_catalogue_id IS NOT NULL;
CREATE INDEX idx_job_equipment_status ON job_equipment_assignments(tenant_id, status);
CREATE INDEX idx_job_equipment_category ON job_equipment_assignments(tenant_id, category);

-- Trigger
CREATE TRIGGER trigger_job_equipment_updated_at
  BEFORE UPDATE ON job_equipment_assignments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

-- RLS
ALTER TABLE job_equipment_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY job_equipment_tenant_isolation ON job_equipment_assignments
  FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ============================================
-- EQUIPMENT AUDIT LOG
-- ============================================
CREATE TABLE equipment_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What changed
  table_name VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  
  -- Action
  action VARCHAR(20) NOT NULL, -- insert, update, delete
  
  -- Changes
  changed_fields TEXT[],
  old_values JSONB,
  new_values JSONB,
  
  -- Who/when
  changed_by UUID,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Context
  change_source VARCHAR(50), -- ui, api, sync, migration
  sync_batch_id UUID,
  notes TEXT
);

CREATE INDEX idx_equipment_audit_record ON equipment_audit_log(table_name, record_id);
CREATE INDEX idx_equipment_audit_time ON equipment_audit_log(changed_at DESC);

-- No RLS on audit log - access controlled at API level

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Calculate total system size from job equipment
CREATE OR REPLACE FUNCTION calculate_job_system_size_kwp(p_job_id UUID)
RETURNS DECIMAL AS $$
  SELECT COALESCE(
    SUM(
      CASE 
        WHEN jea.category = 'panel' THEN 
          jea.quantity * COALESCE(
            (SELECT ps.power_rating_wp FROM panel_specs ps 
             JOIN equipment_catalogue ec ON ec.id = ps.equipment_id 
             WHERE ec.id = jea.equipment_catalogue_id),
            0
          ) / 1000.0
        ELSE 0
      END
    ),
    0
  )
  FROM job_equipment_assignments jea
  WHERE jea.job_id = p_job_id
    AND jea.deleted_at IS NULL
$$ LANGUAGE SQL STABLE;

-- Check G98/G99 compliance based on inverter
CREATE OR REPLACE FUNCTION check_job_g98_g99_compliance(p_job_id UUID)
RETURNS TABLE(
  requires_g99 BOOLEAN,
  total_inverter_power_w INTEGER,
  recommendation TEXT
) AS $$
DECLARE
  v_total_power INTEGER;
BEGIN
  -- Sum all inverter rated power
  SELECT COALESCE(SUM(
    jea.quantity * COALESCE(
      (SELECT inv.rated_ac_power_w FROM inverter_specs inv
       JOIN equipment_catalogue ec ON ec.id = inv.equipment_id
       WHERE ec.id = jea.equipment_catalogue_id),
      0
    )
  ), 0)
  INTO v_total_power
  FROM job_equipment_assignments jea
  WHERE jea.job_id = p_job_id
    AND jea.category IN ('inverter', 'microinverter')
    AND jea.deleted_at IS NULL;
  
  -- G98 limit is 16A per phase = 3.68kW single phase
  -- G99 required above this
  RETURN QUERY SELECT
    v_total_power > 3680 AS requires_g99,
    v_total_power AS total_inverter_power_w,
    CASE
      WHEN v_total_power <= 3680 THEN 'G98: Notify DNO within 28 days of commissioning'
      WHEN v_total_power <= 50000 THEN 'G99: Apply to DNO BEFORE installation'
      ELSE 'G99 (Large): Detailed application required, contact DNO'
    END AS recommendation;
END;
$$ LANGUAGE plpgsql STABLE;

-- Calculate estimated annual generation
CREATE OR REPLACE FUNCTION calculate_job_annual_generation_kwh(
  p_job_id UUID,
  p_region VARCHAR DEFAULT 'south_england',
  p_shading_factor DECIMAL DEFAULT 1.0
)
RETURNS DECIMAL AS $$
DECLARE
  v_system_kwp DECIMAL;
  v_specific_yield INTEGER;
  v_system_losses DECIMAL := 0.14; -- 14% typical losses
BEGIN
  v_system_kwp := calculate_job_system_size_kwp(p_job_id);
  
  -- UK specific yields by region
  v_specific_yield := CASE p_region
    WHEN 'south_england' THEN 975
    WHEN 'midlands' THEN 925
    WHEN 'north_england' THEN 875
    WHEN 'scotland' THEN 825
    WHEN 'wales' THEN 900
    WHEN 'northern_ireland' THEN 850
    ELSE 900 -- Default
  END;
  
  RETURN ROUND(
    v_system_kwp * v_specific_yield * p_shading_factor * (1 - v_system_losses),
    0
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON TABLE job_equipment_assignments IS 'Equipment assigned to specific installation jobs';
COMMENT ON TABLE equipment_audit_log IS 'Audit trail for equipment catalogue changes';
COMMENT ON FUNCTION calculate_job_system_size_kwp IS 'Calculate total kWp for a job from panel equipment';
COMMENT ON FUNCTION check_job_g98_g99_compliance IS 'Check if job requires G98 or G99 DNO application';
COMMENT ON FUNCTION calculate_job_annual_generation_kwh IS 'Estimate annual generation based on system size and region';
