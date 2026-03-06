-- Migration: User Profiles (Permission Templates)
-- Adds user_profiles table and links to tenant_users

-- 1. Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- 2. Add profile_id column to tenant_users
ALTER TABLE tenant_users
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES user_profiles(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant ON user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_profile ON tenant_users(profile_id);

-- 4. RLS policies for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role has full access to user_profiles"
  ON user_profiles
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Tenant isolation: users can read profiles in their tenant
CREATE POLICY "tenant_users_can_read_profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = current_tenant_id()
    OR is_super_admin()
  );

-- Only admins can modify profiles (enforced at API level, service_role bypasses)
CREATE POLICY "admins_can_manage_profiles"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (
    tenant_id = current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = user_profiles.tenant_id
        AND tenant_users.user_id = auth.uid()
        AND tenant_users.role = 'admin'
    )
  )
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = user_profiles.tenant_id
        AND tenant_users.user_id = auth.uid()
        AND tenant_users.role = 'admin'
    )
  );
