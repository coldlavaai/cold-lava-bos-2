-- Add new columns to existing notifications table for notification center
-- type: 'feed', 'reminder', 'system'
-- category: 'deal_updated', 'contact_updated', 'note_added', 'call_scheduled', etc.
-- icon, link, entity_type, entity_id, actor_id, actor_name, dismissed, scheduled_at

DO $$
BEGIN
  -- Add type column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'type') THEN
    ALTER TABLE notifications ADD COLUMN type TEXT NOT NULL DEFAULT 'feed';
  END IF;

  -- Add category column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'category') THEN
    ALTER TABLE notifications ADD COLUMN category TEXT;
  END IF;

  -- Add icon column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'icon') THEN
    ALTER TABLE notifications ADD COLUMN icon TEXT;
  END IF;

  -- Add link column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'link') THEN
    ALTER TABLE notifications ADD COLUMN link TEXT;
  END IF;

  -- Add entity_type column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'entity_type') THEN
    ALTER TABLE notifications ADD COLUMN entity_type TEXT;
  END IF;

  -- Add entity_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'entity_id') THEN
    ALTER TABLE notifications ADD COLUMN entity_id UUID;
  END IF;

  -- Add actor_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'actor_id') THEN
    ALTER TABLE notifications ADD COLUMN actor_id UUID;
  END IF;

  -- Add actor_name column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'actor_name') THEN
    ALTER TABLE notifications ADD COLUMN actor_name TEXT;
  END IF;

  -- Add dismissed column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'dismissed') THEN
    ALTER TABLE notifications ADD COLUMN dismissed BOOLEAN DEFAULT false;
  END IF;

  -- Add scheduled_at column (for reminders)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'scheduled_at') THEN
    ALTER TABLE notifications ADD COLUMN scheduled_at TIMESTAMPTZ;
  END IF;
END $$;

-- Make user_id nullable (NULL = all users in tenant)
ALTER TABLE notifications ALTER COLUMN user_id DROP NOT NULL;

-- Make body nullable
ALTER TABLE notifications ALTER COLUMN body DROP NOT NULL;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_user_read ON notifications(tenant_id, user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(tenant_id, type, created_at DESC);

-- Add to realtime publication (ignore error if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
