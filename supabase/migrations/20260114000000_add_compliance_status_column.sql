-- Add compliance status tracking to jobs table
-- Implements 4-tier status system: ready, in_progress, not_started, dno_pending
-- Based on SESSION-56-COMPLIANCE-STATUS-RULES-NOTES.md

-- ========================================
-- GENERATED COLUMN: compliance_status
-- ========================================

ALTER TABLE jobs
ADD COLUMN compliance_status TEXT
GENERATED ALWAYS AS (
  CASE
    -- Tier 3: Not Started (all critical fields empty)
    WHEN installer_mcs_number IS NULL
      AND export_capacity_kw IS NULL
      AND site_supply_type IS NULL
      AND inverter_model IS NULL
      AND panel_model IS NULL
    THEN 'not_started'

    -- Special Tier: DNO Pending (everything complete except DNO reference)
    WHEN dno_required = true
      AND dno_reference IS NULL
      AND installer_mcs_number IS NOT NULL
      AND export_capacity_kw IS NOT NULL
      AND site_supply_type IS NOT NULL
      AND inverter_model IS NOT NULL
      AND panel_model IS NOT NULL
    THEN 'dno_pending'

    -- Tier 1: Ready (all critical fields present)
    -- IMPORTANT: COALESCE handles NULL dno_required (treats as false)
    WHEN installer_mcs_number IS NOT NULL
      AND export_capacity_kw IS NOT NULL
      AND site_supply_type IS NOT NULL
      AND inverter_model IS NOT NULL
      AND panel_model IS NOT NULL
      AND (COALESCE(dno_required, false) = false OR dno_reference IS NOT NULL)
    THEN 'ready'

    -- Tier 2: In Progress (some but not all critical fields)
    ELSE 'in_progress'
  END
) STORED;

-- Add index for efficient filtering by status
CREATE INDEX idx_jobs_compliance_status
  ON jobs(tenant_id, compliance_status);

-- Add comment for documentation
COMMENT ON COLUMN jobs.compliance_status IS
  'Computed compliance readiness status: not_started, in_progress, dno_pending, or ready. Automatically maintained based on critical compliance fields.';

-- ========================================
-- VIEW: compliance_dashboard_summary
-- ========================================

CREATE OR REPLACE VIEW compliance_dashboard_summary AS
SELECT
  j.tenant_id,

  -- Total counts by status
  COUNT(*) as total_jobs,
  COUNT(*) FILTER (WHERE j.compliance_status = 'ready') as ready_count,
  COUNT(*) FILTER (WHERE j.compliance_status = 'in_progress') as in_progress_count,
  COUNT(*) FILTER (WHERE j.compliance_status = 'not_started') as not_started_count,
  COUNT(*) FILTER (WHERE j.compliance_status = 'dno_pending') as dno_pending_count,

  -- Percentages
  ROUND(
    COUNT(*) FILTER (WHERE j.compliance_status = 'ready')::numeric /
    NULLIF(COUNT(*), 0) * 100
  ) as ready_percentage,

  ROUND(
    COUNT(*) FILTER (WHERE j.compliance_status IN ('ready', 'in_progress', 'dno_pending'))::numeric /
    NULLIF(COUNT(*), 0) * 100
  ) as started_percentage,

  -- DNO statistics
  COUNT(*) FILTER (WHERE j.dno_required = true) as dno_required_count,
  COUNT(*) FILTER (WHERE j.dno_required = true AND j.dno_reference IS NULL) as dno_pending_submission,
  COUNT(*) FILTER (WHERE j.dno_required = true AND j.dno_reference IS NOT NULL) as dno_submitted_count,

  -- Field completion statistics (critical fields)
  ROUND(AVG(
    (CASE WHEN j.installer_mcs_number IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN j.export_capacity_kw IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN j.site_supply_type IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN j.inverter_model IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN j.panel_model IS NOT NULL THEN 1 ELSE 0 END)
  )::numeric, 2) as avg_critical_fields_filled,

  -- Job stage breakdown
  COUNT(*) FILTER (WHERE js.stage_type = 'lead') as leads_count,
  COUNT(*) FILTER (WHERE js.stage_type = 'in_progress') as active_jobs_count,
  COUNT(*) FILTER (WHERE js.stage_type = 'completed') as completed_jobs_count,
  COUNT(*) FILTER (WHERE js.stage_type = 'cancelled') as cancelled_jobs_count,

  -- Compliance by stage type (excluding leads)
  COUNT(*) FILTER (WHERE js.stage_type != 'lead' AND j.compliance_status = 'ready') as non_lead_ready_count,
  COUNT(*) FILTER (WHERE js.stage_type != 'lead') as non_lead_total,

  -- Recent activity
  COUNT(*) FILTER (WHERE j.updated_at > NOW() - INTERVAL '7 days') as updated_last_week,
  COUNT(*) FILTER (WHERE j.updated_at > NOW() - INTERVAL '30 days') as updated_last_month

