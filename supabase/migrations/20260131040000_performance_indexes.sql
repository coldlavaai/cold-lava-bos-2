-- ========================================
-- Performance Indexes for Solar BOS
-- Added: 2026-01-31
-- Purpose: Speed up common queries
-- ========================================

-- Jobs table indexes
CREATE INDEX IF NOT EXISTS idx_jobs_tenant_id ON jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jobs_current_stage_id ON jobs(current_stage_id);
CREATE INDEX IF NOT EXISTS idx_jobs_assigned_to ON jobs(assigned_to);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_tenant_stage ON jobs(tenant_id, current_stage_id);
CREATE INDEX IF NOT EXISTS idx_jobs_compliance_status ON jobs(compliance_status);

-- Customers table indexes
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_postcode ON customers(postcode);

-- Appointments table indexes
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_id ON appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_job_id ON appointments(job_id);
CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_time ON appointments(tenant_id, start_time);

-- Tasks table indexes
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_id ON tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_linked_entity ON tasks(linked_entity_type, linked_entity_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Quotes table indexes
CREATE INDEX IF NOT EXISTS idx_quotes_tenant_id ON quotes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotes_job_id ON quotes(job_id);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);

-- Messages table indexes
CREATE INDEX IF NOT EXISTS idx_messages_tenant_id ON messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Message threads table indexes
CREATE INDEX IF NOT EXISTS idx_message_threads_tenant_id ON message_threads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_customer_id ON message_threads(customer_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_last_message ON message_threads(last_message_at DESC);

-- Job stage transitions (for activity/timeline)
CREATE INDEX IF NOT EXISTS idx_job_stage_transitions_job_id ON job_stage_transitions(job_id);
CREATE INDEX IF NOT EXISTS idx_job_stage_transitions_created_at ON job_stage_transitions(created_at DESC);

-- Call recordings
CREATE INDEX IF NOT EXISTS idx_call_recordings_tenant_id ON call_recordings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_customer_id ON call_recordings(customer_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_job_id ON call_recordings(job_id);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at) WHERE read_at IS NULL;

-- ========================================
-- Notes:
-- - All queries filter by tenant_id first, so compound indexes include it
-- - DESC indexes for date fields since we usually want newest first
-- - Partial index on notifications for unread (most common query)
-- ========================================
