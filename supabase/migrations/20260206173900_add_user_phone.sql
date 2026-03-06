-- Add phone field to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30);

-- Add index for phone lookups
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
