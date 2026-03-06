-- Email Integrations: Gmail/Outlook OAuth & Synced Email Storage
-- Run this migration in Supabase SQL Editor
--
-- Table order: email_integrations → email_signatures → email_threads_synced → email_attachments
-- (email_threads_synced references email_signatures, so signatures must be created first)

-- ============================================================================
-- 1. email_integrations - OAuth tokens for Gmail/Outlook
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook', 'office365')),
  email_address TEXT NOT NULL,
  display_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  provider_user_id TEXT,
  scopes TEXT[],
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  sync_cursor TEXT, -- For delta sync (Gmail historyId, Outlook deltaLink)
  sync_from_date TIMESTAMPTZ, -- How far back to sync
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, provider, email_address)
);

CREATE INDEX IF NOT EXISTS idx_email_integrations_tenant ON email_integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_integrations_user ON email_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_email_integrations_active ON email_integrations(tenant_id, is_active);

-- RLS
ALTER TABLE email_integrations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_integrations' AND policyname = 'Users can view their tenant''s email integrations') THEN
    CREATE POLICY "Users can view their tenant's email integrations"
      ON email_integrations FOR SELECT
      USING (tenant_id = current_setting('app.tenant_id')::uuid);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_integrations' AND policyname = 'Users can insert their tenant''s email integrations') THEN
    CREATE POLICY "Users can insert their tenant's email integrations"
      ON email_integrations FOR INSERT
      WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_integrations' AND policyname = 'Users can update their tenant''s email integrations') THEN
    CREATE POLICY "Users can update their tenant's email integrations"
      ON email_integrations FOR UPDATE
      USING (tenant_id = current_setting('app.tenant_id')::uuid);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_integrations' AND policyname = 'Users can delete their tenant''s email integrations') THEN
    CREATE POLICY "Users can delete their tenant's email integrations"
      ON email_integrations FOR DELETE
      USING (tenant_id = current_setting('app.tenant_id')::uuid);
  END IF;
END $$;

-- Service role bypass policy (needed for API routes using createAdminClient)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_integrations' AND policyname = 'Service role full access to email_integrations') THEN
    CREATE POLICY "Service role full access to email_integrations"
      ON email_integrations FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================================================
