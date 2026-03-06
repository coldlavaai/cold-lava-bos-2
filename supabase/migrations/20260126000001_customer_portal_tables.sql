/**
 * Session 102: Customer Portal Tables
 * Creates portal_access_tokens and portal_sessions tables for magic-link authentication
 */

-- Portal Access Tokens Table
-- One-time tokens for magic-link access
CREATE TABLE IF NOT EXISTS portal_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL, -- Hashed token for security
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ, -- NULL until redeemed, then set to redemption time
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for portal_access_tokens
CREATE INDEX IF NOT EXISTS idx_portal_access_tokens_tenant_id ON portal_access_tokens(tenant_id);
CREATE INDEX IF NOT EXISTS idx_portal_access_tokens_customer_id ON portal_access_tokens(customer_id);
CREATE INDEX IF NOT EXISTS idx_portal_access_tokens_token_hash ON portal_access_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_portal_access_tokens_expires_at ON portal_access_tokens(expires_at);

-- Portal Sessions Table
-- Longer-lived sessions after token redemption
CREATE TABLE IF NOT EXISTS portal_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  session_hash TEXT NOT NULL UNIQUE, -- Hashed session token stored in cookie
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ -- Track last activity for session expiration
);

-- Indexes for portal_sessions
CREATE INDEX IF NOT EXISTS idx_portal_sessions_tenant_id ON portal_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_customer_id ON portal_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_session_hash ON portal_sessions(session_hash);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_expires_at ON portal_sessions(expires_at);

-- Enable RLS on portal tables
ALTER TABLE portal_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for portal_access_tokens
-- Service role can do anything (for backend token generation/redemption)
CREATE POLICY "Service role has full access to portal_access_tokens"
  ON portal_access_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users (installers) can create tokens for their tenant's customers
CREATE POLICY "Users can create portal tokens for their tenant's customers"
  ON portal_access_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

-- Authenticated users can view tokens for their tenant's customers
CREATE POLICY "Users can view portal tokens for their tenant's customers"
  ON portal_access_tokens
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for portal_sessions
-- Service role has full access (for backend session validation)
CREATE POLICY "Service role has full access to portal_sessions"
  ON portal_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Portal sessions are managed server-side only, no direct user access needed
-- (Access is validated via session hash in cookie, not via Supabase auth)

-- Updated_at trigger for portal_access_tokens
CREATE TRIGGER update_portal_access_tokens_updated_at
  BEFORE UPDATE ON portal_access_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Updated_at trigger for portal_sessions
CREATE TRIGGER update_portal_sessions_updated_at
  BEFORE UPDATE ON portal_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE portal_access_tokens IS 'One-time magic-link tokens for customer portal access';
COMMENT ON TABLE portal_sessions IS 'Customer portal sessions created after token redemption';
COMMENT ON COLUMN portal_access_tokens.token_hash IS 'SHA-256 hash of the raw token sent in magic link';
COMMENT ON COLUMN portal_access_tokens.used_at IS 'Timestamp when token was redeemed (NULL = not yet used)';
COMMENT ON COLUMN portal_sessions.session_hash IS 'SHA-256 hash of the session token stored in HTTP-only cookie';
COMMENT ON COLUMN portal_sessions.last_activity_at IS 'Last time the session was used, for activity-based expiration';
