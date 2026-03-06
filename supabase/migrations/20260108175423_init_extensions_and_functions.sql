-- ========================================
-- Solar BOS - Initial Migration
-- Extensions and Core Functions
-- ========================================

-- ========================================
-- EXTENSIONS
-- ========================================

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Full text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- PostGIS for geocoding (routing module)
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Case-insensitive text comparison
CREATE EXTENSION IF NOT EXISTS "citext";

-- ========================================
-- CORE FUNCTIONS
-- ========================================

-- ========================================
-- CRITICAL: Create this function FIRST
-- Used by RLS policies to identify current tenant
-- ========================================
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
  SELECT COALESCE(
    -- Try session variable first (set by middleware)
    current_setting('app.tenant_id', true)::UUID,
    -- Fallback to JWT claim
    (auth.jwt() ->> 'tenant_id')::UUID
  )
$$ LANGUAGE SQL STABLE;

-- ========================================
-- Current Super Admin Check
-- Used by RLS policies for super admin bypass
-- ========================================
CREATE OR REPLACE FUNCTION is_super_admin() RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    current_setting('app.is_super_admin', true)::BOOLEAN,
    false
  )
$$ LANGUAGE SQL STABLE;

-- ========================================
-- Updated At Trigger Function
-- Applied to all tables with updated_at column
-- ========================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Soft Delete Function
-- Helper for soft deleting records
-- ========================================
CREATE OR REPLACE FUNCTION soft_delete(
  table_name TEXT,
  record_id UUID
) RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
    table_name
  ) USING record_id;
END;
$$ LANGUAGE plpgsql;
