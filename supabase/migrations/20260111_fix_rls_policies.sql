-- Session 13: Fix RLS policies to unblock tenant data access
--
-- Problem: Middleware needs to query tenant_users to get tenant_id, but RLS was blocking it.
-- Solution: Create policies that allow authenticated users to access their tenant data.

-- ============================================================================
-- 1. TENANT_USERS: Allow users to see their own memberships
-- ============================================================================

-- Drop existing conflicting policies if any
DROP POLICY IF EXISTS "tenant_users_select_own_tenant" ON tenant_users;
DROP POLICY IF EXISTS "Users can view their own tenant memberships" ON tenant_users;
DROP POLICY IF EXISTS "tenant_users_select_own" ON tenant_users;
DROP POLICY IF EXISTS "tenant_users_select_same_tenant" ON tenant_users;

-- Create policy: Users can SELECT their own tenant_users records
-- This is CRITICAL for middleware to work
CREATE POLICY "tenant_users_select_own"
  ON tenant_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow users to SELECT tenant_users for their tenant (after middleware sets context)
-- This supports the /api/users endpoint
CREATE POLICY "tenant_users_select_same_tenant"
  ON tenant_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
        AND tu.tenant_id = tenant_users.tenant_id
    )
  );

-- ============================================================================
-- 2. USERS: Allow reading user details for tenant members
-- ============================================================================

DROP POLICY IF EXISTS "users_select_by_tenant" ON users;
DROP POLICY IF EXISTS "Users can view other users in their tenant" ON users;
DROP POLICY IF EXISTS "users_select_same_tenant" ON users;

-- Allow users to see other users who are in their tenant
CREATE POLICY "users_select_same_tenant"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users tu1
      INNER JOIN tenant_users tu2 ON tu1.tenant_id = tu2.tenant_id
      WHERE tu1.user_id = auth.uid()
        AND tu2.user_id = users.id
    )
  );

-- ============================================================================
-- 3. CUSTOMERS: Allow tenant members to access their tenant's customers
-- ============================================================================

DROP POLICY IF EXISTS "customers_select_by_tenant" ON customers;
DROP POLICY IF EXISTS "customers_select_via_tenant_users" ON customers;
DROP POLICY IF EXISTS "customers_select_same_tenant" ON customers;
DROP POLICY IF EXISTS "customers_insert_same_tenant" ON customers;
DROP POLICY IF EXISTS "customers_update_same_tenant" ON customers;
DROP POLICY IF EXISTS "customers_delete_same_tenant" ON customers;

-- Allow authenticated users to read customers in their tenant
CREATE POLICY "customers_select_same_tenant"
  ON customers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = customers.tenant_id
        AND tenant_users.user_id = auth.uid()
    )
  );

-- Allow INSERT for tenant members
CREATE POLICY "customers_insert_same_tenant"
  ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = customers.tenant_id
        AND tenant_users.user_id = auth.uid()
    )
  );

-- Allow UPDATE for tenant members
CREATE POLICY "customers_update_same_tenant"
  ON customers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = customers.tenant_id
        AND tenant_users.user_id = auth.uid()
    )
  );

-- Allow DELETE for tenant members
CREATE POLICY "customers_delete_same_tenant"
  ON customers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = customers.tenant_id
        AND tenant_users.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 4. JOBS: Allow tenant members to access their tenant's jobs
-- ============================================================================

DROP POLICY IF EXISTS "jobs_select_by_tenant" ON jobs;
DROP POLICY IF EXISTS "jobs_select_via_tenant_users" ON jobs;
DROP POLICY IF EXISTS "jobs_select_same_tenant" ON jobs;
DROP POLICY IF EXISTS "jobs_insert_same_tenant" ON jobs;
DROP POLICY IF EXISTS "jobs_update_same_tenant" ON jobs;
DROP POLICY IF EXISTS "jobs_delete_same_tenant" ON jobs;

-- Allow authenticated users to read jobs in their tenant
CREATE POLICY "jobs_select_same_tenant"
  ON jobs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = jobs.tenant_id
        AND tenant_users.user_id = auth.uid()
    )
  );

-- Allow INSERT for tenant members
CREATE POLICY "jobs_insert_same_tenant"
  ON jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = jobs.tenant_id
        AND tenant_users.user_id = auth.uid()
    )
  );

-- Allow UPDATE for tenant members
CREATE POLICY "jobs_update_same_tenant"
  ON jobs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = jobs.tenant_id
        AND tenant_users.user_id = auth.uid()
    )
  );

-- Allow DELETE for tenant members
CREATE POLICY "jobs_delete_same_tenant"
  ON jobs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = jobs.tenant_id
        AND tenant_users.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 5. JOB_STAGES: Allow tenant members to access job stages
-- ============================================================================

DROP POLICY IF EXISTS "job_stages_select_by_tenant" ON job_stages;
DROP POLICY IF EXISTS "job_stages_select_same_tenant" ON job_stages;

CREATE POLICY "job_stages_select_same_tenant"
  ON job_stages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = job_stages.tenant_id
        AND tenant_users.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 6. Ensure RLS is enabled on all tables
-- ============================================================================

ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_stages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Verification queries (run these in SQL editor after applying migration)
-- ============================================================================

-- Check policies were created:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE tablename IN ('tenant_users', 'customers', 'jobs', 'users', 'job_stages')
-- ORDER BY tablename, policyname;

-- Check RLS is enabled:
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE tablename IN ('tenant_users', 'customers', 'jobs', 'users', 'job_stages');
