-- Allow admins to insert new users when inviting team members
-- This policy allows authenticated users with admin role to insert into users table
-- Required for the user invite flow in /api/users/invite

DROP POLICY IF EXISTS "admins_can_insert_users" ON users;

CREATE POLICY "admins_can_insert_users" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM tenant_users
      WHERE tenant_users.user_id = auth.uid()
        AND tenant_users.role = 'admin'
    )
  );
