-- Test script for compliance status migration
-- Run this to verify SQL syntax and logic

-- Test 1: Check if we can create the generated column
BEGIN;

-- Simulate the ALTER TABLE (using a temp table for testing)
CREATE TEMP TABLE test_jobs AS
SELECT
  id,
  tenant_id,
  installer_mcs_number,
  export_capacity_kw,
  site_supply_type,
  inverter_model,
  panel_model,
  dno_required,
  dno_reference
FROM jobs
LIMIT 10;

-- Add the generated column to temp table
ALTER TABLE test_jobs
ADD COLUMN compliance_status_test TEXT;

-- Manually calculate status to verify logic
UPDATE test_jobs SET compliance_status_test = (
  CASE
    WHEN installer_mcs_number IS NULL
      AND export_capacity_kw IS NULL
      AND site_supply_type IS NULL
      AND inverter_model IS NULL
      AND panel_model IS NULL
    THEN 'not_started'

    WHEN dno_required = true
      AND dno_reference IS NULL
      AND installer_mcs_number IS NOT NULL
      AND export_capacity_kw IS NOT NULL
      AND site_supply_type IS NOT NULL
      AND inverter_model IS NOT NULL
      AND panel_model IS NOT NULL
    THEN 'dno_pending'

    WHEN installer_mcs_number IS NOT NULL
      AND export_capacity_kw IS NOT NULL
      AND site_supply_type IS NOT NULL
      AND inverter_model IS NOT NULL
      AND panel_model IS NOT NULL
      -- FIXED: COALESCE handles NULL dno_required (treats as false)
      AND (COALESCE(dno_required, false) = false OR dno_reference IS NOT NULL)
    THEN 'ready'

    ELSE 'in_progress'
  END
);

-- Show results
SELECT
  id,
  compliance_status_test,
  installer_mcs_number IS NOT NULL as has_mcs,
  export_capacity_kw IS NOT NULL as has_export,
  site_supply_type IS NOT NULL as has_supply,
  inverter_model IS NOT NULL as has_inverter,
  panel_model IS NOT NULL as has_panel,
  dno_required,
  dno_reference IS NOT NULL as has_dno_ref
FROM test_jobs;

ROLLBACK;

-- Test 2: Verify dashboard view query (without creating view)
SELECT
  tenant_id,
  COUNT(*) as total_jobs,
  SUM(CASE WHEN compliance_test = 'ready' THEN 1 ELSE 0 END) as ready_count,
  SUM(CASE WHEN compliance_test = 'in_progress' THEN 1 ELSE 0 END) as in_progress_count,
  SUM(CASE WHEN compliance_test = 'not_started' THEN 1 ELSE 0 END) as not_started_count,
  SUM(CASE WHEN compliance_test = 'dno_pending' THEN 1 ELSE 0 END) as dno_pending_count
FROM (
  SELECT
    tenant_id,
    CASE
      WHEN installer_mcs_number IS NULL
        AND export_capacity_kw IS NULL
        AND site_supply_type IS NULL
        AND inverter_model IS NULL
        AND panel_model IS NULL
      THEN 'not_started'
      WHEN dno_required = true
        AND dno_reference IS NULL
        AND installer_mcs_number IS NOT NULL
        AND export_capacity_kw IS NOT NULL
        AND site_supply_type IS NOT NULL
        AND inverter_model IS NOT NULL
        AND panel_model IS NOT NULL
      THEN 'dno_pending'
      WHEN installer_mcs_number IS NOT NULL
        AND export_capacity_kw IS NOT NULL
        AND site_supply_type IS NOT NULL
        AND inverter_model IS NOT NULL
        AND panel_model IS NOT NULL
        -- FIXED: COALESCE handles NULL dno_required (treats as false)
        AND (COALESCE(dno_required, false) = false OR dno_reference IS NOT NULL)
      THEN 'ready'
      ELSE 'in_progress'
    END as compliance_test
  FROM jobs
) status_calc
GROUP BY tenant_id
LIMIT 5;

-- Test 3: Verify missing fields view query
SELECT
  job_number,
  ARRAY_REMOVE(ARRAY[
    CASE WHEN installer_mcs_number IS NULL THEN 'MCS Certificate Number' END,
    CASE WHEN export_capacity_kw IS NULL THEN 'Export Capacity' END,
    CASE WHEN site_supply_type IS NULL THEN 'Supply Type' END,
    CASE WHEN inverter_model IS NULL THEN 'Inverter Model' END,
    CASE WHEN panel_model IS NULL THEN 'Panel Model' END,
    CASE WHEN dno_required = true AND dno_reference IS NULL THEN 'DNO Reference' END
  ], NULL) as missing_critical_fields,
  ARRAY_LENGTH(ARRAY_REMOVE(ARRAY[
    CASE WHEN installer_mcs_number IS NULL THEN 1 END,
    CASE WHEN export_capacity_kw IS NULL THEN 1 END,
    CASE WHEN site_supply_type IS NULL THEN 1 END,
    CASE WHEN inverter_model IS NULL THEN 1 END,
    CASE WHEN panel_model IS NULL THEN 1 END,
    CASE WHEN dno_required = true AND dno_reference IS NULL THEN 1 END
  ], NULL), 1) as missing_count
FROM jobs
WHERE (
  installer_mcs_number IS NULL OR
  export_capacity_kw IS NULL OR
  site_supply_type IS NULL OR
  inverter_model IS NULL OR
  panel_model IS NULL OR
  (dno_required = true AND dno_reference IS NULL)
)
ORDER BY missing_count DESC NULLS LAST
LIMIT 10;
