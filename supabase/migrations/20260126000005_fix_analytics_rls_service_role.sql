-- Session 105 follow-up: fix analytics service_role RLS policies
-- Use auth.role() instead of auth.jwt()->>'role' for service_role checks.

-- Tenant daily stats: service_role full access
DROP POLICY IF EXISTS service_role_full_access_daily_stats ON analytics.tenant_daily_stats;
CREATE POLICY service_role_full_access_daily_stats ON analytics.tenant_daily_stats
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Lead source stats: service_role full access
DROP POLICY IF EXISTS service_role_full_access_lead_source ON analytics.lead_source_stats;
CREATE POLICY service_role_full_access_lead_source ON analytics.lead_source_stats
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Platform daily stats: service_role full access
DROP POLICY IF EXISTS service_role_full_access_platform_stats ON analytics.platform_daily_stats;
CREATE POLICY service_role_full_access_platform_stats ON analytics.platform_daily_stats
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
