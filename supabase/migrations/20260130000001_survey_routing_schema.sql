-- ========================================
-- Survey & Visit Routing - Schema Updates
-- ========================================

-- Add postcode_area to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS postcode_area VARCHAR(10);

-- Add index for postcode_area filtering
CREATE INDEX IF NOT EXISTS idx_customers_postcode_area ON customers(tenant_id, postcode_area);

-- Add postcode_area to jobs table
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS postcode_area VARCHAR(10);

-- Add requires_visit flag to jobs table
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS requires_visit BOOLEAN DEFAULT false;

-- Add index for visit-eligible jobs
CREATE INDEX IF NOT EXISTS idx_jobs_requires_visit ON jobs(tenant_id, requires_visit) WHERE requires_visit = true;

-- Add index for postcode_area filtering on jobs
CREATE INDEX IF NOT EXISTS idx_jobs_postcode_area ON jobs(tenant_id, postcode_area);

-- ========================================
-- ROUTES TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Route metadata
  route_date DATE NOT NULL,
  surveyor_id UUID NOT NULL REFERENCES users(id),

  -- Route summary
  total_travel_minutes INTEGER DEFAULT 0,
  total_visit_minutes INTEGER DEFAULT 0,
  total_duration_minutes INTEGER DEFAULT 0,
  total_stops INTEGER DEFAULT 0,

  -- Status
  status VARCHAR(20) DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'accepted', 'in_progress', 'completed', 'cancelled')),

  -- Audit
  created_by UUID REFERENCES users(id),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES users(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_routes_tenant_date ON routes(tenant_id, route_date);
CREATE INDEX idx_routes_tenant_surveyor ON routes(tenant_id, surveyor_id, route_date);
CREATE INDEX idx_routes_tenant_status ON routes(tenant_id, status);

CREATE TRIGGER trigger_routes_updated_at
  BEFORE UPDATE ON routes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_routes ON routes
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ========================================
-- ROUTE STOPS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS route_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Stop order
  stop_number INTEGER NOT NULL,

  -- Address (denormalized for stability)
  address_line_1 VARCHAR(255),
  address_line_2 VARCHAR(255),
  city VARCHAR(100),
  full_postcode VARCHAR(10) NOT NULL,
  postcode_area VARCHAR(10),

  -- Timing
  arrival_time TIMESTAMPTZ NOT NULL,
  visit_duration_minutes INTEGER NOT NULL,
  departure_time TIMESTAMPTZ NOT NULL,
  travel_time_to_next_minutes INTEGER DEFAULT 0,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_route_stops_route ON route_stops(route_id, stop_number);
CREATE INDEX idx_route_stops_customer ON route_stops(customer_id);
CREATE INDEX idx_route_stops_job ON route_stops(job_id);

ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_route_stops ON route_stops
  FOR ALL
  USING (
    route_id IN (
      SELECT id FROM routes WHERE tenant_id = current_tenant_id()
    )
  )
  WITH CHECK (
    route_id IN (
      SELECT id FROM routes WHERE tenant_id = current_tenant_id()
    )
  );

-- ========================================
-- UPDATE APPOINTMENTS TABLE
-- ========================================

-- Add routing-related fields to appointments
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES routes(id) ON DELETE SET NULL;

ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS visit_duration_minutes INTEGER;

ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS travel_time_to_next_minutes INTEGER DEFAULT 0;

ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS confirmation_status VARCHAR(20) DEFAULT 'no_response'
  CHECK (confirmation_status IN ('no_response', 'confirmed', 'declined'));

ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS postcode_area VARCHAR(10);

-- Update appointment status to include 'proposed' for route-generated appointments
ALTER TABLE appointments
DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE appointments
ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('proposed', 'scheduled', 'completed', 'cancelled', 'no_show'));

-- Add index for route-linked appointments
CREATE INDEX IF NOT EXISTS idx_appointments_route ON appointments(route_id);

-- ========================================
-- FUNCTION: Extract Postcode Area
-- ========================================

CREATE OR REPLACE FUNCTION extract_postcode_area(postcode TEXT)
RETURNS TEXT AS $$
BEGIN
  IF postcode IS NULL OR postcode = '' THEN
    RETURN NULL;
  END IF;

  -- Remove all spaces and convert to uppercase
  postcode := UPPER(REGEXP_REPLACE(postcode, '\s+', '', 'g'));

  -- Extract the area code (letters only from the start)
  RETURN SUBSTRING(postcode FROM '^([A-Z]+)');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ========================================
-- TRIGGER: Auto-populate postcode_area on customers
-- ========================================

CREATE OR REPLACE FUNCTION trigger_set_customer_postcode_area()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.postcode IS NOT NULL AND NEW.postcode != '' THEN
    NEW.postcode_area := extract_postcode_area(NEW.postcode);
  ELSE
    NEW.postcode_area := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_customers_postcode_area
  BEFORE INSERT OR UPDATE OF postcode ON customers
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_customer_postcode_area();

-- Backfill existing customers
UPDATE customers
SET postcode_area = extract_postcode_area(postcode)
WHERE postcode IS NOT NULL AND postcode_area IS NULL;

-- ========================================
-- TRIGGER: Auto-populate postcode_area on jobs from customer
-- ========================================

CREATE OR REPLACE FUNCTION trigger_set_job_postcode_area()
RETURNS TRIGGER AS $$
DECLARE
  customer_postcode_area VARCHAR(10);
BEGIN
  -- Get postcode_area from linked customer
  SELECT postcode_area INTO customer_postcode_area
  FROM customers
  WHERE id = NEW.customer_id;

  NEW.postcode_area := customer_postcode_area;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_jobs_postcode_area
  BEFORE INSERT OR UPDATE OF customer_id ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_job_postcode_area();

-- Backfill existing jobs
UPDATE jobs j
SET postcode_area = c.postcode_area
FROM customers c
WHERE j.customer_id = c.id AND j.postcode_area IS NULL;
