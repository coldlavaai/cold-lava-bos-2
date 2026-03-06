-- Utility functions used by other migrations
-- This must run before tables that use these functions

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comment
COMMENT ON FUNCTION update_updated_at_column() IS 'Trigger function to auto-update updated_at timestamp';
