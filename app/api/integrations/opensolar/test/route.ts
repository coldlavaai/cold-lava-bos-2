import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { resolveOpenSolarCredentials } from '@/lib/services/integrations.service'
import type { TestOpenSolarResponse } from '@/lib/api/types'

/**
 * POST /api/integrations/opensolar/test
 * Test OpenSolar connection using stored credentials
 * Session 90: OpenSolar test endpoint
 */
export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    // Resolve OpenSolar credentials
    console.log('[OpenSolar Test] Resolving credentials for tenant:', tenantId)
    const credentials = await resolveOpenSolarCredentials(tenantId)
    
    console.log('[OpenSolar Test] Credentials resolved:', {
      hasCredentials: !!credentials,
      hasUsername: !!credentials?.username,
      hasPassword: !!credentials?.password,
      hasApiKey: !!credentials?.apiKey,
      hasOrgId: !!credentials?.organizationId,
      orgId: credentials?.organizationId,
      username: credentials?.username ? credentials.username.substring(0, 3) + '***' : null,
    })

    if (!credentials) {
      console.log('[OpenSolar Test] No credentials found')
      return NextResponse.json({
        data: {
          success: false,
          message: 'OpenSolar integration not configured',
        } as TestOpenSolarResponse,
      })
    }

    // OpenSolar API requires organization ID in the URL path
    if (!credentials.organizationId) {
      return NextResponse.json({
        data: {
          success: false,
          message: 'Organization ID is required for OpenSolar API. Please configure it in the integration settings.',
        } as TestOpenSolarResponse,
      })
    }

    // Test connection by calling OpenSolar API
    // First get a bearer token using username/password via /api-token-auth/
    try {
      let authToken = credentials.apiKey

      // If we have username/password, get a token first
      if (credentials.username && credentials.password) {
        console.log('[OpenSolar Test] Getting bearer token via /api-token-auth/')
        
        const tokenResponse = await fetch('https://api.opensolar.com/api-token-auth/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: credentials.username,
            password: credentials.password,
          }),
        })

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text()
          console.error('[OpenSolar Test] Token auth failed:', {
            status: tokenResponse.status,
            error: errorText,
          })

          let message = 'Authentication failed. Please check your OpenSolar email and password.'
          if (tokenResponse.status === 400) {
            message = 'Invalid credentials. Please check your OpenSolar email and password.'
          }

          return NextResponse.json({
            data: {
              success: false,
              message,
            } as TestOpenSolarResponse,
          })
        }

        const tokenData = await tokenResponse.json()
        authToken = tokenData.token
        
        if (!authToken) {
          console.error('[OpenSolar Test] No token in response:', tokenData)
          return NextResponse.json({
            data: {
              success: false,
              message: 'Authentication succeeded but no token received',
            } as TestOpenSolarResponse,
          })
        }

        console.log('[OpenSolar Test] Got bearer token successfully')
      }

      if (!authToken) {
        return NextResponse.json({
          data: {
            success: false,
            message: 'No credentials configured. Please enter your OpenSolar email and password.',
          } as TestOpenSolarResponse,
        })
      }

      // Now test the API with our token
      // OpenSolar API structure: /api/orgs/:org_id/projects/
      const apiUrl = `https://api.opensolar.com/api/orgs/${credentials.organizationId}/projects/?limit=1`
      
      console.log('[OpenSolar Test] Testing API access to:', apiUrl)
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[OpenSolar Test] API error:', {
          status: response.status,
          error: errorText,
          url: apiUrl,
        })

        // Provide helpful error messages for common issues
        let message = `OpenSolar API error: ${response.status} ${response.statusText}`
        if (response.status === 401) {
          message = 'Authentication failed. Please check your OpenSolar credentials.'
        } else if (response.status === 403) {
          message = 'Access denied. Your account may not have permission to access this organization.'
        } else if (response.status === 404) {
          message = 'Organization not found. Please check your Organization ID.'
        }

        return NextResponse.json({
          data: {
            success: false,
            message,
          } as TestOpenSolarResponse,
        })
      }

      const data = await response.json()

      // Update last_verified_at in integration_connections
      await supabase
        .from('integration_connections')
        .update({
          last_verified_at: new Date().toISOString(),
          last_error: null,
        })
        .eq('tenant_id', tenantId)
        .eq('integration_type', 'opensolar')

      // OpenSolar returns an array of projects
      const projectsCount = Array.isArray(data) ? data.length : 0
      const orgName = Array.isArray(data) && data[0]?.org_name ? data[0].org_name : 'Connected'

      return NextResponse.json({
        data: {
          success: true,
          message: 'Successfully connected to OpenSolar',
          details: {
            organizationName: orgName,
            projectsCount: projectsCount,
          },
        } as TestOpenSolarResponse,
      })
    } catch (apiError) {
      console.error('[OpenSolar Test] Connection error:', apiError)

      // Update last_error in integration_connections
      await supabase
        .from('integration_connections')
        .update({
          last_error: apiError instanceof Error ? apiError.message : 'Connection failed',
        })
        .eq('tenant_id', tenantId)
        .eq('integration_type', 'opensolar')

      return NextResponse.json({
        data: {
          success: false,
          message: apiError instanceof Error ? apiError.message : 'Failed to connect to OpenSolar',
        } as TestOpenSolarResponse,
      })
    }
  } catch (error) {
    console.error('Error in POST /api/integrations/opensolar/test:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
