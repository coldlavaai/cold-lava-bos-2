-- Fix RLS policies on users table to allow admin user creation
-- Problem: user_self_access uses FOR ALL which includes INSERT
-- Its WITH CHECK requires id = auth.uid(), but new users have random UUIDs
-- Solution: Split into separate policies for different operations

-- Drop the problematic ALL policy
DROP POLICY IF EXISTS user_self_access ON users;

-- Create separate policies for each operation

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "users_select_self" ON users;
DROP POLICY IF EXISTS "users_update_self" ON users;
DROP POLICY IF EXISTS "users_delete_super_admin" ON users;

-- SELECT: Users can see themselves or super admins can see all
CREATE POLICY "users_select_self" ON users
  FOR SELECT
  USING (id = auth.uid() OR is_super_admin());

-- UPDATE: Users can update themselves or super admins can update all
CREATE POLICY "users_update_self" ON users
  FOR UPDATE
  USING (id = auth.uid() OR is_super_admin())
  WITH CHECK (id = auth.uid() OR is_super_admin());

-- DELETE: Only super admins can delete
CREATE POLICY "users_delete_super_admin" ON users
  FOR DELETE
  USING (is_super_admin());

-- INSERT: Admins can create new users (for invites)
-- This policy was already created but couldn't work due to user_self_access blocking it
-- Keep it as is - it should work now that user_self_access is removed
-- CREATE POLICY "admins_can_insert_users" ON users ... (already exists)
