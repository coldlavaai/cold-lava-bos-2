-- Create integration_connections table for multi-tenant credential storage
-- Based on INTEGRATIONS-MANAGEMENT-PLAN.md

CREATE TABLE integration_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Integration identification
  integration_type TEXT NOT NULL, -- 'opensolar', 'twilio', 'sendgrid', 'gmail', 'outlook', 'smtp', etc.
  name TEXT, -- Optional custom name e.g., "Main Twilio Account"

  -- Credentials (stored as JSONB for flexibility, should be encrypted at rest)
  credentials JSONB NOT NULL DEFAULT '{}',

  -- OAuth specific fields (for future OAuth integrations like Gmail, Outlook, Google Calendar)
  oauth_access_token TEXT,
  oauth_refresh_token TEXT,
  oauth_expires_at TIMESTAMPTZ,
  oauth_scopes TEXT[],

  -- Connection metadata
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_verified_at TIMESTAMPTZ,
  last_error TEXT,

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT unique_tenant_integration UNIQUE (tenant_id, integration_type)
);

-- Add comment explaining the table
COMMENT ON TABLE integration_connections IS 'Stores multi-tenant integration credentials and OAuth tokens for third-party services';

-- RLS Policies
ALTER TABLE integration_connections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their tenant's integrations" ON integration_connections;
DROP POLICY IF EXISTS "Admins can manage their tenant's integrations" ON integration_connections;

-- Policy: Users can view their tenant's integrations
CREATE POLICY "Users can view their tenant's integrations"
  ON integration_connections FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- Policy: Admins can manage their tenant's integrations
CREATE POLICY "Admins can manage their tenant's integrations"
  ON integration_connections FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Indexes for performance
CREATE INDEX idx_integration_connections_tenant ON integration_connections(tenant_id);
CREATE INDEX idx_integration_connections_type ON integration_connections(integration_type);
CREATE INDEX idx_integration_connections_active ON integration_connections(is_active) WHERE is_active = true;
