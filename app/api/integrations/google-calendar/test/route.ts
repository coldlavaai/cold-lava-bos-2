import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import {
  resolveGoogleCalendarCredentials,
  refreshGoogleCalendarToken,
} from '@/lib/services/integrations.service'
import type { TestIntegrationResponse } from '@/lib/api/types'

/**
 * POST /api/integrations/google-calendar/test
 * Test Google Calendar connection by listing calendars
 * Session 91: Real OAuth implementation with token refresh
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

    // Resolve Google Calendar credentials
    const credentials = await resolveGoogleCalendarCredentials(tenantId)

    if (!credentials) {
      return NextResponse.json({
        data: {
          success: false,
          message: 'Google Calendar not connected. Please connect your Google Calendar first.',
        } as TestIntegrationResponse,
      })
    }

    // Check if token is expired
    const expiresAt = new Date(credentials.expiresAt)
    const now = new Date()

    if (expiresAt <= now) {
      console.log('[Google Calendar Test] Token expired, attempting refresh')
      const refreshed = await refreshGoogleCalendarToken(tenantId, user.id)

      if (!refreshed) {
        return NextResponse.json({
          data: {
            success: false,
            message: 'Your Google Calendar connection has expired. Please reconnect.',
          } as TestIntegrationResponse,
        })
      }

      // Get refreshed credentials
      const refreshedCredentials = await resolveGoogleCalendarCredentials(tenantId)
      if (!refreshedCredentials) {
        return NextResponse.json({
          data: {
            success: false,
            message: 'Failed to refresh Google Calendar token. Please reconnect.',
          } as TestIntegrationResponse,
        })
      }
      credentials.accessToken = refreshedCredentials.accessToken
    }

    // Test connection by listing calendars
    const calendarResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
          'Accept': 'application/json',
        },
      }
    )

    if (!calendarResponse.ok) {
      const errorData = await calendarResponse.json().catch(() => ({}))
      console.error('[Google Calendar Test] API error:', errorData)

      // Update last_error
      await supabase
        .from('integration_connections')
        .update({
          last_error: `Google Calendar API error: ${calendarResponse.status}`,
        })
        .eq('tenant_id', tenantId)
        .eq('integration_type', 'google_calendar')

      return NextResponse.json({
        data: {
          success: false,
          message: `Google Calendar API error: ${calendarResponse.status} ${calendarResponse.statusText}`,
        } as TestIntegrationResponse,
      })
    }

    const data = await calendarResponse.json() as {
      items?: Array<{
        id: string
        summary: string
        primary?: boolean
      }>
    }

    // Update last_verified_at
    await supabase
      .from('integration_connections')
      .update({
        last_verified_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('tenant_id', tenantId)
      .eq('integration_type', 'google_calendar')

    const calendarsCount = data.items?.length || 0
    const primaryCalendar = data.items?.find(cal => cal.primary)

    return NextResponse.json({
      data: {
        success: true,
        message: `Successfully connected to Google Calendar`,
        details: {
          calendarsCount,
          primaryCalendar: primaryCalendar?.summary || 'Unknown',
          scopes: credentials.scopes,
        },
      } as TestIntegrationResponse,
    })
  } catch (error) {
    console.error('Error in POST /api/integrations/google-calendar/test:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
