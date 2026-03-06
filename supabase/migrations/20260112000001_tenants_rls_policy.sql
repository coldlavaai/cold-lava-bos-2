-- Migration: Add RLS policy for tenants table
-- Date: 2026-01-12
-- Session: 15
-- Purpose: Allow authenticated users to SELECT their own tenant row via tenant_users membership

-- First, check if RLS is enabled on tenants
-- If not, enable it
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists (in case we're re-running)
DROP POLICY IF EXISTS "tenants_select_same_tenant" ON tenants;

-- Create policy to allow users to SELECT their own tenant
-- Uses tenant_users to verify membership
CREATE POLICY "tenants_select_same_tenant"
  ON tenants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = tenants.id
        AND tenant_users.user_id = auth.uid()
    )
  );

-- Allow admins to UPDATE their own tenant
DROP POLICY IF EXISTS "tenants_update_same_tenant_admin" ON tenants;

CREATE POLICY "tenants_update_same_tenant_admin"
  ON tenants
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = tenants.id
        AND tenant_users.user_id = auth.uid()
        AND tenant_users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = tenants.id
        AND tenant_users.user_id = auth.uid()
        AND tenant_users.role = 'admin'
    )
  );

-- Verify policies created
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'tenants'
ORDER BY policyname;
