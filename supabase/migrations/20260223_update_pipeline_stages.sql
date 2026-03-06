-- ========================================
-- Solar BOS - Pipeline Stage Restructure
-- Session: Jacob's BOS review (23 Feb 2026)
-- ========================================
-- Replaces generic stages with solar sales pipeline stages.
-- Renames existing stages (preserves FK references from jobs),
-- deactivates removed stages, inserts new stages.
-- Also updates seed_tenant_data for future signups.
-- ========================================

-- ----------------------------------------
-- PART 1: Update existing tenant stages
-- (applies to ALL tenants - renames by name)
-- ----------------------------------------

-- Rename: Qualified → Qualified / In Progress
UPDATE job_stages
SET name = 'Qualified / In Progress', position = 2
WHERE name = 'Qualified';

-- Rename: Survey Booked → Appointment Booked
UPDATE job_stages
SET name = 'Appointment Booked', position = 3
WHERE name = 'Survey Booked';

-- Deactivate: Survey Complete (removed from pipeline)
UPDATE job_stages
SET is_active = false
WHERE name = 'Survey Complete';

-- Proposal Sent stays — update position
UPDATE job_stages
SET position = 4
WHERE name = 'Proposal Sent';

-- Deactivate: Negotiation (removed from pipeline)
UPDATE job_stages
SET is_active = false
WHERE name = 'Negotiation';

-- Rename: Won → Closed (Won), keep stage_type = 'completed'
UPDATE job_stages
SET name = 'Closed (Won)', position = 9, color = '#22c55e'
WHERE name = 'Won';

-- Rename: Lost → Closed (Lost)
UPDATE job_stages
SET name = 'Closed (Lost)', position = 10, stage_type = 'cancelled', color = '#6b7280'
WHERE name = 'Lost';

-- Rename: New Lead — update position to be explicit
UPDATE job_stages
SET position = 1
WHERE name = 'New Lead';

-- ----------------------------------------
-- PART 2: Insert new stages for existing tenants
-- ----------------------------------------
-- We insert for every existing active tenant that does NOT already have these stages.

INSERT INTO job_stages (tenant_id, name, position, stage_type, color, is_active)
SELECT DISTINCT t.id, 'Hot List', 5, 'in_progress', '#ef4444', true
FROM tenants t
WHERE t.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM job_stages js WHERE js.tenant_id = t.id AND js.name = 'Hot List'
  );

INSERT INTO job_stages (tenant_id, name, position, stage_type, color, is_active)
SELECT DISTINCT t.id, 'Long Term', 6, 'in_progress', '#06b6d4', true
FROM tenants t
WHERE t.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM job_stages js WHERE js.tenant_id = t.id AND js.name = 'Long Term'
  );

INSERT INTO job_stages (tenant_id, name, position, stage_type, color, is_active)
SELECT DISTINCT t.id, 'Unable to Contact', 7, 'in_progress', '#64748b', true
FROM tenants t
WHERE t.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM job_stages js WHERE js.tenant_id = t.id AND js.name = 'Unable to Contact'
  );

INSERT INTO job_stages (tenant_id, name, position, stage_type, color, is_active)
SELECT DISTINCT t.id, 'Not Interested', 8, 'cancelled', '#6b7280', true
FROM tenants t
WHERE t.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM job_stages js WHERE js.tenant_id = t.id AND js.name = 'Not Interested'
  );

INSERT INTO job_stages (tenant_id, name, position, stage_type, color, is_active)
SELECT DISTINCT t.id, 'Installed & Handover', 11, 'completed', '#0ea5e9', true
FROM tenants t
WHERE t.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM job_stages js WHERE js.tenant_id = t.id AND js.name = 'Installed & Handover'
  );

-- ----------------------------------------
-- PART 3: Update seed_tenant_data function
-- (for new tenant signups going forward)
-- ----------------------------------------

CREATE OR REPLACE FUNCTION seed_tenant_data(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Seed default job stages (Jacob's solar sales pipeline, Feb 2026)
  INSERT INTO job_stages (tenant_id, name, position, stage_type, color) VALUES
  (p_tenant_id, 'New Lead',              1,  'lead',        '#10b981'),
  (p_tenant_id, 'Qualified / In Progress', 2, 'in_progress', '#3b82f6'),
  (p_tenant_id, 'Appointment Booked',    3,  'in_progress', '#8b5cf6'),
  (p_tenant_id, 'Proposal Sent',         4,  'in_progress', '#f59e0b'),
  (p_tenant_id, 'Hot List',              5,  'in_progress', '#ef4444'),
  (p_tenant_id, 'Long Term',             6,  'in_progress', '#06b6d4'),
  (p_tenant_id, 'Unable to Contact',     7,  'in_progress', '#64748b'),
  (p_tenant_id, 'Not Interested',        8,  'cancelled',   '#6b7280'),
  (p_tenant_id, 'Closed (Won)',          9,  'completed',   '#22c55e'),
  (p_tenant_id, 'Closed (Lost)',         10, 'cancelled',   '#6b7280'),
  (p_tenant_id, 'Installed & Handover',  11, 'completed',   '#0ea5e9');

  -- Seed default appointment types
  INSERT INTO appointment_types (tenant_id, name, duration_minutes, color) VALUES
  (p_tenant_id, 'Survey', 60, '#3b82f6'),
  (p_tenant_id, 'Sales Visit', 45, '#10b981'),
  (p_tenant_id, 'Installation', 480, '#f59e0b'),
  (p_tenant_id, 'Follow-up', 30, '#8b5cf6');

  -- Seed default customer sources
  INSERT INTO customer_sources (tenant_id, name, is_active) VALUES
  (p_tenant_id, 'Website', true),
  (p_tenant_id, 'Referral', true),
  (p_tenant_id, 'Google Ads', true),
  (p_tenant_id, 'Phone Inquiry', true),
  (p_tenant_id, 'DBR Campaign', true);

END;
$$ LANGUAGE plpgsql;
