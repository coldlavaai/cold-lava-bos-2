-- Workflow/Automation definitions
CREATE TABLE IF NOT EXISTS automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- Trigger config
  trigger_module TEXT NOT NULL, -- 'jobs', 'customers', 'appointments', 'call_recordings'
  trigger_event TEXT NOT NULL, -- 'create', 'update', 'stage_change', 'field_change', 'time_based'
  trigger_conditions JSONB DEFAULT '{}', -- e.g. {"field":"stage","from":"*","to":"Appointment Booked"}
  
  -- Actions (array of actions to execute)
  actions JSONB DEFAULT '[]', -- [{type:"send_email",config:{template:"welcome",to:"customer"}}, {type:"create_task",config:{...}}]
  
  -- Time-based trigger config
  schedule_type TEXT, -- 'delay_after_event', 'specific_time', 'recurring'
  schedule_config JSONB, -- {delay_minutes: 1440, field: "install_date", offset_days: -2}
  
  -- Metadata
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automations_tenant ON automations(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_automations_trigger ON automations(tenant_id, trigger_module, trigger_event);

-- Automation execution log
CREATE TABLE IF NOT EXISTS automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  trigger_entity_id UUID, -- the record that triggered it
  trigger_entity_type TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  actions_executed JSONB DEFAULT '[]',
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_automation_runs ON automation_runs(automation_id, started_at DESC);

-- RLS policies
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;

-- Automations: users can read/write their tenant's automations
CREATE POLICY "automations_tenant_select" ON automations
  FOR SELECT USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY "automations_tenant_insert" ON automations
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY "automations_tenant_update" ON automations
  FOR UPDATE USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY "automations_tenant_delete" ON automations
  FOR DELETE USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Service role bypass for automations
CREATE POLICY "automations_service_role" ON automations
  FOR ALL USING (auth.role() = 'service_role');

-- Automation runs: same tenant isolation
CREATE POLICY "automation_runs_tenant_select" ON automation_runs
  FOR SELECT USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY "automation_runs_tenant_insert" ON automation_runs
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY "automation_runs_service_role" ON automation_runs
  FOR ALL USING (auth.role() = 'service_role');
