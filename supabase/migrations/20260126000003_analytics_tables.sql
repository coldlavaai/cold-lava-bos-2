/**
 * Session 105: Analytics v1 - Analytics Schema
 *
 * Creates analytics schema with pre-aggregated daily stats tables:
 * - analytics.tenant_daily_stats - Per-tenant daily metrics
 * - analytics.platform_daily_stats - Platform-wide daily metrics
 * - analytics.lead_source_stats - Lead source performance tracking
 *
 * These tables support dashboard cards and analytics endpoints without
 * impacting OLTP performance.
 */

-- Create analytics schema
CREATE SCHEMA IF NOT EXISTS analytics;

-- Tenant Daily Stats
CREATE TABLE IF NOT EXISTS analytics.tenant_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Customer metrics
  total_customers INTEGER NOT NULL DEFAULT 0,
  new_customers INTEGER NOT NULL DEFAULT 0,

  -- Job metrics
  total_jobs INTEGER NOT NULL DEFAULT 0,
  new_jobs INTEGER NOT NULL DEFAULT 0,
  jobs_completed INTEGER NOT NULL DEFAULT 0,

  -- Pipeline value (in pence)
  pipeline_value_pence BIGINT NOT NULL DEFAULT 0,
  won_value_pence BIGINT NOT NULL DEFAULT 0,

  -- Quotes
  quotes_sent INTEGER NOT NULL DEFAULT 0,
  quotes_accepted INTEGER NOT NULL DEFAULT 0,

  -- UK Compliance
  mcs_certificates_issued INTEGER NOT NULL DEFAULT 0,
  dno_applications_submitted INTEGER NOT NULL DEFAULT 0,
  dno_applications_approved INTEGER NOT NULL DEFAULT 0,

  -- Communications
  emails_sent INTEGER NOT NULL DEFAULT 0,
  sms_sent INTEGER NOT NULL DEFAULT 0,

  -- AI
  ai_messages INTEGER NOT NULL DEFAULT 0,

  -- Calculated
  conversion_rate DECIMAL(5,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, date)
);

CREATE INDEX IF NOT EXISTS idx_tenant_daily_tenant_date ON analytics.tenant_daily_stats(tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_tenant_daily_date ON analytics.tenant_daily_stats(date DESC);

COMMENT ON TABLE analytics.tenant_daily_stats IS 'Pre-aggregated daily metrics per tenant for dashboard and reporting';

-- Platform Daily Stats (Cold Lava internal)
CREATE TABLE IF NOT EXISTS analytics.platform_daily_stats (
  date DATE PRIMARY KEY,

  -- Tenant metrics
  total_tenants INTEGER NOT NULL DEFAULT 0,
  active_tenants INTEGER NOT NULL DEFAULT 0,
  new_tenants INTEGER NOT NULL DEFAULT 0,

  -- Revenue
  mrr_pence BIGINT NOT NULL DEFAULT 0,

  -- Tier breakdown
  tenants_essential INTEGER NOT NULL DEFAULT 0,
  tenants_pro INTEGER NOT NULL DEFAULT 0,
  tenants_premium INTEGER NOT NULL DEFAULT 0,

  -- Platform activity
  total_jobs_created INTEGER NOT NULL DEFAULT 0,
  total_mcs_certificates INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_daily_date ON analytics.platform_daily_stats(date DESC);

COMMENT ON TABLE analytics.platform_daily_stats IS 'Platform-wide daily metrics for Cold Lava internal analytics';

-- Lead Source Stats (Marketing ROI)
CREATE TABLE IF NOT EXISTS analytics.lead_source_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  lead_source VARCHAR(100) NOT NULL,

  leads_created INTEGER NOT NULL DEFAULT 0,
  quotes_sent INTEGER NOT NULL DEFAULT 0,
  quotes_accepted INTEGER NOT NULL DEFAULT 0,
  won_value_pence BIGINT NOT NULL DEFAULT 0,

  conversion_rate DECIMAL(5,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, date, lead_source)
);

CREATE INDEX IF NOT EXISTS idx_lead_source_tenant_date ON analytics.lead_source_stats(tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_lead_source_date_source ON analytics.lead_source_stats(date DESC, lead_source);

COMMENT ON TABLE analytics.lead_source_stats IS 'Daily lead source performance for marketing ROI tracking';

-- Row Level Security
-- Note: Analytics tables are accessed via service role by backend aggregation jobs
-- and API endpoints. RLS policies allow tenant users to read their own data.

ALTER TABLE analytics.tenant_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.platform_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.lead_source_stats ENABLE ROW LEVEL SECURITY;

-- Tenant daily stats policies
DROP POLICY IF EXISTS tenant_isolation_daily_stats ON analytics.tenant_daily_stats;
CREATE POLICY tenant_isolation_daily_stats ON analytics.tenant_daily_stats
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS service_role_full_access_daily_stats ON analytics.tenant_daily_stats;
CREATE POLICY service_role_full_access_daily_stats ON analytics.tenant_daily_stats
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Lead source stats policies
DROP POLICY IF EXISTS tenant_isolation_lead_source ON analytics.lead_source_stats;
CREATE POLICY tenant_isolation_lead_source ON analytics.lead_source_stats
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS service_role_full_access_lead_source ON analytics.lead_source_stats;
CREATE POLICY service_role_full_access_lead_source ON analytics.lead_source_stats
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Platform stats policy (super admin only for now)
-- Super admin policy disabled - is_super_admin column not in users table
-- DROP POLICY IF EXISTS super_admin_platform_stats ON analytics.platform_daily_stats;
-- CREATE POLICY super_admin_platform_stats ON analytics.platform_daily_stats
--   FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.users
--       WHERE id = auth.uid() AND is_super_admin = true
--     )
--   );

DROP POLICY IF EXISTS service_role_full_access_platform_stats ON analytics.platform_daily_stats;
CREATE POLICY service_role_full_access_platform_stats ON analytics.platform_daily_stats
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');
