-- ========================================
-- Solar BOS - CRM Tables
-- Customers, Jobs, Quotes, Tasks, Appointments
-- ========================================

-- ========================================
-- CUSTOMER SOURCES (Reference Table)
-- ========================================

CREATE TABLE customer_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, name)
);

CREATE INDEX idx_customer_sources_tenant ON customer_sources(tenant_id);

ALTER TABLE customer_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_customer_sources ON customer_sources
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ========================================
-- CUSTOMERS TABLE
-- ========================================

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Identity
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),

  -- Address
  address_line_1 VARCHAR(255),
  address_line_2 VARCHAR(255),
  city VARCHAR(100),
  postcode VARCHAR(10),

  -- Lead source
  source_id UUID REFERENCES customer_sources(id),

  -- Notes
  notes TEXT,

  -- Audit
  created_by UUID REFERENCES users(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_customers_tenant_created ON customers(tenant_id, created_at DESC);
CREATE INDEX idx_customers_tenant_email ON customers(tenant_id, email);
CREATE INDEX idx_customers_tenant_source ON customers(tenant_id, source_id);

-- Full text search
CREATE INDEX idx_customers_search ON customers USING GIN (
  to_tsvector('english', name || ' ' || COALESCE(email, '') || ' ' || COALESCE(phone, ''))
);

-- Triggers
CREATE TRIGGER trigger_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

-- RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_customers ON customers
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ========================================
-- JOB STAGES TABLE
-- ========================================

CREATE TABLE job_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,
  position INTEGER NOT NULL,

  -- Stage type
  stage_type VARCHAR(20) DEFAULT 'in_progress'
    CHECK (stage_type IN ('lead', 'in_progress', 'completed', 'cancelled')),

  -- Display
  color VARCHAR(7),  -- Hex color
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_job_stages_tenant ON job_stages(tenant_id, position);

CREATE TRIGGER trigger_job_stages_updated_at
  BEFORE UPDATE ON job_stages
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE job_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_job_stages ON job_stages
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ========================================
-- JOBS TABLE
-- ========================================

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Job details
  job_number VARCHAR(50) UNIQUE,
  current_stage_id UUID REFERENCES job_stages(id),
  assigned_to UUID REFERENCES users(id),

  -- System details
  estimated_value DECIMAL(10,2),
  system_size_kwp DECIMAL(6,2),

  -- Source
  source VARCHAR(100),

  -- Tags
  tags TEXT[] DEFAULT '{}',

  -- Notes
  notes TEXT,

  -- Stage tracking
  stage_changed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_jobs_tenant_stage_created ON jobs(tenant_id, current_stage_id, created_at DESC);
CREATE INDEX idx_jobs_tenant_customer ON jobs(tenant_id, customer_id);
CREATE INDEX idx_jobs_tenant_created ON jobs(tenant_id, created_at DESC);

-- Full text search
CREATE INDEX idx_jobs_search ON jobs USING GIN (
  to_tsvector('english', COALESCE(job_number, '') || ' ' || COALESCE(notes, ''))
);

CREATE TRIGGER trigger_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_jobs ON jobs
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ========================================
-- JOB STAGE TRANSITIONS TABLE
-- ========================================

CREATE TABLE job_stage_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  from_stage_id UUID REFERENCES job_stages(id),
  to_stage_id UUID NOT NULL REFERENCES job_stages(id),

  transitioned_by UUID REFERENCES users(id),
  transitioned_at TIMESTAMPTZ DEFAULT NOW(),

  notes TEXT
);

CREATE INDEX idx_job_transitions_job ON job_stage_transitions(job_id, transitioned_at DESC);

ALTER TABLE job_stage_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_job_transitions ON job_stage_transitions
  FOR ALL
  USING (
    job_id IN (
      SELECT id FROM jobs WHERE tenant_id = current_tenant_id()
    )
  )
  WITH CHECK (
    job_id IN (
      SELECT id FROM jobs WHERE tenant_id = current_tenant_id()
    )
  );

-- ========================================
-- QUOTES TABLE
-- ========================================

CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,

  quote_number VARCHAR(50) UNIQUE,

  -- Status
  status VARCHAR(20) DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),

  -- Financial
  total_amount DECIMAL(10,2),

  -- Validity
  valid_until TIMESTAMPTZ,

  -- Audit
  created_by UUID REFERENCES users(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quotes_tenant_job ON quotes(tenant_id, job_id);
CREATE INDEX idx_quotes_tenant_status ON quotes(tenant_id, status, created_at DESC);

CREATE TRIGGER trigger_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_quotes ON quotes
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ========================================
-- QUOTE LINE ITEMS TABLE
-- ========================================

CREATE TABLE quote_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,

  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,

  position INTEGER NOT NULL
);

CREATE INDEX idx_quote_line_items_quote ON quote_line_items(quote_id, position);

ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_quote_line_items ON quote_line_items
  FOR ALL
  USING (
    quote_id IN (
      SELECT id FROM quotes WHERE tenant_id = current_tenant_id()
    )
  )
  WITH CHECK (
    quote_id IN (
      SELECT id FROM quotes WHERE tenant_id = current_tenant_id()
    )
  );

-- ========================================
-- TASKS TABLE
-- ========================================

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Task details
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Timing
  due_date DATE,
  due_time TIME,

  -- Priority
  priority VARCHAR(20) DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high')),

  -- Status
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed')),

  -- Assignment
  assigned_to UUID REFERENCES users(id),

  -- Linked entity (polymorphic)
  linked_entity_type VARCHAR(50),
  linked_entity_id UUID,

  -- Completion
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id),

  -- Audit
  created_by UUID REFERENCES users(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_tenant_due_date ON tasks(tenant_id, due_date);
CREATE INDEX idx_tasks_tenant_assigned ON tasks(tenant_id, assigned_to, status);
CREATE INDEX idx_tasks_tenant_entity ON tasks(tenant_id, linked_entity_type, linked_entity_id);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_tasks ON tasks
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ========================================
-- APPOINTMENT TYPES TABLE
-- ========================================

CREATE TABLE appointment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  color VARCHAR(7),  -- Hex color
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_appointment_types_tenant ON appointment_types(tenant_id);

ALTER TABLE appointment_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_appointment_types ON appointment_types
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ========================================
-- APPOINTMENTS TABLE
-- ========================================

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  title VARCHAR(255) NOT NULL,
  type_id UUID REFERENCES appointment_types(id),

  -- Timing
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,

  -- Location
  location TEXT,

  -- Related entities
  job_id UUID REFERENCES jobs(id),
  customer_id UUID REFERENCES customers(id),

  -- Assignment
  assigned_to UUID REFERENCES users(id),

  -- Notes
  notes TEXT,

  -- Status
  status VARCHAR(20) DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),

  -- Audit
  created_by UUID REFERENCES users(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_appointments_tenant_start ON appointments(tenant_id, start_time);
CREATE INDEX idx_appointments_tenant_assigned ON appointments(tenant_id, assigned_to, start_time);
CREATE INDEX idx_appointments_tenant_job ON appointments(tenant_id, job_id);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_appointments ON appointments
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());
