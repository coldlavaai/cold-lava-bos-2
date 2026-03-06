-- Session 99: DBR (Database Reactivation) Schema
-- Creates tables for DBR campaigns, leads, and extends messages for DBR tracking
-- Based on docs/02-DATA-MODEL.md Section "DBR (Database Reactivation)"

-- 1. DBR Campaigns Table
CREATE TABLE dbr_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Identity
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'running', 'paused', 'completed', 'archived')),

  -- Multi-channel configuration
  channel VARCHAR(20) NOT NULL DEFAULT 'sms'
    CHECK (channel IN ('sms', 'email', 'whatsapp')),

  -- Messaging configuration (SMS-specific for now)
  sms_account_id UUID,  -- Will reference sms_accounts when that table exists
  twilio_phone_override VARCHAR(20),
  calcom_link TEXT,

  -- Automation timing (in hours)
  message_delays JSONB DEFAULT '{}'::JSONB,
  -- Example:
  -- {
  --   "m1_to_m2_hours": 24,
  --   "m2_to_m3_hours": 48,
  --   "m3_to_dead_hours": 48
  -- }

  -- Rate limiting
  rate_limit_per_interval INTEGER DEFAULT 10,
  rate_limit_interval_seconds INTEGER DEFAULT 600,

  -- Working hours (local to installer)
  working_hours JSONB,
  -- Example:
  -- {
  --   "start": 9,
  --   "end": 17,
  --   "days": [1,2,3,4,5]
  -- }

  -- Source / segmentation
  source_type VARCHAR(20) DEFAULT 'manual'
    CHECK (source_type IN ('csv', 'manual', 'crm_segment')),
  source_details JSONB DEFAULT '{}'::JSONB,

  -- Metrics snapshot (for fast dashboard queries)
  total_contacts INTEGER DEFAULT 0,
  active_contacts INTEGER DEFAULT 0,
  replied_contacts INTEGER DEFAULT 0,
  call_booked_contacts INTEGER DEFAULT 0,
  installed_contacts INTEGER DEFAULT 0,
  reply_rate NUMERIC(5,2),
  call_booking_rate NUMERIC(5,2),

  -- Scheduling
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,

  -- Optimistic locking
  version INTEGER DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes (tenant_id FIRST)
CREATE INDEX idx_dbr_campaigns_tenant_status
  ON dbr_campaigns(tenant_id, status, created_at DESC);