-- 2. email_signatures - User email signatures
--    (Must be created BEFORE email_threads_synced which references it)
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  is_default BOOLEAN DEFAULT false,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'gmail', 'outlook')),
  integration_id UUID REFERENCES email_integrations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_signatures_tenant ON email_signatures(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_signatures_user ON email_signatures(user_id);
CREATE INDEX IF NOT EXISTS idx_email_signatures_default ON email_signatures(tenant_id, user_id, is_default) WHERE is_default = true;

-- RLS
ALTER TABLE email_signatures ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_signatures' AND policyname = 'Users can view their tenant''s signatures') THEN
    CREATE POLICY "Users can view their tenant's signatures"
      ON email_signatures FOR SELECT
      USING (tenant_id = current_setting('app.tenant_id')::uuid);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_signatures' AND policyname = 'Users can insert their tenant''s signatures') THEN
    CREATE POLICY "Users can insert their tenant's signatures"
      ON email_signatures FOR INSERT
      WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_signatures' AND policyname = 'Users can update their tenant''s signatures') THEN
    CREATE POLICY "Users can update their tenant's signatures"
      ON email_signatures FOR UPDATE
      USING (tenant_id = current_setting('app.tenant_id')::uuid);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_signatures' AND policyname = 'Users can delete their tenant''s signatures') THEN
    CREATE POLICY "Users can delete their tenant's signatures"
      ON email_signatures FOR DELETE
      USING (tenant_id = current_setting('app.tenant_id')::uuid);
  END IF;
END $$;

-- Service role bypass
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_signatures' AND policyname = 'Service role full access to email_signatures') THEN
    CREATE POLICY "Service role full access to email_signatures"
      ON email_signatures FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================================================
-- 3. email_threads_synced - Synced emails from Gmail/Outlook
--    (References email_signatures which is now created above)
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_threads_synced (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES email_integrations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

  -- Provider details
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook', 'office365')),
  provider_message_id TEXT NOT NULL, -- Gmail: message ID, Outlook: message ID, "sent-{timestamp}" for placeholders
  provider_thread_id TEXT, -- Gmail: thread ID, Outlook: conversation ID

  -- Email metadata
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_emails TEXT[] NOT NULL,
  cc_emails TEXT[],
  bcc_emails TEXT[],
  subject TEXT,
  body_text TEXT,
  body_html TEXT,

  -- Direction & status
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  is_read BOOLEAN DEFAULT false,
  is_sent BOOLEAN DEFAULT false,
  is_draft BOOLEAN DEFAULT false,

  -- Timestamps
  received_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,

  -- Signature tracking (for sent emails)
  signature_id UUID REFERENCES email_signatures(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, provider, provider_message_id)
);

CREATE INDEX IF NOT EXISTS idx_email_threads_tenant ON email_threads_synced(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_customer ON email_threads_synced(customer_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_integration ON email_threads_synced(integration_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_provider_msg ON email_threads_synced(provider, provider_message_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_direction ON email_threads_synced(tenant_id, direction);
CREATE INDEX IF NOT EXISTS idx_email_threads_sent_at ON email_threads_synced(sent_at DESC) WHERE sent_at IS NOT NULL;

-- RLS
ALTER TABLE email_threads_synced ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_threads_synced' AND policyname = 'Users can view their tenant''s synced emails') THEN
    CREATE POLICY "Users can view their tenant's synced emails"
      ON email_threads_synced FOR SELECT
      USING (tenant_id = current_setting('app.tenant_id')::uuid);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_threads_synced' AND policyname = 'Users can insert their tenant''s synced emails') THEN
    CREATE POLICY "Users can insert their tenant's synced emails"
      ON email_threads_synced FOR INSERT
      WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_threads_synced' AND policyname = 'Users can update their tenant''s synced emails') THEN
    CREATE POLICY "Users can update their tenant's synced emails"
      ON email_threads_synced FOR UPDATE
      USING (tenant_id = current_setting('app.tenant_id')::uuid);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_threads_synced' AND policyname = 'Users can delete their tenant''s synced emails') THEN
    CREATE POLICY "Users can delete their tenant's synced emails"
      ON email_threads_synced FOR DELETE
      USING (tenant_id = current_setting('app.tenant_id')::uuid);
  END IF;
END $$;

-- Service role bypass
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_threads_synced' AND policyname = 'Service role full access to email_threads_synced') THEN
    CREATE POLICY "Service role full access to email_threads_synced"
      ON email_threads_synced FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================================================
-- 4. email_attachments - Email attachment metadata
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email_thread_id UUID NOT NULL REFERENCES email_threads_synced(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  storage_path TEXT NOT NULL, -- Path in Supabase Storage (bucket: customer-files or email-attachments)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_attachments_tenant ON email_attachments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_attachments_thread ON email_attachments(email_thread_id);

-- RLS
ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_attachments' AND policyname = 'Users can view their tenant''s email attachments') THEN
    CREATE POLICY "Users can view their tenant's email attachments"
      ON email_attachments FOR SELECT
      USING (tenant_id = current_setting('app.tenant_id')::uuid);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_attachments' AND policyname = 'Users can insert their tenant''s email attachments') THEN
    CREATE POLICY "Users can insert their tenant's email attachments"
      ON email_attachments FOR INSERT
      WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_attachments' AND policyname = 'Users can delete their tenant''s email attachments') THEN
    CREATE POLICY "Users can delete their tenant's email attachments"
      ON email_attachments FOR DELETE
      USING (tenant_id = current_setting('app.tenant_id')::uuid);
  END IF;
END $$;

-- Service role bypass
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_attachments' AND policyname = 'Service role full access to email_attachments') THEN
    CREATE POLICY "Service role full access to email_attachments"
      ON email_attachments FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================================================
-- 5. Enable Realtime for email_threads_synced
-- ============================================================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE email_threads_synced;
EXCEPTION WHEN duplicate_object THEN
  -- Table already in publication, ignore
  NULL;
END $$;

-- ============================================================================
-- 6. Updated_at trigger for email tables
-- ============================================================================
CREATE OR REPLACE FUNCTION update_email_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'email_integrations_updated_at') THEN
    CREATE TRIGGER email_integrations_updated_at
      BEFORE UPDATE ON email_integrations
      FOR EACH ROW
      EXECUTE FUNCTION update_email_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'email_threads_synced_updated_at') THEN
    CREATE TRIGGER email_threads_synced_updated_at
      BEFORE UPDATE ON email_threads_synced
      FOR EACH ROW
      EXECUTE FUNCTION update_email_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'email_signatures_updated_at') THEN
    CREATE TRIGGER email_signatures_updated_at
      BEFORE UPDATE ON email_signatures
      FOR EACH ROW
      EXECUTE FUNCTION update_email_updated_at();
  END IF;
END $$;
