-- Session 109: Google Calendar Sync Support
-- Add google_event_id to appointments for two-way sync

-- Add Google Calendar event ID to appointments
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- Index for quick lookup by Google event ID
CREATE INDEX IF NOT EXISTS idx_appointments_google_event_id 
ON appointments(google_event_id) 
WHERE google_event_id IS NOT NULL;

-- Add last sync timestamp for tracking
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS google_synced_at TIMESTAMPTZ;

-- Comment
COMMENT ON COLUMN appointments.google_event_id IS 'Google Calendar event ID for two-way sync';
COMMENT ON COLUMN appointments.google_synced_at IS 'Last time this appointment was synced to Google Calendar';
