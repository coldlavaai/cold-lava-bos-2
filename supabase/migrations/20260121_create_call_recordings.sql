-- Session 92: Call Recordings & Otter Foundation
-- Create call_recordings table for storing call/audio recordings, transcripts, and summaries
-- Supports ingestion from external providers (Otter, Twilio Voice, Zoom, etc.)

CREATE TABLE call_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Linkage to BOS entities (at least one should be non-null for proper context)
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  message_thread_id UUID REFERENCES message_threads(id) ON DELETE SET NULL,

  -- Provider & external references
  provider TEXT NOT NULL,                  -- e.g. 'otter', 'twilio', 'zoom', 'teams'
  provider_call_id TEXT,                   -- provider's call/meeting ID for deduplication
  provider_meeting_url TEXT,               -- deep link back to provider UI

  -- Media & transcription
  audio_url TEXT,                          -- Supabase Storage or external URL for recording
  transcript TEXT,                         -- full transcription text
  summary TEXT,                            -- AI-generated summary
  action_items JSONB,                      -- [{ text, owner_user_id?, due_date? }, ...]
  language TEXT,                           -- e.g. 'en', 'es', 'fr'

  -- Call metadata
  direction TEXT CHECK (direction IN ('inbound', 'outbound')),
  started_at TIMESTAMPTZ,                  -- when the call began
  ended_at TIMESTAMPTZ,                    -- when the call ended
  duration_seconds INTEGER,                -- call duration in seconds

  -- Ownership/creation tracking
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE call_recordings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Tenant Isolation
-- Users can only access call recordings for their tenant
DROP POLICY IF EXISTS tenant_isolation_call_recordings ON call_recordings;

CREATE POLICY tenant_isolation_call_recordings ON call_recordings
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Indexes for efficient querying
-- Index for job-based queries
CREATE INDEX idx_call_recordings_tenant_job ON call_recordings(tenant_id, job_id) WHERE job_id IS NOT NULL;

-- Index for customer-based queries
CREATE INDEX idx_call_recordings_tenant_customer ON call_recordings(tenant_id, customer_id) WHERE customer_id IS NOT NULL;

-- Index for message thread queries
CREATE INDEX idx_call_recordings_tenant_thread ON call_recordings(tenant_id, message_thread_id) WHERE message_thread_id IS NOT NULL;

-- Index for provider-based deduplication (upsert logic)
CREATE INDEX idx_call_recordings_provider_dedup ON call_recordings(tenant_id, provider, provider_call_id) WHERE provider_call_id IS NOT NULL;

-- Index for chronological sorting
CREATE INDEX idx_call_recordings_started_at ON call_recordings(tenant_id, started_at DESC);

-- Add comment for documentation
COMMENT ON TABLE call_recordings IS 'Session 92: Stores call recordings, transcripts, and summaries from external providers (Otter, Twilio, Zoom, etc.) linked to jobs, customers, or message threads.';
