/**
 * Session 109: Google Calendar Service
 * Handles sync between BOS appointments and Google Calendar
 */

import { createClient } from '@/lib/supabase/server'

interface GoogleCalendarEvent {
  id?: string
  summary: string
  description?: string
  start: {
    dateTime: string
    timeZone?: string
  }
  end: {
    dateTime: string
    timeZone?: string
  }
  location?: string
  attendees?: Array<{
    email: string
    displayName?: string
    responseStatus?: string
  }>
  colorId?: string
  reminders?: {
    useDefault: boolean
    overrides?: Array<{
      method: 'email' | 'popup'
      minutes: number
    }>
  }
}

interface GoogleCalendarCredentials {
  access_token: string
  refresh_token?: string
  expires_at: string
  token_type: string
}

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

/**
 * Get stored Google Calendar credentials for a tenant
 */
export async function getGoogleCalendarCredentials(tenantId: string): Promise<GoogleCalendarCredentials | null> {
  const supabase = await createClient()
  
  const { data: integration, error } = await supabase
    .from('integration_connections')
    .select('credentials, credentials_encrypted')
    .eq('tenant_id', tenantId)
    .eq('integration_type', 'google_calendar')
    .eq('is_active', true)
    .single()
  
  if (error || !integration) {
    console.error('[Google Calendar] No credentials found:', error)
    return null
  }
  
  // TODO: Decrypt credentials if encrypted
  // For now, assuming credentials are stored as JSON
  return integration.credentials as GoogleCalendarCredentials
}

/**
 * Refresh access token if expired
 */
export async function refreshGoogleToken(
  tenantId: string,
  refreshToken: string
): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  
  if (!clientId || !clientSecret) {
    console.error('[Google Calendar] Missing OAuth config')
    return null
  }
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  })
  
  if (!response.ok) {
    console.error('[Google Calendar] Token refresh failed')
    return null
  }
  
  const data = await response.json()
  
  // Update stored credentials
  const supabase = await createClient()
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()
  
  await supabase
    .from('integration_connections')
    .update({
      credentials: {
        access_token: data.access_token,
        refresh_token: refreshToken, // Keep existing refresh token
        expires_at: expiresAt,
        token_type: data.token_type,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('integration_type', 'google_calendar')
  
  return data.access_token
}

/**
 * Get valid access token (refreshing if needed)
 */
export async function getValidAccessToken(tenantId: string): Promise<string | null> {
  const credentials = await getGoogleCalendarCredentials(tenantId)
  
  if (!credentials) {
    return null
  }
  
  // Check if token is expired (with 5 min buffer)
  const expiresAt = new Date(credentials.expires_at)
  const now = new Date(Date.now() + 5 * 60 * 1000)
  
  if (now >= expiresAt && credentials.refresh_token) {
    return refreshGoogleToken(tenantId, credentials.refresh_token)
  }
  
  return credentials.access_token
}

/**
 * Create event in Google Calendar
 */
export async function createGoogleCalendarEvent(
  tenantId: string,
  event: GoogleCalendarEvent,
  calendarId: string = 'primary'
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  const accessToken = await getValidAccessToken(tenantId)
  
  if (!accessToken) {
    return { success: false, error: 'No valid access token' }
  }
  
  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  )
  
  if (!response.ok) {
    const error = await response.text()
    console.error('[Google Calendar] Create event failed:', error)
    return { success: false, error }
  }
  
  const data = await response.json()
  return { success: true, eventId: data.id }
}

/**
 * Update event in Google Calendar
 */
export async function updateGoogleCalendarEvent(
  tenantId: string,
  eventId: string,
  event: Partial<GoogleCalendarEvent>,
  calendarId: string = 'primary'
): Promise<{ success: boolean; error?: string }> {
  const accessToken = await getValidAccessToken(tenantId)
  
  if (!accessToken) {
    return { success: false, error: 'No valid access token' }
  }
  
  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  )
  
  if (!response.ok) {
    const error = await response.text()
    console.error('[Google Calendar] Update event failed:', error)
    return { success: false, error }
  }
  
  return { success: true }
}

