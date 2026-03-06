# Database Migrations

This directory will contain Supabase migration files generated from the data model.

## Migration Strategy

Migrations will be created from the complete schema defined in [`docs/02-DATA-MODEL.md`](../../docs/02-DATA-MODEL.md).

## Planned Migration Files

1. **00_extensions.sql** - PostgreSQL extensions (uuid-ossp, pg_trgm, postgis, citext)
2. **01_functions.sql** - Helper functions (current_tenant_id, is_super_admin, trigger_set_updated_at, etc.)
3. **02_tenants.sql** - Platform tables (tenants, subscriptions, users)
4. **03_crm.sql** - CRM tables (customers, jobs, quotes, pipeline)
5. **04_compliance.sql** - UK compliance tables (MCS, DNO, Part P, legal holds)
6. **05_calendar.sql** - Calendar and appointments
7. **06_communications.sql** - Messages, email, SMS, WhatsApp
8. **07_portal.sql** - Customer portal
9. **08_integrations.sql** - Webhooks, accounting, API keys
10. **09_ai_automation.sql** - AI agents and automation rules
11. **10_features_analytics.sql** - Feature flags and usage tracking
12. **11_routing.sql** - Visit queues and route optimization
13. **12_seed_data.sql** - Reference data (DNO regions, job stages, features)
14. **13_rls_policies.sql** - Row Level Security policies

## Migration Tool

Migrations will be managed using Supabase CLI:

```bash
# Create new migration
supabase migration new migration_name

# Apply migrations locally
supabase db reset

# Apply migrations to production
supabase db push --db-url <production-url>
```

## Database Schema

- **Total Tables**: 72 (68 core + 4 reference)
- **Extensions**: 4 (uuid-ossp, pg_trgm, postgis, citext)
- **Helper Functions**: 4 (tenant isolation, optimistic locking, distance calc, token gen)
- **RLS Policies**: Enabled on all tenant-scoped tables

See [`docs/02-DATA-MODEL.md`](../../docs/02-DATA-MODEL.md) for complete schema documentation.

---

**Status**: 📋 Planning Phase | Migrations will be generated after API spec completion
