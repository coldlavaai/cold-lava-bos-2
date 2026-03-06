import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies, headers } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  const headersList = await headers()
  // Prefer tenant context from cookies (set by middleware) and
  // fall back to headers for backward compatibility.
  const tenantId =
    cookieStore.get('sb-tenant-id')?.value ?? headersList.get('x-tenant-id') ?? undefined

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
      global: {
        headers: tenantId
          ? { 'x-tenant-id': tenantId }
          : {},
      },
    }
  )

  // Set PostgreSQL session variable for RLS policies
  // This ensures current_tenant_id() function returns the correct tenant
  if (tenantId) {
    await client.rpc('set_tenant_context', {
      p_tenant_id: tenantId,
    })
  }

  return client
}

// Create an admin client for service role operations
// Uses regular supabase-js client (not SSR) since we don't need cookie management
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
