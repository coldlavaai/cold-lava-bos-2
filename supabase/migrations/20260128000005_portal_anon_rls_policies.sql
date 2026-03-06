/**
 * Session 109: Portal Anon RLS Policies
 * 
 * These policies were applied manually during Session 108 debugging
 * but were never added to migrations. This ensures they survive DB resets.
 */

-- Allow anon role to SELECT portal_access_tokens (for token validation)
DROP POLICY IF EXISTS "Anon can select portal tokens for validation" ON portal_access_tokens;
CREATE POLICY "Anon can select portal tokens for validation"
  ON portal_access_tokens
  FOR SELECT
  TO anon
  USING (true);

-- Allow anon role to UPDATE portal_access_tokens (to mark as used)
DROP POLICY IF EXISTS "Anon can update portal tokens to mark as used" ON portal_access_tokens;
CREATE POLICY "Anon can update portal tokens to mark as used"
  ON portal_access_tokens
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anon role to INSERT portal_sessions (after token validation)
DROP POLICY IF EXISTS "Anon can create portal sessions" ON portal_sessions;
CREATE POLICY "Anon can create portal sessions"
  ON portal_sessions
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anon role to SELECT portal_sessions (for session validation)
DROP POLICY IF EXISTS "Anon can select portal sessions for validation" ON portal_sessions;
CREATE POLICY "Anon can select portal sessions for validation"
  ON portal_sessions
  FOR SELECT
  TO anon
  USING (true);

-- Allow anon role to DELETE portal_sessions (for logout)
DROP POLICY IF EXISTS "Anon can delete portal sessions for logout" ON portal_sessions;
CREATE POLICY "Anon can delete portal sessions for logout"
  ON portal_sessions
  FOR DELETE
  TO anon
  USING (true);
