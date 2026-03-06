-- Fix infinite recursion in tenant_users RLS policies
-- The tenant_users_select_same_tenant policy causes recursion by querying tenant_users
-- within its own USING clause.
--
-- Problem: To check if you can SELECT tenant_users, it SELECTs from tenant_users → infinite loop
-- Solution: Drop the recursive policy. The tenant_users_select_own policy is sufficient.

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "tenant_users_select_same_tenant" ON tenant_users;

-- The tenant_users_select_own policy is sufficient and doesn't cause recursion:
-- CREATE POLICY "tenant_users_select_own"
--   ON tenant_users
--   FOR SELECT
--   TO authenticated
--   USING (user_id = auth.uid());
--
-- This allows:
-- 1. Middleware to look up user's tenant membership (service role bypasses RLS anyway)
-- 2. Users to see their own tenant_users record
-- 3. API routes can query tenant_users without recursion

-- Note: If we need users to see OTHER users in their tenant, we should use a
-- database function or join through another table that doesn't create recursion.
