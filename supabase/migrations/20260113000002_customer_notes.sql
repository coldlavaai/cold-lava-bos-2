-- Create customer_notes table for logging calls and notes
create table customer_notes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  created_by uuid references users(id),
  note text not null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table customer_notes enable row level security;

-- Tenant isolation policy
create policy tenant_isolation_customer_notes on customer_notes
  for all
  using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

-- Index for efficient queries
create index idx_customer_notes_tenant_customer_created
  on customer_notes(tenant_id, customer_id, created_at desc);

-- Grant permissions
grant all on customer_notes to authenticated;
