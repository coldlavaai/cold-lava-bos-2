-- Session 109: Automation Rules Tables
-- automation_rules: Define event-driven automations
-- automation_executions: Track rule executions

-- Automation Rules table
CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Trigger configuration
  trigger_event TEXT NOT NULL, -- e.g., "job.created", "quote.accepted", "appointment.scheduled"
  trigger_conditions JSONB DEFAULT '{}', -- Additional conditions to evaluate
  
  -- Actions to execute
  actions JSONB NOT NULL DEFAULT '[]', -- Array of action definitions
  
  -- Status and stats
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_executed_at TIMESTAMPTZ,
  total_executions INTEGER NOT NULL DEFAULT 0,
  successful_executions INTEGER NOT NULL DEFAULT 0,
  failed_executions INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT automation_rules_name_tenant_unique UNIQUE (tenant_id, name, deleted_at)
);

-- Automation Executions table
CREATE TABLE IF NOT EXISTS automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  automation_rule_id UUID NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
  
  -- Trigger info
  triggered_by_event TEXT NOT NULL,
  trigger_data JSONB, -- The data that triggered the rule
  trigger_entity_id UUID, -- ID of the entity that triggered (job, customer, etc.)
  trigger_entity_type TEXT, -- Type of entity
  
  -- Execution status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Results
  actions_executed INTEGER NOT NULL DEFAULT 0,
  actions_failed INTEGER NOT NULL DEFAULT 0,
  execution_log JSONB DEFAULT '[]', -- Detailed log of each action
  error_message TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI Prompt Logs (for tracking AI usage and debugging)
CREATE TABLE IF NOT EXISTS ai_prompt_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Request info
  prompt_type TEXT NOT NULL CHECK (prompt_type IN ('assistant_query', 'content_generation', 'action_execution')),
  prompt_text TEXT NOT NULL,
  context_data JSONB,
  
  -- Response info
  response_text TEXT,
  response_data JSONB, -- Full structured response
  
  -- Usage tracking
  model_used TEXT,
  tokens_input INTEGER,
  tokens_output INTEGER,
  latency_ms INTEGER,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_automation_rules_tenant_active 
  ON automation_rules(tenant_id, is_active) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger_event 
  ON automation_rules(trigger_event) WHERE is_active = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_automation_executions_rule 
  ON automation_executions(automation_rule_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_automation_executions_tenant_status 
  ON automation_executions(tenant_id, status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_prompt_logs_tenant 
  ON ai_prompt_logs(tenant_id, created_at DESC);

-- RLS Policies
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompt_logs ENABLE ROW LEVEL SECURITY;

-- Automation Rules policies
CREATE POLICY automation_rules_tenant_isolation ON automation_rules
  FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY automation_rules_select_own ON automation_rules
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY automation_rules_insert_own ON automation_rules
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY automation_rules_update_own ON automation_rules
  FOR UPDATE USING (tenant_id = current_tenant_id());

CREATE POLICY automation_rules_delete_own ON automation_rules
  FOR DELETE USING (tenant_id = current_tenant_id());

-- Automation Executions policies
CREATE POLICY automation_executions_tenant_isolation ON automation_executions
  FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY automation_executions_select_own ON automation_executions
  FOR SELECT USING (tenant_id = current_tenant_id());

-- AI Prompt Logs policies (read-only for users, system writes)
CREATE POLICY ai_prompt_logs_select_own ON ai_prompt_logs
  FOR SELECT USING (tenant_id = current_tenant_id());

-- Triggers for updated_at
CREATE TRIGGER set_automation_rules_updated_at
  BEFORE UPDATE ON automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE automation_rules IS 'Event-driven automation rules with triggers and actions';
COMMENT ON TABLE automation_executions IS 'Execution history for automation rules';
COMMENT ON TABLE ai_prompt_logs IS 'AI prompt/response logs for debugging and usage tracking';

COMMENT ON COLUMN automation_rules.trigger_event IS 'Event that triggers this rule (e.g., job.created, quote.accepted)';
COMMENT ON COLUMN automation_rules.trigger_conditions IS 'Additional JSON conditions to evaluate before executing';
COMMENT ON COLUMN automation_rules.actions IS 'Array of action definitions to execute';
