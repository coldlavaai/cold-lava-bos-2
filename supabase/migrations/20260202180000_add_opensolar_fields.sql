-- Add OpenSolar integration fields to jobs table
-- These fields link a Solar BOS job to an OpenSolar project

-- Add opensolar_project_id column
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS opensolar_project_id TEXT;

-- Add opensolar_share_link column (proposal URL)
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS opensolar_share_link TEXT;

-- Add source column to track where job came from
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_jobs_opensolar_project_id 
ON jobs(opensolar_project_id) 
WHERE opensolar_project_id IS NOT NULL;

-- Create unique constraint to prevent duplicate imports
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_tenant_opensolar_unique 
ON jobs(tenant_id, opensolar_project_id) 
WHERE opensolar_project_id IS NOT NULL;

-- Comment the columns
COMMENT ON COLUMN jobs.opensolar_project_id IS 'OpenSolar project ID for imported jobs';
COMMENT ON COLUMN jobs.opensolar_share_link IS 'OpenSolar proposal share link';
COMMENT ON COLUMN jobs.source IS 'Source of job: manual, opensolar_import, lead_form, etc.';
