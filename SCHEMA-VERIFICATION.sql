-- Schema Verification Query
-- Run this in Supabase SQL Editor to get actual column names for all tables
-- This will help identify any mismatches between code and database

-- Check all columns in our main tables
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'tenants',
    'tenant_users',
    'users',
    'customers',
    'customer_sources',
    'jobs',
    'job_stages',
    'job_stage_transitions',
    'tasks',
    'appointments',
    'threads',
    'messages',
    'notifications',
    'quotes',
    'quote_line_items'
  )
ORDER BY
  table_name,
  ordinal_position;