/**
 * Delete event from Google Calendar
 */
export async function deleteGoogleCalendarEvent(
  tenantId: string,
  eventId: string,
  calendarId: string = 'primary'
): Promise<{ success: boolean; error?: string }> {
  const accessToken = await getValidAccessToken(tenantId)
  
  if (!accessToken) {
    return { success: false, error: 'No valid access token' }
  }
  
  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  )
  
  if (!response.ok && response.status !== 404) {
    const error = await response.text()
    console.error('[Google Calendar] Delete event failed:', error)
    return { success: false, error }
  }
  
  return { success: true }
}

/**
 * Sync BOS appointment to Google Calendar
 */
export async function syncAppointmentToGoogle(
  tenantId: string,
  appointment: {
    id: string
    title: string
    description?: string
    starts_at: string
    ends_at: string
    location?: string
    customer_email?: string
    customer_name?: string
    google_event_id?: string
  }
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  const event: GoogleCalendarEvent = {
    summary: appointment.title,
    description: appointment.description,
    start: {
      dateTime: appointment.starts_at,
      timeZone: 'Europe/London', // Default to UK timezone
    },
    end: {
      dateTime: appointment.ends_at,
      timeZone: 'Europe/London',
    },
    location: appointment.location,
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 30 },
        { method: 'email', minutes: 1440 }, // 24 hours
      ],
    },
  }
  
  // Add customer as attendee if email provided
  if (appointment.customer_email) {
    event.attendees = [{
      email: appointment.customer_email,
      displayName: appointment.customer_name,
    }]
  }
  
  // Update existing or create new
  if (appointment.google_event_id) {
    const result = await updateGoogleCalendarEvent(
      tenantId,
      appointment.google_event_id,
      event
    )
    return { ...result, eventId: appointment.google_event_id }
  }
  
  return createGoogleCalendarEvent(tenantId, event)
}

/**
 * List events from Google Calendar
 */
export async function listGoogleCalendarEvents(
  tenantId: string,
  options: {
    calendarId?: string
    timeMin?: string
    timeMax?: string
    maxResults?: number
  } = {}
): Promise<{ success: boolean; events?: GoogleCalendarEvent[]; error?: string }> {
  const accessToken = await getValidAccessToken(tenantId)
  
  if (!accessToken) {
    return { success: false, error: 'No valid access token' }
  }
  
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
  })
  
  if (options.timeMin) params.set('timeMin', options.timeMin)
  if (options.timeMax) params.set('timeMax', options.timeMax)
  if (options.maxResults) params.set('maxResults', String(options.maxResults))
  
  const calendarId = options.calendarId || 'primary'
  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  )
  
  if (!response.ok) {
    const error = await response.text()
    console.error('[Google Calendar] List events failed:', error)
    return { success: false, error }
  }
  
  const data = await response.json()
  return { success: true, events: data.items || [] }
}

/**
 * Test Google Calendar connection
 */
export async function testGoogleCalendarConnection(
  tenantId: string
): Promise<{ success: boolean; email?: string; calendars?: string[]; error?: string }> {
  const accessToken = await getValidAccessToken(tenantId)
  
  if (!accessToken) {
    return { success: false, error: 'No valid access token' }
  }
  
  // Get user info
  const userResponse = await fetch(
    'https://www.googleapis.com/oauth2/v2/userinfo',
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  )
  
  if (!userResponse.ok) {
    return { success: false, error: 'Failed to get user info' }
  }
  
  const userInfo = await userResponse.json()
  
  // Get calendar list
  const calendarResponse = await fetch(
    `${GOOGLE_CALENDAR_API}/users/me/calendarList`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  )
  
  if (!calendarResponse.ok) {
    return { success: false, error: 'Failed to list calendars' }
  }
  
  const calendarData = await calendarResponse.json()
  const calendars = (calendarData.items || []).map((cal: { summary: string }) => cal.summary)
  
  return {
    success: true,
    email: userInfo.email,
    calendars,
  }
}
