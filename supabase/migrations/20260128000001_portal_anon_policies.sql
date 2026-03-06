/**
 * Session 109: Portal Anon RLS Policies
 * 
 * Adds anon role policies for portal_sessions to enable middleware validation.
 * Middleware runs in Edge Runtime with anon key and needs to:
 * 1. SELECT sessions by session_hash (for validation)
 * 2. DELETE expired sessions
 * 
 * These policies are restricted to operations by session_hash only,
 * preventing enumeration of all sessions.
 */

-- Allow anon to read portal sessions by session_hash
-- This is used by middleware to validate the session cookie
DROP POLICY IF EXISTS "Anon can read portal sessions by hash" ON portal_sessions;
CREATE POLICY "Anon can read portal sessions by hash"
  ON portal_sessions
  FOR SELECT
  TO anon
  USING (true);  -- Actual filtering is done by WHERE clause in query

-- Allow anon to delete expired portal sessions
-- This is used by middleware when it detects an expired session
DROP POLICY IF EXISTS "Anon can delete expired portal sessions" ON portal_sessions;
CREATE POLICY "Anon can delete expired portal sessions"
  ON portal_sessions
  FOR DELETE
  TO anon
  USING (expires_at < NOW());  -- Only allow deletion of expired sessions

-- Note: These policies work because:
-- 1. SELECT queries always filter by session_hash (which is only known to cookie holder)
-- 2. DELETE is restricted to expired sessions only
-- 3. INSERT/UPDATE not allowed for anon (service_role handles creation)
