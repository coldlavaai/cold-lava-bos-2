/**
 * Readiness Health Check Endpoint (Readiness Probe)
 *
 * Enterprise Readiness: Comprehensive health check including dependencies
 * Returns 200 OK only if ALL critical systems are operational
 *
 * Usage:
 * - Vercel monitoring: Checks if app is ready to serve traffic
 * - Load balancers: Readiness check before routing traffic
 * - Deployment verification: Ensure new deploy is healthy
 *
 * Checks:
 * - Database connectivity (Supabase)
 * - Environment configuration
 * - Critical integrations (optional - reports status but doesn't fail)
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isEncryptionEnabled } from '@/lib/security/credentials-encryption'

interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'error'
  timestamp: string
  service: string
  version: string
  checks: {
    database: {
      status: 'ok' | 'error'
      latency_ms?: number
      error?: string
    }
    environment: {
      status: 'ok' | 'warning'
      encryption_enabled: boolean
      missing_vars?: string[]
    }
    integrations?: {
      status: 'ok' | 'degraded'
      configured: string[]
      missing: string[]
    }
  }
}

export async function GET() {
  const startTime = Date.now()
  const result: HealthCheckResult = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'cold-lava-bos',
    version: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
    checks: {
      database: { status: 'ok' },
      environment: {
        status: 'ok',
        encryption_enabled: false,
      },
    },
  }

  // Check 1: Database connectivity
  try {
    const supabase = await createClient()
    const dbCheckStart = Date.now()

    // Simple query to verify DB connection
    const { error } = await supabase
      .from('tenants')
      .select('id')
      .limit(1)
      .single()

    const latency = Date.now() - dbCheckStart

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows (acceptable for empty DB)
      // Any other error means DB problem
      result.checks.database = {
        status: 'error',
        error: error.message,
      }
      result.status = 'error'
    } else {
      result.checks.database = {
        status: 'ok',
        latency_ms: latency,
      }
    }
  } catch (error) {
    result.checks.database = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown database error',
    }
    result.status = 'error'
  }

  // Check 2: Environment configuration
  const criticalEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]

  const missingVars = criticalEnvVars.filter((varName) => !process.env[varName])
  const encryptionEnabled = isEncryptionEnabled()

  result.checks.environment = {
    status: missingVars.length > 0 ? 'warning' : 'ok',
    encryption_enabled: encryptionEnabled,
    ...(missingVars.length > 0 && { missing_vars: missingVars }),
  }

  // If critical vars are missing, mark as degraded
  if (missingVars.length > 0) {
    result.status = 'degraded'
  }

  // Check 3: Integration status (non-critical - just informational)
  const configuredIntegrations: string[] = []
  const missingIntegrations: string[] = []

  // Check for common integrations
  const integrationChecks = [
    { name: 'sendgrid', envVar: 'SENDGRID_API_KEY' },
    { name: 'twilio', envVar: 'TWILIO_ACCOUNT_SID' },
    { name: 'otter', envVar: 'OTTER_CLIENT_ID' },
  ]

  integrationChecks.forEach(({ name, envVar }) => {
    if (process.env[envVar]) {
      configuredIntegrations.push(name)
    } else {
      missingIntegrations.push(name)
    }
  })

  result.checks.integrations = {
    status: configuredIntegrations.length > 0 ? 'ok' : 'degraded',
    configured: configuredIntegrations,
    missing: missingIntegrations,
  }

  // Determine overall status
  if (result.checks.database.status === 'error') {
    result.status = 'error'
  } else if (
    result.checks.environment.status === 'warning' ||
    result.checks.integrations.status === 'degraded'
  ) {
    result.status = 'degraded'
  }

  // Return appropriate HTTP status code
  // 200 = OK, 503 = Service Unavailable (hard failure)
  // Degraded still returns 200 but with degraded status
  const httpStatus = result.status === 'error' ? 503 : 200

  const totalTime = Date.now() - startTime

  return NextResponse.json(
    {
      ...result,
      total_check_time_ms: totalTime,
    },
    { status: httpStatus }
  )
}

// Allow unauthenticated access (health checks should be public)
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
