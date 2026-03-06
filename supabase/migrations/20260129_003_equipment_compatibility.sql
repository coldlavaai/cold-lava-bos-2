-- ============================================
-- EQUIPMENT SYSTEM - MIGRATION 3: COMPATIBILITY
-- Solar BOS - Enterprise Edition
-- Date: 2026-01-29
-- ============================================

-- Compatibility relationship type
CREATE TYPE compatibility_relationship AS ENUM (
  'compatible',      -- Works together
  'incompatible',    -- Cannot be used together
  'requires',        -- A requires B
  'recommended',     -- A works best with B
  'replaces',        -- A is successor to B
  'alternative'      -- A and B are interchangeable
);

-- Confidence level
CREATE TYPE compatibility_confidence AS ENUM (
  'confirmed',       -- Tested/documented by manufacturer
  'likely',          -- Based on specs, not tested
  'unverified',      -- User-reported, not confirmed
  'reported_issues'  -- Known issues reported
);

-- ============================================
-- EQUIPMENT COMPATIBILITY RULES
-- ============================================
CREATE TABLE equipment_compatibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- The two equipment items
  equipment_a_id UUID NOT NULL REFERENCES equipment_catalogue(id) ON DELETE CASCADE,
  equipment_b_id UUID NOT NULL REFERENCES equipment_catalogue(id) ON DELETE CASCADE,
  
  -- Relationship
  relationship_type compatibility_relationship NOT NULL,
  compatibility_notes TEXT,
  configuration_notes TEXT,
  
  -- Adapter requirements
  requires_adapter BOOLEAN DEFAULT false,
  adapter_product_code VARCHAR(50),
  adapter_equipment_id UUID REFERENCES equipment_catalogue(id),
  
  -- Quantity constraints
  min_quantity_a INTEGER DEFAULT 1,
  max_quantity_a INTEGER,
  min_quantity_b INTEGER DEFAULT 1,
  max_quantity_b INTEGER,
  
  -- Firmware requirements
  min_firmware_a VARCHAR(20),
  min_firmware_b VARCHAR(20),
  
  -- Verification
  verified_by VARCHAR(100), -- manufacturer, installer, solar_bos
  verification_url VARCHAR(500),
  verification_date DATE,
  confidence_level compatibility_confidence DEFAULT 'likely',
  
  -- Audit
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate rules
  CONSTRAINT unique_compatibility_pair UNIQUE (equipment_a_id, equipment_b_id, relationship_type)
);

-- Indexes
CREATE INDEX idx_compatibility_equipment_a ON equipment_compatibility(equipment_a_id);
CREATE INDEX idx_compatibility_equipment_b ON equipment_compatibility(equipment_b_id);
CREATE INDEX idx_compatibility_relationship ON equipment_compatibility(relationship_type);

-- Trigger
CREATE TRIGGER trigger_equipment_compatibility_updated_at
  BEFORE UPDATE ON equipment_compatibility
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

-- RLS
ALTER TABLE equipment_compatibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY equipment_compatibility_read_all ON equipment_compatibility
  FOR SELECT TO authenticated USING (true);

CREATE POLICY equipment_compatibility_admin_all ON equipment_compatibility
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ============================================
-- EQUIPMENT BUNDLES (Platform-level templates)
-- ============================================
CREATE TABLE equipment_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership (NULL = platform bundle, UUID = tenant bundle)
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Bundle info
  name VARCHAR(200) NOT NULL,
  description TEXT,
  bundle_type VARCHAR(50), -- starter, standard, premium, commercial
  
  -- Target specs
  target_system_size_kwp DECIMAL(5,2),
  target_battery_kwh DECIMAL(5,2),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  
  -- Pricing (in pence)
  bundle_rrp_pence INTEGER,
  bundle_cost_pence INTEGER,
  discount_percent DECIMAL(4,1),
  
  -- Audit
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bundles_tenant ON equipment_bundles(tenant_id);
CREATE INDEX idx_bundles_active ON equipment_bundles(is_active) WHERE is_active = true;

CREATE TRIGGER trigger_equipment_bundles_updated_at
  BEFORE UPDATE ON equipment_bundles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

-- RLS: Users see platform bundles + their tenant's bundles
ALTER TABLE equipment_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY bundles_read_platform ON equipment_bundles
  FOR SELECT TO authenticated
  USING (tenant_id IS NULL);

CREATE POLICY bundles_tenant_isolation ON equipment_bundles
  FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY bundles_super_admin ON equipment_bundles
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ============================================
-- EQUIPMENT BUNDLE ITEMS
-- ============================================
CREATE TABLE equipment_bundle_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES equipment_bundles(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment_catalogue(id),
  
  quantity INTEGER NOT NULL DEFAULT 1,
  is_optional BOOLEAN DEFAULT false,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bundle_items_bundle ON equipment_bundle_items(bundle_id);

ALTER TABLE equipment_bundle_items ENABLE ROW LEVEL SECURITY;

-- Bundle items inherit bundle permissions
CREATE POLICY bundle_items_read ON equipment_bundle_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM equipment_bundles 
      WHERE id = bundle_id 
      AND (tenant_id IS NULL OR tenant_id = current_tenant_id())
    )
  );

CREATE POLICY bundle_items_write ON equipment_bundle_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM equipment_bundles 
      WHERE id = bundle_id 
      AND tenant_id = current_tenant_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM equipment_bundles 
      WHERE id = bundle_id 
      AND tenant_id = current_tenant_id()
    )
  );

COMMENT ON TABLE equipment_compatibility IS 'Compatibility rules between equipment items';
COMMENT ON TABLE equipment_bundles IS 'Pre-configured equipment kits (platform or tenant-level)';
COMMENT ON TABLE equipment_bundle_items IS 'Items within equipment bundles';