CREATE INDEX idx_dbr_campaigns_tenant_active
  ON dbr_campaigns(tenant_id, id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_dbr_campaigns_tenant_channel
  ON dbr_campaigns(tenant_id, channel, status)
  WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE dbr_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_dbr_campaigns ON dbr_campaigns;
DROP POLICY IF EXISTS super_admin_bypass_dbr_campaigns ON dbr_campaigns;

CREATE POLICY tenant_isolation_dbr_campaigns ON dbr_campaigns
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY super_admin_bypass_dbr_campaigns ON dbr_campaigns
  FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Trigger for updated_at
CREATE TRIGGER dbr_campaigns_updated_at
  BEFORE UPDATE ON dbr_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

-- 2. DBR Campaign Customers Table (Leads)
CREATE TABLE dbr_campaign_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  campaign_id UUID NOT NULL REFERENCES dbr_campaigns(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Denormalized snapshot of contact details at import time
  customer_name TEXT,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  postcode VARCHAR(10),

  -- Two-field DBR status
  message_stage VARCHAR(20) NOT NULL DEFAULT 'Ready'
    CHECK (message_stage IN (
      'Ready',
      'M1_sent',
      'M2_sent',
      'M3_sent',
      'In_conversation',
      'Ended'
    )),

  contact_status VARCHAR(20) NOT NULL DEFAULT 'NEUTRAL'
    CHECK (contact_status IN (
      'NEUTRAL',
      'HOT',
      'WARM',
      'COLD',
      'CALL_BOOKED',
      'INSTALLED',
      'DEAD',
      'REMOVED',
      'BAD_NUMBER'
    )),

  -- Outcome tracking
  outcome VARCHAR(20)
    CHECK (outcome IN ('WON', 'LOST', 'ARCHIVED')),
  outcome_reason TEXT,
  outcome_notes TEXT,
  moved_to_history_at TIMESTAMPTZ,

  -- Automation control
  manual_mode BOOLEAN DEFAULT FALSE,

  -- Timeline
  m1_sent_at TIMESTAMPTZ,
  m2_sent_at TIMESTAMPTZ,
  m3_sent_at TIMESTAMPTZ,
  first_reply_at TIMESTAMPTZ,
  latest_reply_at TIMESTAMPTZ,
  call_booked_at TIMESTAMPTZ,
  call_scheduled_at TIMESTAMPTZ,
  last_called_at TIMESTAMPTZ,

  -- Priority & call workflow
  priority_score INTEGER DEFAULT 50
    CHECK (priority_score BETWEEN 0 AND 100),
  priority_updated_at TIMESTAMPTZ,
  last_call_outcome VARCHAR(30)
    CHECK (last_call_outcome IN (
      'answered',
      'no_answer',
      'voicemail',
      'wrong_number',
      'callback_requested'
    )),
  call_count INTEGER DEFAULT 0,
  call_prep_notes TEXT,

  -- Conversation summary for AI
  conversation_history TEXT,
  latest_reply TEXT,

  -- Flags
  archived BOOLEAN DEFAULT FALSE,

  -- Optimistic locking
  version INTEGER DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes (tenant_id FIRST)
CREATE INDEX idx_dbr_leads_tenant_campaign_stage
  ON dbr_campaign_customers(tenant_id, campaign_id, message_stage)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_dbr_leads_tenant_campaign_status
  ON dbr_campaign_customers(tenant_id, campaign_id, contact_status)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_dbr_leads_tenant_campaign_priority
  ON dbr_campaign_customers(tenant_id, campaign_id, priority_score DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_dbr_leads_tenant_phone
  ON dbr_campaign_customers(tenant_id, phone)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_dbr_leads_tenant_campaign_active
  ON dbr_campaign_customers(tenant_id, campaign_id, id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_dbr_leads_customer
  ON dbr_campaign_customers(customer_id, campaign_id)
  WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE dbr_campaign_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_dbr_leads ON dbr_campaign_customers;
DROP POLICY IF EXISTS super_admin_bypass_dbr_leads ON dbr_campaign_customers;

CREATE POLICY tenant_isolation_dbr_leads ON dbr_campaign_customers
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY super_admin_bypass_dbr_leads ON dbr_campaign_customers
  FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Trigger for updated_at
CREATE TRIGGER dbr_leads_updated_at
  BEFORE UPDATE ON dbr_campaign_customers
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

-- 3. Extend Messages Table for DBR Tracking
-- Add DBR foreign keys to existing messages table
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS dbr_campaign_id UUID REFERENCES dbr_campaigns(id),
  ADD COLUMN IF NOT EXISTS dbr_campaign_customer_id UUID REFERENCES dbr_campaign_customers(id);

-- Indexes for DBR message lookups
CREATE INDEX IF NOT EXISTS idx_msg_dbr_campaign
  ON messages(tenant_id, dbr_campaign_id, created_at DESC)
  WHERE dbr_campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_msg_dbr_lead
  ON messages(tenant_id, dbr_campaign_customer_id, created_at DESC)
  WHERE dbr_campaign_customer_id IS NOT NULL;

-- Comment for documentation
COMMENT ON TABLE dbr_campaigns IS 'DBR (Database Reactivation) campaigns for SMS/email/WhatsApp outreach';
COMMENT ON TABLE dbr_campaign_customers IS 'DBR leads (campaign-specific customer state)';
COMMENT ON COLUMN messages.dbr_campaign_id IS 'Links message to DBR campaign for tracking and analytics';
COMMENT ON COLUMN messages.dbr_campaign_customer_id IS 'Links message to specific DBR lead for conversation tracking';
