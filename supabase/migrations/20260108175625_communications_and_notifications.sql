-- ========================================
-- Solar BOS - Communications & Notifications
-- Messages, Message Accounts, Notifications
-- ========================================

-- ========================================
-- EMAIL ACCOUNTS TABLE
-- ========================================

CREATE TABLE email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Account details
  email_address VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),

  -- Provider
  provider VARCHAR(50) NOT NULL DEFAULT 'sendgrid'
    CHECK (provider IN ('gmail', 'microsoft', 'smtp', 'sendgrid', 'postmark')),

  -- API key (for SendGrid/Postmark)
  api_key TEXT,

  -- Settings
  is_default BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, email_address)
);

CREATE INDEX idx_email_acct_tenant ON email_accounts(tenant_id, is_default);

CREATE TRIGGER email_acct_updated_at BEFORE UPDATE ON email_accounts
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_email_acct ON email_accounts
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ========================================
-- SMS ACCOUNTS TABLE
-- ========================================

CREATE TABLE sms_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Provider
  provider VARCHAR(50) NOT NULL DEFAULT 'twilio'
    CHECK (provider IN ('twilio', 'messagebird', 'vonage')),

  -- Credentials
  account_sid VARCHAR(255),
  auth_token TEXT,

  -- Phone number
  phone_number VARCHAR(20) NOT NULL,

  -- Settings
  is_default BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, phone_number)
);

CREATE INDEX idx_sms_acct_tenant ON sms_accounts(tenant_id, is_default);

CREATE TRIGGER sms_acct_updated_at BEFORE UPDATE ON sms_accounts
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE sms_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_sms_acct ON sms_accounts
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ========================================
-- WHATSAPP ACCOUNTS TABLE
-- ========================================

CREATE TABLE whatsapp_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Provider (Meta Business API)
  phone_number VARCHAR(20) NOT NULL,
  display_name VARCHAR(255),

  -- Credentials
  access_token TEXT NOT NULL,

  -- Settings
  is_default BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, phone_number)
);

CREATE INDEX idx_whatsapp_acct_tenant ON whatsapp_accounts(tenant_id, is_default);

CREATE TRIGGER whatsapp_acct_updated_at BEFORE UPDATE ON whatsapp_accounts
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE whatsapp_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_whatsapp_acct ON whatsapp_accounts
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ========================================
-- MESSAGE THREADS TABLE
-- ========================================

CREATE TABLE message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  customer_id UUID REFERENCES customers(id),

  channel VARCHAR(20) NOT NULL
    CHECK (channel IN ('email', 'sms', 'whatsapp')),

  subject VARCHAR(500),
  last_message_at TIMESTAMPTZ,
  is_read BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_threads_tenant_customer ON message_threads(tenant_id, customer_id, created_at DESC);

ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_threads ON message_threads
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ========================================
-- MESSAGES TABLE
-- ========================================

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  thread_id UUID REFERENCES message_threads(id),

  -- Direction
  direction VARCHAR(10) NOT NULL
    CHECK (direction IN ('inbound', 'outbound')),

  -- Channel
  channel VARCHAR(20) NOT NULL
    CHECK (channel IN ('email', 'sms', 'whatsapp')),

  -- From/To
  sender VARCHAR(255),
  recipient VARCHAR(255),

  -- Content
  body TEXT NOT NULL,

  -- Status
  status VARCHAR(20) DEFAULT 'draft'
    CHECK (status IN ('draft', 'queued', 'sent', 'delivered', 'failed')),

  -- Provider tracking
  external_id VARCHAR(255),  -- Provider message ID
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  -- Audit
  created_by UUID REFERENCES users(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_tenant_thread ON messages(tenant_id, thread_id, created_at);
CREATE INDEX idx_messages_external_id ON messages(external_id) WHERE external_id IS NOT NULL;

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_messages ON messages
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ========================================
-- NOTIFICATION TYPES TABLE (Global)
-- ========================================

CREATE TABLE notification_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Type details
  type_key VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notif_type_key ON notification_types(type_key);

-- No RLS - shared across all tenants

-- ========================================
-- NOTIFICATIONS TABLE
-- ========================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  notification_type_id UUID REFERENCES notification_types(id),

  -- Content
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,

  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notif_tenant_user ON notifications(tenant_id, user_id, created_at DESC);
CREATE INDEX idx_notif_user_unread ON notifications(user_id, created_at DESC)
  WHERE is_read = false;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_notif ON notifications
  FOR ALL
  USING (tenant_id = current_tenant_id() AND user_id = auth.uid())
  WITH CHECK (tenant_id = current_tenant_id() AND user_id = auth.uid());

-- ========================================
-- PUSH SUBSCRIPTIONS TABLE
-- ========================================

CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_push_subs_user ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_push_subs ON push_subscriptions
  FOR ALL
  USING (tenant_id = current_tenant_id() AND user_id = auth.uid())
  WITH CHECK (tenant_id = current_tenant_id() AND user_id = auth.uid());