FROM jobs j
LEFT JOIN job_stages js ON j.current_stage_id = js.id
GROUP BY j.tenant_id;

-- Grant access to authenticated users
GRANT SELECT ON compliance_dashboard_summary TO authenticated;

-- Add comment
COMMENT ON VIEW compliance_dashboard_summary IS
  'Aggregate compliance metrics per tenant for dashboard. Includes status counts, DNO stats, field completion, and stage breakdowns.';

-- ========================================
-- VIEW: jobs_missing_compliance_fields
-- ========================================

CREATE OR REPLACE VIEW jobs_missing_compliance_fields AS
SELECT
  j.id,
  j.tenant_id,
  j.job_number,
  j.customer_id,
  c.name as customer_name,
  j.compliance_status,
  j.current_stage_id,
  js.name as stage_name,
  js.stage_type,
  j.dno_required,

  -- Missing critical fields as array
  ARRAY_REMOVE(ARRAY[
    CASE WHEN j.installer_mcs_number IS NULL THEN 'MCS Certificate Number' END,
    CASE WHEN j.export_capacity_kw IS NULL THEN 'Export Capacity' END,
    CASE WHEN j.site_supply_type IS NULL THEN 'Supply Type' END,
    CASE WHEN j.inverter_model IS NULL THEN 'Inverter Model' END,
    CASE WHEN j.panel_model IS NULL THEN 'Panel Model' END,
    CASE WHEN j.dno_required = true AND j.dno_reference IS NULL THEN 'DNO Reference' END
  ], NULL) as missing_critical_fields,

  -- Missing optional fields (for reference)
  ARRAY_REMOVE(ARRAY[
    CASE WHEN j.installer_name IS NULL THEN 'Installer Name' END,
    CASE WHEN j.mounting_system IS NULL THEN 'Mounting System' END
  ], NULL) as missing_optional_fields,

  -- Count of missing critical fields
  ARRAY_LENGTH(ARRAY_REMOVE(ARRAY[
    CASE WHEN j.installer_mcs_number IS NULL THEN 1 END,
    CASE WHEN j.export_capacity_kw IS NULL THEN 1 END,
    CASE WHEN j.site_supply_type IS NULL THEN 1 END,
    CASE WHEN j.inverter_model IS NULL THEN 1 END,
    CASE WHEN j.panel_model IS NULL THEN 1 END,
    CASE WHEN j.dno_required = true AND j.dno_reference IS NULL THEN 1 END
  ], NULL), 1) as missing_critical_count,

  -- Total critical fields required for this job
  CASE
    WHEN j.dno_required = true THEN 6
    ELSE 5
  END as critical_fields_total,

  -- Last updated timestamp
  j.updated_at

FROM jobs j
LEFT JOIN customers c ON j.customer_id = c.id
LEFT JOIN job_stages js ON j.current_stage_id = js.id
WHERE j.compliance_status IN ('not_started', 'in_progress', 'dno_pending')
  -- Exclude lead-stage jobs (compliance not needed yet)
  AND (js.stage_type IS NULL OR js.stage_type != 'lead')
ORDER BY
  -- Prioritize by status (not_started first, then in_progress, then dno_pending)
  CASE j.compliance_status
    WHEN 'not_started' THEN 1
    WHEN 'in_progress' THEN 2
    WHEN 'dno_pending' THEN 3
  END,
  -- Then by number of missing fields (most missing first)
  ARRAY_LENGTH(ARRAY_REMOVE(ARRAY[
    CASE WHEN j.installer_mcs_number IS NULL THEN 1 END,
    CASE WHEN j.export_capacity_kw IS NULL THEN 1 END,
    CASE WHEN j.site_supply_type IS NULL THEN 1 END,
    CASE WHEN j.inverter_model IS NULL THEN 1 END,
    CASE WHEN j.panel_model IS NULL THEN 1 END,
    CASE WHEN j.dno_required = true AND j.dno_reference IS NULL THEN 1 END
  ], NULL), 1) DESC,
  -- Finally by least recently updated (oldest first - needs attention)
  j.updated_at ASC;

-- Grant access to authenticated users
GRANT SELECT ON jobs_missing_compliance_fields TO authenticated;

-- Add comment
COMMENT ON VIEW jobs_missing_compliance_fields IS
  'Jobs with incomplete compliance data, showing specific missing fields. Excludes lead-stage jobs and ready jobs. Ordered by priority (not_started > in_progress > dno_pending) and missing field count.';
