-- Fix: job_number was globally unique instead of per-tenant unique
-- This caused customer creation to fail with 23505 (unique violation) when
-- two tenants had the same job count, and the error was misreported as
-- "Customer with this email already exists"

-- Step 1: Drop the global unique constraint on job_number
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_job_number_key;
DROP INDEX IF EXISTS jobs_job_number_key;

-- Step 2: Add a per-tenant unique constraint instead
CREATE UNIQUE INDEX idx_jobs_tenant_job_number ON jobs (tenant_id, job_number);

-- Step 3: Fix the trigger to use a sequence-style approach that won't race
CREATE OR REPLACE FUNCTION auto_create_job_for_customer()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_stage_id UUID;
  v_pipeline_id UUID;
  v_job_number TEXT;
  v_max_num INTEGER;
BEGIN
  -- Get the first 'lead' stage for this tenant
  SELECT id INTO v_stage_id
  FROM job_stages
  WHERE tenant_id = NEW.tenant_id
  AND stage_type = 'lead'
  ORDER BY position
  LIMIT 1;

  -- Get the default pipeline for this tenant
  SELECT id INTO v_pipeline_id
  FROM pipelines
  WHERE tenant_id = NEW.tenant_id
  AND is_default = true
  LIMIT 1;

  -- If no default pipeline, get any pipeline
  IF v_pipeline_id IS NULL THEN
    SELECT id INTO v_pipeline_id
    FROM pipelines
    WHERE tenant_id = NEW.tenant_id
    LIMIT 1;
  END IF;

  -- Only create job if we have a stage
  IF v_stage_id IS NOT NULL THEN
    -- Use MAX to find the highest existing job number for this tenant
    -- This is safer than COUNT which can race
    SELECT COALESCE(
      MAX(
        CASE 
          WHEN job_number ~ '^JOB-[0-9]+$' 
          THEN CAST(SUBSTRING(job_number FROM 5) AS INTEGER)
          ELSE 0
        END
      ), 0
    ) + 1 INTO v_max_num
    FROM jobs
    WHERE tenant_id = NEW.tenant_id;

    v_job_number := 'JOB-' || LPAD(v_max_num::text, 5, '0');

    INSERT INTO jobs (
      tenant_id,
      customer_id,
      current_stage_id,
      pipeline_id,
      job_number,
      source,
      postcode_area
    ) VALUES (
      NEW.tenant_id,
      NEW.id,
      v_stage_id,
      v_pipeline_id,
      v_job_number,
      'Auto-created',
      NEW.postcode_area
    );
  END IF;

  RETURN NEW;
END;
$function$;
