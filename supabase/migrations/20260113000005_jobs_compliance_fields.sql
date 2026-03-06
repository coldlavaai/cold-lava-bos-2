-- Add compliance-related fields to jobs table
-- For MCS certification, DNO notifications, and EIC documentation

-- Site and system details
alter table jobs add column if not exists site_supply_type text;
alter table jobs add column if not exists export_capacity_kw numeric(10,2);

-- DNO notification fields
alter table jobs add column if not exists dno_required boolean default false;
alter table jobs add column if not exists dno_reference text;

-- Installer information
alter table jobs add column if not exists installer_name text;
alter table jobs add column if not exists installer_mcs_number text;

-- Equipment details
alter table jobs add column if not exists inverter_model text;
alter table jobs add column if not exists panel_model text;
alter table jobs add column if not exists mounting_system text;

-- Create index for compliance queries (jobs that require DNO)
create index if not exists idx_jobs_dno_required on jobs(tenant_id, dno_required) where dno_required = true;

-- Add comments for documentation
comment on column jobs.site_supply_type is 'Single-phase or three-phase electricity supply';
comment on column jobs.export_capacity_kw is 'Export capacity in kilowatts for DNO notification';
comment on column jobs.dno_required is 'Whether DNO (Distribution Network Operator) notification is required';
comment on column jobs.dno_reference is 'DNO application reference number if submitted';
comment on column jobs.installer_name is 'Name of certified installer for MCS documentation';
comment on column jobs.installer_mcs_number is 'MCS (Microgeneration Certification Scheme) certificate number';
comment on column jobs.inverter_model is 'Solar inverter model for compliance documentation';
comment on column jobs.panel_model is 'Solar panel model for compliance documentation';
comment on column jobs.mounting_system is 'Mounting/racking system for installation documentation';
