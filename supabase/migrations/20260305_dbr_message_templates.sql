ALTER TABLE dbr_campaigns ADD COLUMN IF NOT EXISTS assigned_user_id UUID;
ALTER TABLE dbr_campaigns ADD COLUMN IF NOT EXISTS message_templates JSONB DEFAULT '{}';
ALTER TABLE dbr_campaigns ADD COLUMN IF NOT EXISTS auto_reply_enabled BOOLEAN DEFAULT false;
ALTER TABLE dbr_campaigns ADD COLUMN IF NOT EXISTS auto_reply_prompt TEXT;
