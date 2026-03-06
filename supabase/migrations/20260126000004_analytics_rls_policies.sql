-- Session 105 / Follow-up: Ensure RLS policies exist on analytics tables
-- This migration is safe to run multiple times; it checks for existing
-- policies before creating them.

-- Enable RLS on analytics tables (idempotent)
ALTER TABLE IF EXISTS analytics.tenant_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS analytics.platform_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS analytics.lead_source_stats ENABLE ROW LEVEL SECURITY;

-- Tenant daily stats: tenant-scoped read access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'analytics'
      AND tablename = 'tenant_daily_stats'
      AND policyname = 'tenant_isolation_daily_stats'
  ) THEN
    CREATE POLICY tenant_isolation_daily_stats ON analytics.tenant_daily_stats
      FOR SELECT
      USING (
        tenant_id IN (
          SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
        )
      );
  END IF;
END
$$;

-- Tenant daily stats: service role full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'analytics'
      AND tablename = 'tenant_daily_stats'
      AND policyname = 'service_role_full_access_daily_stats'
  ) THEN
CREATE POLICY service_role_full_access_daily_stats ON analytics.tenant_daily_stats
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END
$$;

-- Lead source stats: tenant-scoped read access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'analytics'
      AND tablename = 'lead_source_stats'
      AND policyname = 'tenant_isolation_lead_source'
  ) THEN
    CREATE POLICY tenant_isolation_lead_source ON analytics.lead_source_stats
      FOR SELECT
      USING (
        tenant_id IN (
          SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
        )
      );
  END IF;
END
$$;

-- Lead source stats: service role full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'analytics'
      AND tablename = 'lead_source_stats'
      AND policyname = 'service_role_full_access_lead_source'
  ) THEN
CREATE POLICY service_role_full_access_lead_source ON analytics.lead_source_stats
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END
$$;

-- Platform stats: super-admin read access only, plus service role
-- COMMENTED OUT: is_super_admin column doesn't exist in users table
-- TODO: Add is_super_admin column to users table first, then uncomment this policy
-- DO $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM pg_policies
--     WHERE schemaname = 'analytics'
--       AND tablename = 'platform_daily_stats'
--       AND policyname = 'super_admin_platform_stats'
--   ) THEN
--     CREATE POLICY super_admin_platform_stats ON analytics.platform_daily_stats
--       FOR SELECT
--       USING (
--         EXISTS (
--           SELECT 1 FROM public.users
--           WHERE id = auth.uid() AND is_super_admin = true
--         )
--       );
--   END IF;
-- END
-- $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'analytics'
      AND tablename = 'platform_daily_stats'
      AND policyname = 'service_role_full_access_platform_stats'
  ) THEN
CREATE POLICY service_role_full_access_platform_stats ON analytics.platform_daily_stats
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END
$$;
