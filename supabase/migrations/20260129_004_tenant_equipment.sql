-- ============================================
-- EQUIPMENT SYSTEM - MIGRATION 4: TENANT LEVEL
-- Solar BOS - Enterprise Edition
-- Date: 2026-01-29
-- ============================================

-- Supplier codes
CREATE TYPE supplier_code AS ENUM (
  'segen',
  'midsummer',
  'alternergy',
  'ccl',
  'powerland',
  'wind_sun',
  'hdm',
  'jjpv',
  'other'
);

-- Connection status
CREATE TYPE supplier_connection_status AS ENUM (
  'pending',
  'active',
  'error',
  'suspended',
  'disconnected'
);

-- ============================================
-- TENANT SUPPLIER CONNECTIONS
-- ============================================
CREATE TABLE tenant_supplier_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Supplier
  supplier_code supplier_code NOT NULL,
  
  -- Connection status
  connection_status supplier_connection_status DEFAULT 'pending',
  connected_at TIMESTAMPTZ,
  last_successful_sync_at TIMESTAMPTZ,
  
  -- Credentials (stored in Supabase Vault)
  credentials_vault_secret_id UUID, -- References vault.secrets
  
  -- Account info (non-sensitive)
  account_number VARCHAR(50),
  account_name VARCHAR(200),
  account_email VARCHAR(255),
  credit_limit_pence INTEGER,
  payment_terms_days INTEGER,
  
  -- Sync settings
  auto_sync_enabled BOOLEAN DEFAULT true,
  sync_frequency_minutes INTEGER DEFAULT 60,
  sync_pricing BOOLEAN DEFAULT true,
  sync_stock BOOLEAN DEFAULT true,
  
  -- Sync status
  last_sync_at TIMESTAMPTZ,
  last_sync_status VARCHAR(50),
  last_error_message TEXT,
  consecutive_error_count INTEGER DEFAULT 0,
  
  -- Preferences
  is_preferred_supplier BOOLEAN DEFAULT false,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_tenant_supplier UNIQUE (tenant_id, supplier_code)
);

CREATE INDEX idx_supplier_connections_tenant ON tenant_supplier_connections(tenant_id);
CREATE INDEX idx_supplier_connections_status ON tenant_supplier_connections(connection_status);

CREATE TRIGGER trigger_supplier_connections_updated_at
  BEFORE UPDATE ON tenant_supplier_connections
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE tenant_supplier_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY supplier_connections_tenant_isolation ON tenant_supplier_connections
  FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ============================================
-- TENANT EQUIPMENT PREFERENCES
-- ============================================
CREATE TABLE tenant_equipment_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment_catalogue(id) ON DELETE CASCADE,
  
  -- Preferences
  is_favourite BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false,
  is_default_for_category BOOLEAN DEFAULT false,
  
  -- Internal naming
  internal_name VARCHAR(200),
  internal_sku VARCHAR(100),
  
  -- Pricing (in pence)
  cost_price_pence INTEGER,
  sell_price_pence INTEGER,
  margin_percent DECIMAL(5,2),
  price_last_updated_at TIMESTAMPTZ,
  price_source VARCHAR(50), -- manual, segen_api, midsummer_api
  
  -- Inventory
  quantity_in_stock INTEGER DEFAULT 0,
  quantity_reserved INTEGER DEFAULT 0,
  quantity_on_order INTEGER DEFAULT 0,
  reorder_level INTEGER,
  preferred_supplier_code supplier_code,
  
  -- Usage stats
  times_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Notes
  internal_notes TEXT,
  installation_notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_tenant_equipment UNIQUE (tenant_id, equipment_id)
);

CREATE INDEX idx_equipment_prefs_tenant ON tenant_equipment_preferences(tenant_id);
CREATE INDEX idx_equipment_prefs_favourite ON tenant_equipment_preferences(tenant_id, is_favourite) WHERE is_favourite = true;
CREATE INDEX idx_equipment_prefs_equipment ON tenant_equipment_preferences(equipment_id);

CREATE TRIGGER trigger_equipment_prefs_updated_at
  BEFORE UPDATE ON tenant_equipment_preferences
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE tenant_equipment_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY equipment_prefs_tenant_isolation ON tenant_equipment_preferences
  FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ============================================
-- EQUIPMENT PRICE HISTORY
-- ============================================
CREATE TABLE equipment_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment_catalogue(id) ON DELETE CASCADE,
  
  -- Prices (in pence)
  cost_price_pence INTEGER,
  sell_price_pence INTEGER,
  
  -- Source
  price_source VARCHAR(50), -- manual, segen_api, midsummer_api, quote
  supplier_quote_reference VARCHAR(100),
  
  -- Validity
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_price_history_tenant_equipment ON equipment_price_history(tenant_id, equipment_id);
CREATE INDEX idx_price_history_valid ON equipment_price_history(tenant_id, valid_from DESC);

ALTER TABLE equipment_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY price_history_tenant_isolation ON equipment_price_history
  FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

COMMENT ON TABLE tenant_supplier_connections IS 'Tenant connections to distributors (Segen, Midsummer, etc.)';
COMMENT ON TABLE tenant_equipment_preferences IS 'Tenant-specific equipment preferences, pricing, and inventory';
COMMENT ON TABLE equipment_price_history IS 'Historical pricing data for audit and trending';
