/**
 * Session 109: Inventory Tables
 * Creates tables for equipment/inventory management
 */

-- Inventory Items Table
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Item details
  sku VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  
  -- Type
  item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('panel', 'inverter', 'battery', 'mounting', 'cable', 'other')),
  
  -- Manufacturer details
  manufacturer VARCHAR(255),
  model VARCHAR(255),
  datasheet_url TEXT,
  
  -- Stock
  quantity_in_stock INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER,
  reorder_quantity INTEGER,
  
  -- Pricing (in pence)
  unit_cost_pence INTEGER,
  unit_price_pence INTEGER,
  
  -- Location
  warehouse_location VARCHAR(255),
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_preferred BOOLEAN NOT NULL DEFAULT false,
  version INTEGER NOT NULL DEFAULT 1,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Inventory Transactions Table
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  
  -- Transaction details
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('purchase', 'sale', 'adjustment', 'return', 'allocation', 'deallocation')),
  
  -- Quantity change
  quantity_change INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  
  -- Related entity
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  
  -- Cost tracking (in pence)
  unit_cost_pence INTEGER,
  total_cost_pence INTEGER,
  
  -- Reference
  reference VARCHAR(255),
  notes TEXT,
  
  -- User
  performed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_items_tenant_id ON inventory_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_item_type ON inventory_items(tenant_id, item_type);
CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON inventory_items(tenant_id, sku);
CREATE INDEX IF NOT EXISTS idx_inventory_items_low_stock ON inventory_items(tenant_id, quantity_in_stock, reorder_level) 
  WHERE is_active = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_tenant_id ON inventory_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item_id ON inventory_transactions(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_job_id ON inventory_transactions(job_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON inventory_transactions(tenant_id, created_at DESC);

-- Enable RLS
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inventory_items
CREATE POLICY "Users can view their tenant's inventory items"
  ON inventory_items FOR SELECT TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Users can insert inventory items for their tenant"
  ON inventory_items FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Users can update their tenant's inventory items"
  ON inventory_items FOR UPDATE TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Users can delete their tenant's inventory items"
  ON inventory_items FOR DELETE TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- RLS Policies for inventory_transactions
CREATE POLICY "Users can view their tenant's inventory transactions"
  ON inventory_transactions FOR SELECT TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Users can insert inventory transactions for their tenant"
  ON inventory_transactions FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Triggers for updated_at
CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE inventory_items IS 'Solar equipment and materials inventory';
COMMENT ON TABLE inventory_transactions IS 'Stock movement history for inventory items';
