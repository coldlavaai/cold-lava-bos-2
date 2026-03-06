-- Add metadata JSONB column to customers table
-- Session 80 - Solar Visualization
-- Stores extensible customer data (solar visualization, future integrations)

ALTER TABLE customers ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add index for metadata queries (e.g. finding customers with solar data)
CREATE INDEX IF NOT EXISTS idx_customers_metadata ON customers USING GIN (metadata);

-- Add comment for documentation
COMMENT ON COLUMN customers.metadata IS 'Extensible JSON field for customer data (solar visualization, integrations, etc.)';
