/**
 * Basic Health Check Endpoint (Liveness Probe)
 *
 * Enterprise Readiness: Required for Vercel monitoring and load balancer health checks
 * Returns 200 OK if the application is running
 *
 * Usage:
 * - Vercel monitoring: Checks if the app process is alive
 * - Load balancers: Basic liveness check
 * - Uptime monitoring services
 *
 * This endpoint does NOT check dependencies (database, external APIs)
 * For comprehensive readiness checks, use /api/health/ready
 */

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'cold-lava-bos',
      version: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
    },
    { status: 200 }
  )
}

// Allow unauthenticated access (health checks should be public)
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
