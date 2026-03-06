import { NextRequest, NextResponse } from 'next/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { getTenantApiKeys, addTenantApiKey, deleteTenantApiKey } from '@/lib/auth/api-key'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

/**
 * API Key Management Endpoints
 * Session 63 - Phase API-3
 *
 * GET    /api/api-keys - List API keys for tenant
 * POST   /api/api-keys - Create new API key
 * DELETE /api/api-keys?id=xxx - Delete API key
 */

export async function GET(_request: NextRequest) {
  try {
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 })
    }

    const apiKeys = await getTenantApiKeys(tenantId)

    // Don't return key_hash (sensitive)
    const safeKeys = apiKeys.map(({ key_hash: _key_hash, ...rest }) => rest)

    return NextResponse.json({ data: safeKeys })
  } catch (error) {
    console.error('[GET /api/api-keys] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 })
    }

    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Get user ID for audit
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || null

    const { key, apiKey } = await addTenantApiKey(tenantId, name.trim(), userId)

    // Return the key ONCE (user must save it, we don't store it)
    return NextResponse.json({
      data: {
        key, // Full key returned only on creation
        apiKey: {
          ...apiKey,
          key_hash: undefined // Don't return hash
        }
      }
    }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/api-keys] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const apiKeyId = searchParams.get('id')

    if (!apiKeyId) {
      return NextResponse.json({ error: 'API key ID is required' }, { status: 400 })
    }

    await deleteTenantApiKey(tenantId, apiKeyId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/api-keys] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
