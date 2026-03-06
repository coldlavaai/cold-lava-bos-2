-- ============================================
-- Session 110: Fix trigger function references and analytics RLS
-- Date: 2026-02-04
-- Context: Migrations 20260126000001, 20260126000002, 20260126000003 had bugs
-- ============================================

-- ============================================
-- PART 1: Fix Portal Triggers
-- ============================================

-- Drop broken triggers (they reference update_updated_at_column which doesn't exist)
DROP TRIGGER IF EXISTS set_portal_access_tokens_updated_at ON portal_access_tokens;
DROP TRIGGER IF EXISTS set_portal_sessions_updated_at ON portal_sessions;

-- Recreate with correct function name
CREATE TRIGGER set_portal_access_tokens_updated_at
  BEFORE UPDATE ON portal_access_tokens
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_portal_sessions_updated_at
  BEFORE UPDATE ON portal_sessions
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================
-- PART 2: Fix Reviews Trigger
-- ============================================

DROP TRIGGER IF EXISTS set_reviews_updated_at ON reviews;

CREATE TRIGGER set_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================
-- PART 3: Fix Analytics RLS Policy
-- ============================================

-- The original policy referenced users.is_super_admin column
-- but super admin check is done via is_super_admin() function

-- First, check if the problematic policy exists and drop it
DO $$
BEGIN
  -- Drop policies that might reference the wrong column
  DROP POLICY IF EXISTS "Platform admins can view all analytics" ON analytics.tenant_daily_stats;
  DROP POLICY IF EXISTS "Platform admins can view all stats" ON analytics.tenant_daily_stats;
EXCEPTION WHEN OTHERS THEN
  -- Policy might not exist, continue
  NULL;
END $$;

-- Recreate with correct function call
-- Only create if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'analytics' AND table_name = 'tenant_daily_stats') THEN
    CREATE POLICY "Platform admins can view all analytics"
      ON analytics.tenant_daily_stats
      FOR SELECT
      USING (is_super_admin());
  END IF;
END $$;

-- ============================================
-- PART 4: Additional RLS Hardening
-- ============================================

-- Remove EXECUTE grant on set_tenant_context() for anon role if it exists
DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION set_tenant_context(uuid) FROM anon;
EXCEPTION WHEN OTHERS THEN
  -- Function might not exist or grant might not exist
  NULL;
END $$;

-- ============================================
-- Verification queries (run manually to confirm)
-- ============================================
-- SELECT tgname, tgfoid::regproc FROM pg_trigger WHERE tgrelid = 'portal_access_tokens'::regclass;
-- SELECT tgname, tgfoid::regproc FROM pg_trigger WHERE tgrelid = 'portal_sessions'::regclass;
-- SELECT tgname, tgfoid::regproc FROM pg_trigger WHERE tgrelid = 'reviews'::regclass;
