-- ========================================
-- Solar BOS - Seed Data
-- Global reference data and notification types
-- ========================================

-- ========================================
-- NOTIFICATION TYPES (Global)
-- These are system-wide and not tenant-specific
-- ========================================

INSERT INTO notification_types (type_key, name, description) VALUES
('task_due_soon', 'Task Due Soon', 'Notification when a task is due within 24 hours'),
('task_overdue', 'Task Overdue', 'Notification when a task is overdue'),
('job_stage_changed', 'Job Stage Changed', 'Notification when a job moves to a new stage'),
('appointment_reminder', 'Appointment Reminder', 'Reminder for upcoming appointments'),
('message_received', 'Message Received', 'Notification when a new message is received'),
('quote_expiring_soon', 'Quote Expiring Soon', 'Notification when a quote is about to expire'),
('new_job_assigned', 'New Job Assigned', 'Notification when a job is assigned to you')
ON CONFLICT (type_key) DO NOTHING;

-- ========================================
-- TENANT-SPECIFIC SEED DATA FUNCTION
-- This function should be called when creating a new tenant
-- to initialize their default data
-- ========================================

CREATE OR REPLACE FUNCTION seed_tenant_data(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Seed default job stages
  INSERT INTO job_stages (tenant_id, name, position, stage_type, color) VALUES
  (p_tenant_id, 'New Lead', 1, 'lead', '#10b981'),
  (p_tenant_id, 'Qualified', 2, 'in_progress', '#3b82f6'),
  (p_tenant_id, 'Survey Booked', 3, 'in_progress', '#8b5cf6'),
  (p_tenant_id, 'Survey Complete', 4, 'in_progress', '#06b6d4'),
  (p_tenant_id, 'Proposal Sent', 5, 'in_progress', '#f59e0b'),
  (p_tenant_id, 'Negotiation', 6, 'in_progress', '#ef4444'),
  (p_tenant_id, 'Won', 7, 'completed', '#22c55e'),
  (p_tenant_id, 'Lost', 8, 'cancelled', '#6b7280');

  -- Seed default appointment types
  INSERT INTO appointment_types (tenant_id, name, duration_minutes, color) VALUES
  (p_tenant_id, 'Survey', 60, '#3b82f6'),
  (p_tenant_id, 'Sales Visit', 45, '#10b981'),
  (p_tenant_id, 'Installation', 480, '#f59e0b'),
  (p_tenant_id, 'Follow-up', 30, '#8b5cf6');

  -- Seed default customer sources
  INSERT INTO customer_sources (tenant_id, name, is_active) VALUES
  (p_tenant_id, 'Website', true),
  (p_tenant_id, 'Referral', true),
  (p_tenant_id, 'Google Ads', true),
  (p_tenant_id, 'Phone Inquiry', true),
  (p_tenant_id, 'DBR Campaign', true);

END;
$$ LANGUAGE plpgsql;

-- ========================================
-- NOTES
-- ========================================
-- To create a new tenant with seed data, use:
-- 1. INSERT INTO tenants (...) RETURNING id
-- 2. SELECT seed_tenant_data(<tenant_id>);
--
-- This ensures each tenant gets their own copy of:
-- - Job stages (customizable per tenant)
-- - Appointment types (customizable per tenant)
-- - Customer sources (customizable per tenant)
-- ========================================
