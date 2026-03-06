-- Migration: Add indexes on tenant_id columns for performance
-- Date: 2026-01-12
-- Session: 15
-- Purpose: Improve query performance for tenant-scoped queries

-- Index on tenant_users.tenant_id (for RLS policy lookups)
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id
  ON tenant_users(tenant_id);

-- Index on tenant_users.user_id (for RLS policy lookups)
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id
  ON tenant_users(user_id);

-- Composite index on tenant_users for the common RLS pattern
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_user
  ON tenant_users(tenant_id, user_id);

-- Index on customers.tenant_id
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id
  ON customers(tenant_id);

-- Index on jobs.tenant_id
CREATE INDEX IF NOT EXISTS idx_jobs_tenant_id
  ON jobs(tenant_id);

-- Index on jobs.customer_id (for joins)
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id
  ON jobs(customer_id);

-- Index on jobs.current_stage_id (for filtering by stage)
CREATE INDEX IF NOT EXISTS idx_jobs_current_stage_id
  ON jobs(current_stage_id);

-- Index on jobs.assigned_to (for filtering by assignee)
CREATE INDEX IF NOT EXISTS idx_jobs_assigned_to
  ON jobs(assigned_to);

-- Index on job_stages.tenant_id
CREATE INDEX IF NOT EXISTS idx_job_stages_tenant_id
  ON job_stages(tenant_id);

-- Composite index for job_stages tenant + stage_type (common query pattern)
CREATE INDEX IF NOT EXISTS idx_job_stages_tenant_stage_type
  ON job_stages(tenant_id, stage_type);

-- Verify indexes created
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE tablename IN ('tenant_users', 'customers', 'jobs', 'job_stages')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
