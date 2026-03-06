-- ========================================
-- Add generate_job_number function
-- Per 02-DATA-MODEL.md specification
-- ========================================

CREATE OR REPLACE FUNCTION generate_job_number(p_tenant_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_count INTEGER;
  v_prefix VARCHAR(10);
  v_job_number VARCHAR(50);
BEGIN
  -- Get tenant subdomain for prefix (first 3 chars, uppercase)
  SELECT UPPER(SUBSTRING(subdomain, 1, 3)) INTO v_prefix
  FROM tenants WHERE id = p_tenant_id;

  -- If no prefix found, use generic 'JOB'
  IF v_prefix IS NULL THEN
    v_prefix := 'JOB';
  END IF;

  -- Get count of existing jobs for this tenant
  SELECT COUNT(*) INTO v_count
  FROM jobs WHERE tenant_id = p_tenant_id;

  -- Generate number: PREFIX-NNNNNN (6 digits)
  v_job_number := v_prefix || '-' || LPAD((v_count + 1)::TEXT, 6, '0');

  RETURN v_job_number;
END;
$$ LANGUAGE plpgsql;
