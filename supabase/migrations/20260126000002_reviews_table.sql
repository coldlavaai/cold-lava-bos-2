/**
 * Session 104: Reviews Table
 * Creates reviews table for managing customer reviews and reputation
 */

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Related entities
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,

  -- Source / platform
  source VARCHAR(20) NOT NULL DEFAULT 'invited'
    CHECK (source IN ('invited', 'imported', 'manual', 'external')),
  external_platform VARCHAR(20)
    CHECK (external_platform IN ('google', 'trustpilot', 'facebook', 'yell', 'other')),
  external_review_id VARCHAR(100),

  -- Review content
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  title VARCHAR(255),
  body TEXT,

  -- Invitation & status
  invitation_sent_at TIMESTAMPTZ,
  invitation_channel VARCHAR(20)
    CHECK (invitation_channel IN ('email', 'sms', 'whatsapp', 'portal')),
  invitation_message_id UUID REFERENCES messages(id),

  status VARCHAR(20) NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'replied', 'flagged', 'hidden')),

  -- Reply metadata
  reply_body TEXT,
  replied_at TIMESTAMPTZ,
  reply_author_user_id UUID REFERENCES users(id),
  auto_replied BOOLEAN DEFAULT false,

  -- Visibility
  is_visible BOOLEAN DEFAULT true,

  -- Optimistic locking
  version INTEGER DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes (tenant_id FIRST for RLS performance)
CREATE INDEX idx_reviews_tenant_created
  ON reviews(tenant_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_reviews_tenant_job
  ON reviews(tenant_id, job_id, created_at DESC)
  WHERE deleted_at IS NULL AND job_id IS NOT NULL;

CREATE INDEX idx_reviews_tenant_status
  ON reviews(tenant_id, status, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_reviews_tenant_customer
  ON reviews(tenant_id, customer_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Updated_at trigger
CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY tenant_isolation_reviews ON reviews
  FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() LIMIT 1))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() LIMIT 1));

-- Comments for documentation
COMMENT ON TABLE reviews IS 'Customer reviews and reputation management';
COMMENT ON COLUMN reviews.source IS 'How the review was obtained: invited, imported, manual, or external';
COMMENT ON COLUMN reviews.invitation_channel IS 'Channel used to send review invitation';
COMMENT ON COLUMN reviews.status IS 'Review status: new, replied, flagged, hidden';
COMMENT ON COLUMN reviews.reply_body IS 'Installer reply to the review';
COMMENT ON COLUMN reviews.is_visible IS 'Whether the review should be visible to customers';
