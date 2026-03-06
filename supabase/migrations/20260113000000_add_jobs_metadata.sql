-- Add metadata JSONB column to jobs table
-- Session 64 - OpenSolar Phase 1
-- Stores extensible integration data (OpenSolar, future integrations)

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add index for metadata queries (e.g. finding jobs by opensolar_project_id)
CREATE INDEX IF NOT EXISTS idx_jobs_metadata ON jobs USING GIN (metadata);

-- Add comment for documentation
COMMENT ON COLUMN jobs.metadata IS 'Extensible JSON field for integration data (OpenSolar project IDs, etc.)';
