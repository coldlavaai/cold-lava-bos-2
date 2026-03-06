-- ========================================
-- Solar BOS - Core Platform Tables
-- Tenants, Users, and Tenant-User Relationships
-- ========================================

-- ========================================
-- TENANTS TABLE
-- ========================================

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(63) UNIQUE NOT NULL,

  -- Tier
  tier VARCHAR(20) NOT NULL DEFAULT 'essential'
    CHECK (tier IN ('essential', 'pro', 'premium')),

  -- Settings
  settings JSONB DEFAULT '{}',

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Optimistic locking
  version INTEGER DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);

-- Updated at trigger
CREATE TRIGGER trigger_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

-- RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Tenants can only see themselves
CREATE POLICY tenant_isolation_tenants ON tenants
  FOR ALL
  USING (id = current_tenant_id())
  WITH CHECK (id = current_tenant_id());

-- Super admins can see all
CREATE POLICY super_admin_bypass_tenants ON tenants
  FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ========================================
-- USERS TABLE
-- ========================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);

-- Updated at trigger
CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

-- RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can see themselves
CREATE POLICY user_self_access ON users
  FOR ALL
  USING (id = auth.uid() OR is_super_admin())
  WITH CHECK (id = auth.uid() OR is_super_admin());

-- ========================================
-- TENANT_USERS TABLE (Join Table)
-- ========================================

CREATE TABLE tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Role
  role VARCHAR(20) NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('admin', 'sales', 'ops', 'finance', 'viewer')),

  -- Invitation
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,

  -- Unique constraint
  UNIQUE(tenant_id, user_id)
);

-- Indexes
CREATE INDEX idx_tenant_users_tenant ON tenant_users(tenant_id, user_id);
CREATE INDEX idx_tenant_users_user ON tenant_users(user_id, tenant_id);

-- RLS
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;

-- Users can only see members of their tenant
CREATE POLICY tenant_isolation_tenant_users ON tenant_users
  FOR ALL
  USING (
    tenant_id = current_tenant_id()
    OR user_id = auth.uid()
    OR is_super_admin()
  )
  WITH CHECK (
    tenant_id = current_tenant_id()
    OR is_super_admin()
  );
