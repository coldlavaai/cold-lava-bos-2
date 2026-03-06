-- Fix message_threads RLS: Add auth.uid()-based policies (same pattern as customers/jobs)
-- The current_tenant_id() policy doesn't work because the session var isn't set in API routes

-- Add SELECT policy for message_threads
CREATE POLICY "message_threads_select_same_tenant" ON message_threads
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tenant_users
    WHERE tenant_users.tenant_id = message_threads.tenant_id
    AND tenant_users.user_id = auth.uid()
  ));

-- Add INSERT policy for message_threads
CREATE POLICY "message_threads_insert_same_tenant" ON message_threads
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM tenant_users
    WHERE tenant_users.tenant_id = message_threads.tenant_id
    AND tenant_users.user_id = auth.uid()
  ));

-- Add UPDATE policy for message_threads
CREATE POLICY "message_threads_update_same_tenant" ON message_threads
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM tenant_users
    WHERE tenant_users.tenant_id = message_threads.tenant_id
    AND tenant_users.user_id = auth.uid()
  ));

-- Also fix messages table RLS if it only has current_tenant_id()
CREATE POLICY "messages_select_same_tenant" ON messages
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tenant_users
    WHERE tenant_users.tenant_id = messages.tenant_id
    AND tenant_users.user_id = auth.uid()
  ));

CREATE POLICY "messages_insert_same_tenant" ON messages
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM tenant_users
    WHERE tenant_users.tenant_id = messages.tenant_id
    AND tenant_users.user_id = auth.uid()
  ));

CREATE POLICY "messages_update_same_tenant" ON messages
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM tenant_users
    WHERE tenant_users.tenant_id = messages.tenant_id
    AND tenant_users.user_id = auth.uid()
  ));
