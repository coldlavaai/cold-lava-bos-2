-- ============================================
-- PIPELINES SYSTEM
-- Solar BOS - Multi-Pipeline Support
-- Date: 2026-02-05
-- ============================================

-- Pipelines table
CREATE TABLE IF NOT EXISTS pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  -- Pipeline stages as JSON array (allows customization per pipeline)
  stages JSONB DEFAULT '[
    {"id": "lead", "name": "New Lead", "order": 1},
    {"id": "contacted", "name": "Contacted", "order": 2},
    {"id": "survey_scheduled", "name": "Survey Booked", "order": 3},
    {"id": "quoted", "name": "Quoted", "order": 4},
    {"id": "won", "name": "Won", "order": 5}
  ]'::jsonb,
  color VARCHAR(7) DEFAULT '#f59e0b', -- Amber default
  is_default BOOLEAN DEFAULT false, -- Default pipeline for new jobs
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, name)
);

-- Pipeline members (who has access to each pipeline)
CREATE TABLE IF NOT EXISTS pipeline_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member', -- 'owner', 'member'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(pipeline_id, user_id)
);

-- Add pipeline_id to jobs table
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS pipeline_id UUID REFERENCES pipelines(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pipelines_tenant ON pipelines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_members_pipeline ON pipeline_members(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_members_user ON pipeline_members(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_pipeline ON jobs(pipeline_id);

-- RLS Policies
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_members ENABLE ROW LEVEL SECURITY;

-- Pipelines: Users can see pipelines they're members of (or admins see all in tenant)
CREATE POLICY pipelines_select ON pipelines FOR SELECT TO authenticated
USING (
  tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  AND (
    -- Admin sees all pipelines in tenant
    EXISTS (SELECT 1 FROM tenant_users WHERE user_id = auth.uid() AND tenant_id = pipelines.tenant_id AND role = 'admin')
    OR
    -- Member sees pipelines they have access to
    EXISTS (SELECT 1 FROM pipeline_members WHERE pipeline_id = pipelines.id AND user_id = auth.uid())
  )
);

-- Only admins can create/update/delete pipelines
CREATE POLICY pipelines_insert ON pipelines FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM tenant_users WHERE user_id = auth.uid() AND tenant_id = pipelines.tenant_id AND role = 'admin')
);

CREATE POLICY pipelines_update ON pipelines FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM tenant_users WHERE user_id = auth.uid() AND tenant_id = pipelines.tenant_id AND role = 'admin')
);

CREATE POLICY pipelines_delete ON pipelines FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM tenant_users WHERE user_id = auth.uid() AND tenant_id = pipelines.tenant_id AND role = 'admin')
);

-- Pipeline members: Similar rules
CREATE POLICY pipeline_members_select ON pipeline_members FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM pipelines p 
    JOIN tenant_users tu ON tu.tenant_id = p.tenant_id 
    WHERE p.id = pipeline_members.pipeline_id AND tu.user_id = auth.uid()
  )
);

CREATE POLICY pipeline_members_insert ON pipeline_members FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM pipelines p 
    JOIN tenant_users tu ON tu.tenant_id = p.tenant_id 
    WHERE p.id = pipeline_members.pipeline_id AND tu.user_id = auth.uid() AND tu.role = 'admin'
  )
);

CREATE POLICY pipeline_members_delete ON pipeline_members FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM pipelines p 
    JOIN tenant_users tu ON tu.tenant_id = p.tenant_id 
    WHERE p.id = pipeline_members.pipeline_id AND tu.user_id = auth.uid() AND tu.role = 'admin'
  )
);

-- Trigger for updated_at
CREATE TRIGGER trigger_pipelines_updated_at
  BEFORE UPDATE ON pipelines
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

COMMENT ON TABLE pipelines IS 'Named pipelines that can be assigned to team members';
COMMENT ON TABLE pipeline_members IS 'Which users have access to which pipelines';
