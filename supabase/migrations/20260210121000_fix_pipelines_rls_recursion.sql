-- Fix infinite recursion in pipelines/pipeline_members RLS policies
-- Problem: pipelines_select references pipeline_members, which references pipelines

-- Step 1: Create a SECURITY DEFINER helper function to bypass RLS
-- This function looks up the tenant_id for a pipeline without triggering pipelines RLS
CREATE OR REPLACE FUNCTION get_pipeline_tenant_id(p_pipeline_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT tenant_id FROM pipelines WHERE id = p_pipeline_id;
$$;

-- Step 2: Drop the recursive policies
DROP POLICY IF EXISTS "pipelines_select" ON pipelines;
DROP POLICY IF EXISTS "pipeline_members_select" ON pipeline_members;
DROP POLICY IF EXISTS "pipeline_members_delete" ON pipeline_members;
DROP POLICY IF EXISTS "pipeline_members_insert" ON pipeline_members;

-- Step 3: Recreate pipelines SELECT policy - simple tenant check, no pipeline_members reference
CREATE POLICY "pipelines_select" ON pipelines
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_users.tenant_id FROM tenant_users
      WHERE tenant_users.user_id = auth.uid()
    )
  );

-- Step 4: Recreate pipeline_members policies using the SECURITY DEFINER function
CREATE POLICY "pipeline_members_select" ON pipeline_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
      AND tu.tenant_id = get_pipeline_tenant_id(pipeline_members.pipeline_id)
    )
  );

CREATE POLICY "pipeline_members_insert" ON pipeline_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
      AND tu.role = 'admin'
      AND tu.tenant_id = get_pipeline_tenant_id(pipeline_members.pipeline_id)
    )
  );

CREATE POLICY "pipeline_members_delete" ON pipeline_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
      AND tu.role = 'admin'
      AND tu.tenant_id = get_pipeline_tenant_id(pipeline_members.pipeline_id)
    )
  );
