/**
 * Permission helpers for role-based access control
 * Session 73 - Per-User Pipelines & Job Board Permissions
 */

/**
 * Determines if a user can view all jobs in their tenant
 * @param role - The user's role from tenant_users.role
 * @returns true if user can view all jobs, false if only their own
 */
export function canViewAllJobs(role: string | null): boolean {
  // Only admin role can view all jobs
  // All other roles (sales, ops, finance, viewer) can only see their own
  return role === 'admin'
}

/**
 * Determines if a user is an admin
 * @param role - The user's role from tenant_users.role
 * @returns true if user is an admin
 */
export function isAdmin(role: string | null): boolean {
  return role === 'admin'
}
