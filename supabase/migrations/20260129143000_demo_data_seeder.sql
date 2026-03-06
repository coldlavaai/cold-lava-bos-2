-- ========================================
-- Solar BOS - Demo Data Seeder
-- Creates sample data for new tenants to explore the system
-- ========================================

CREATE OR REPLACE FUNCTION seed_demo_data(p_tenant_id UUID)
RETURNS VOID AS $$
DECLARE
  v_customer_1_id UUID;
  v_customer_2_id UUID;
  v_customer_3_id UUID;
  v_customer_4_id UUID;
  v_customer_5_id UUID;
  v_job_1_id UUID;
  v_job_2_id UUID;
  v_job_3_id UUID;
  v_job_4_id UUID;
  v_stage_new_lead UUID;
  v_stage_qualified UUID;
  v_stage_survey_booked UUID;
  v_stage_survey_complete UUID;
  v_stage_proposal_sent UUID;
  v_stage_won UUID;
  v_source_website UUID;
  v_source_referral UUID;
  v_appt_type_survey UUID;
  v_appt_type_install UUID;
BEGIN
  -- Get stage IDs
  SELECT id INTO v_stage_new_lead FROM job_stages WHERE tenant_id = p_tenant_id AND name = 'New Lead' LIMIT 1;
  SELECT id INTO v_stage_qualified FROM job_stages WHERE tenant_id = p_tenant_id AND name = 'Qualified' LIMIT 1;
  SELECT id INTO v_stage_survey_booked FROM job_stages WHERE tenant_id = p_tenant_id AND name = 'Survey Booked' LIMIT 1;
  SELECT id INTO v_stage_survey_complete FROM job_stages WHERE tenant_id = p_tenant_id AND name = 'Survey Complete' LIMIT 1;
  SELECT id INTO v_stage_proposal_sent FROM job_stages WHERE tenant_id = p_tenant_id AND name = 'Proposal Sent' LIMIT 1;
  SELECT id INTO v_stage_won FROM job_stages WHERE tenant_id = p_tenant_id AND name = 'Won' LIMIT 1;

  -- Get source IDs
  SELECT id INTO v_source_website FROM customer_sources WHERE tenant_id = p_tenant_id AND name = 'Website' LIMIT 1;
  SELECT id INTO v_source_referral FROM customer_sources WHERE tenant_id = p_tenant_id AND name = 'Referral' LIMIT 1;

  -- Get appointment type IDs
  SELECT id INTO v_appt_type_survey FROM appointment_types WHERE tenant_id = p_tenant_id AND name = 'Survey' LIMIT 1;
  SELECT id INTO v_appt_type_install FROM appointment_types WHERE tenant_id = p_tenant_id AND name = 'Installation' LIMIT 1;

  -- ========================================
  -- SAMPLE CUSTOMERS
  -- ========================================
  
  INSERT INTO customers (tenant_id, name, email, phone, address_line1, address_city, address_postcode, source_id, notes)
  VALUES (p_tenant_id, 'James Wilson', 'james.wilson@email.com', '07700 900123', '42 Oak Drive', 'Manchester', 'M20 4NJ', v_source_website, 'Interested in 4kW system. South-facing roof, no shading.')
  RETURNING id INTO v_customer_1_id;

  INSERT INTO customers (tenant_id, name, email, phone, address_line1, address_city, address_postcode, source_id, notes)
  VALUES (p_tenant_id, 'Sarah Thompson', 'sarah.t@gmail.com', '07700 900456', '15 Maple Avenue', 'Birmingham', 'B15 2TT', v_source_referral, 'Referred by John Smith (completed install). Detached property.')
  RETURNING id INTO v_customer_2_id;

  INSERT INTO customers (tenant_id, name, email, phone, address_line1, address_city, address_postcode, source_id, notes)
  VALUES (p_tenant_id, 'David Chen', 'david.chen@outlook.com', '07700 900789', '8 Victoria Road', 'Leeds', 'LS6 1PF', v_source_website, 'Large property, interested in solar + battery. High electricity bills.')
  RETURNING id INTO v_customer_3_id;

  INSERT INTO customers (tenant_id, name, email, phone, address_line1, address_city, address_postcode, source_id, notes)
  VALUES (p_tenant_id, 'Emma Roberts', 'emma.r@work.co.uk', '07700 900321', '27 Church Lane', 'Bristol', 'BS1 5RJ', v_source_website, 'New build property. Wants to add solar before moving in.')
  RETURNING id INTO v_customer_4_id;

  INSERT INTO customers (tenant_id, name, email, phone, address_line1, address_city, address_postcode, source_id, notes)
  VALUES (p_tenant_id, 'Michael Brown', 'mbrown@email.com', '07700 900654', '3 Park Street', 'Nottingham', 'NG1 5AW', v_source_referral, 'Previous solar customer looking to add battery storage.')
  RETURNING id INTO v_customer_5_id;

  -- ========================================
  -- SAMPLE JOBS (across different stages)
  -- ========================================

  -- Job 1: New Lead (just received inquiry)
  INSERT INTO jobs (tenant_id, customer_id, current_stage_id, job_number, estimated_value, system_size_kw, notes, tags)
  VALUES (
    p_tenant_id, 
    v_customer_1_id, 
    v_stage_new_lead, 
    'JOB-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'),
    8500, 
    4.0,
    'Initial inquiry via website form. Interested in solar panels for their semi-detached home.',
    ARRAY['residential', 'website-lead']
  ) RETURNING id INTO v_job_1_id;

  -- Job 2: Survey Booked
  INSERT INTO jobs (tenant_id, customer_id, current_stage_id, job_number, estimated_value, system_size_kw, notes, tags)
  VALUES (
    p_tenant_id, 
    v_customer_2_id, 
    v_stage_survey_booked, 
    'JOB-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'),
    12500, 
    6.0,
    'Detached 4-bed property. Customer wants 6kW system with battery. Survey scheduled for next week.',
    ARRAY['residential', 'battery', 'referral']
  ) RETURNING id INTO v_job_2_id;

  -- Job 3: Proposal Sent (waiting for decision)
  INSERT INTO jobs (tenant_id, customer_id, current_stage_id, job_number, estimated_value, system_size_kw, notes, tags)
  VALUES (
    p_tenant_id, 
    v_customer_3_id, 
    v_stage_proposal_sent, 
    'JOB-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'),
    18000, 
    8.5,
    'Large detached property. 8.5kW system with 10kWh battery. Proposal sent, following up this week.',
    ARRAY['residential', 'battery', 'large-system', 'high-value']
  ) RETURNING id INTO v_job_3_id;

  -- Job 4: Won (ready for installation)
  INSERT INTO jobs (tenant_id, customer_id, current_stage_id, job_number, estimated_value, system_size_kw, 
    mcs_certificate_number, dno_notification_required, dno_notification_reference, part_p_compliant, epc_rating, roof_type, roof_orientation, notes, tags)
  VALUES (
    p_tenant_id, 
    v_customer_4_id, 
    v_stage_won, 
    'JOB-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'),
    9500, 
    4.8,
    'MCS-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 6, '0'),
    false, -- Under 3.68kW export limit
    NULL,
    true,
    'C',
    'Pitched Tile',
    'South',
    'Installation scheduled. All compliance docs ready. Customer paid deposit.',
    ARRAY['residential', 'new-build', 'ready-to-install']
  ) RETURNING id INTO v_job_4_id;

  -- ========================================
  -- SAMPLE APPOINTMENTS
  -- ========================================

  -- Survey appointment for Job 2 (tomorrow)
  INSERT INTO appointments (tenant_id, job_id, customer_id, title, appointment_type, start_time, end_time, location, notes, status)
  VALUES (
    p_tenant_id,
    v_job_2_id,
    v_customer_2_id,
    'Site Survey - Thompson',
    'Survey',
    (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '10 hours')::TIMESTAMP,
    (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '11 hours')::TIMESTAMP,
    '15 Maple Avenue, Birmingham, B15 2TT',
    'Access via side gate. Dog in garden - customer will secure.',
    'scheduled'
  );

  -- Installation appointment for Job 4 (next week)
  INSERT INTO appointments (tenant_id, job_id, customer_id, title, appointment_type, start_time, end_time, location, notes, status)
  VALUES (
    p_tenant_id,
    v_job_4_id,
    v_customer_4_id,
    'Installation - Roberts',
    'Installation',
    (CURRENT_DATE + INTERVAL '5 days' + INTERVAL '8 hours')::TIMESTAMP,
    (CURRENT_DATE + INTERVAL '5 days' + INTERVAL '16 hours')::TIMESTAMP,
    '27 Church Lane, Bristol, BS1 5RJ',
    'Full day install. Team: 2 installers. Scaffolding arriving 7am.',
    'scheduled'
  );

  -- ========================================
  -- SAMPLE TASKS
  -- ========================================

  -- Tasks for Job 1 (New Lead)
  INSERT INTO tasks (tenant_id, title, description, due_date, priority, status, linked_entity_type, linked_entity_id)
  VALUES 
    (p_tenant_id, 'Call James Wilson - initial qualification', 'Discuss requirements, budget, and timeline. Check roof suitability.', CURRENT_DATE + INTERVAL '1 day', 'high', 'pending', 'job', v_job_1_id),
    (p_tenant_id, 'Send information pack', 'Email product brochure and sample quote', CURRENT_DATE + INTERVAL '2 days', 'medium', 'pending', 'job', v_job_1_id);

  -- Tasks for Job 2 (Survey Booked)
  INSERT INTO tasks (tenant_id, title, description, due_date, priority, status, linked_entity_type, linked_entity_id)
  VALUES 
    (p_tenant_id, 'Prepare survey equipment', 'Charge tablet, print forms, check compass', CURRENT_DATE, 'high', 'pending', 'job', v_job_2_id),
    (p_tenant_id, 'Confirm survey appointment', 'Text customer to confirm tomorrow''s appointment', CURRENT_DATE, 'high', 'pending', 'job', v_job_2_id);

  -- Tasks for Job 3 (Proposal Sent)
  INSERT INTO tasks (tenant_id, title, description, due_date, priority, status, linked_entity_type, linked_entity_id)
  VALUES 
    (p_tenant_id, 'Follow up on proposal', 'Call David to discuss proposal and answer questions', CURRENT_DATE + INTERVAL '2 days', 'high', 'pending', 'job', v_job_3_id);

  -- Tasks for Job 4 (Won)
  INSERT INTO tasks (tenant_id, title, description, due_date, priority, status, linked_entity_type, linked_entity_id)
  VALUES 
    (p_tenant_id, 'Order equipment from supplier', 'Order panels, inverter, and mounting kit', CURRENT_DATE, 'high', 'pending', 'job', v_job_4_id),
    (p_tenant_id, 'Book scaffolding', 'Confirm scaffolding delivery for installation day', CURRENT_DATE + INTERVAL '1 day', 'medium', 'pending', 'job', v_job_4_id),
    (p_tenant_id, 'Submit DNO notification', 'G98 notification via energy network portal', CURRENT_DATE + INTERVAL '3 days', 'medium', 'pending', 'job', v_job_4_id);

  -- ========================================
  -- SAMPLE QUOTES
  -- ========================================

  -- Quote for Job 3 (the one that was sent)
  INSERT INTO quotes (tenant_id, job_id, customer_id, quote_number, status, valid_until, subtotal, vat_amount, total, notes)
  VALUES (
    p_tenant_id,
    v_job_3_id,
    v_customer_3_id,
    'Q-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'),
    'sent',
    CURRENT_DATE + INTERVAL '30 days',
    15000,
    3000,
    18000,
    'Includes 8.5kW system with 10kWh battery storage. 25-year panel warranty, 10-year inverter warranty.'
  );

END;
$$ LANGUAGE plpgsql;

-- Add function to call during signup (optional - can be toggled)
COMMENT ON FUNCTION seed_demo_data IS 'Creates sample customers, jobs, appointments, tasks, and quotes for a new tenant. Call after seed_tenant_data().';
