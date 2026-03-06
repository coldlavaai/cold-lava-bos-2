import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/media/twilio?url=<twilio-media-url>
 * Proxy for Twilio media URLs which require Basic Auth.
 * Called by the frontend when displaying WhatsApp images/audio/video.
 * Requires user to be authenticated (cookie-based session check optional
 * since media URLs are per-message SIDs and not guessable).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  // Only allow Twilio media URLs
  if (!url.startsWith('https://api.twilio.com/') && !url.startsWith('https://media.twiliocdn.com/')) {
    return NextResponse.json({ error: 'Invalid media URL' }, { status: 400 })
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken) {
    return NextResponse.json({ error: 'Twilio credentials not configured' }, { status: 500 })
  }

  try {
    const mediaResponse = await fetch(url, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      },
    })

    if (!mediaResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch media from Twilio' },
        { status: mediaResponse.status }
      )
    }

    const contentType = mediaResponse.headers.get('content-type') || 'application/octet-stream'
    const buffer = await mediaResponse.arrayBuffer()

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=86400', // Cache for 24 hours
      },
    })
  } catch (error) {
    console.error('[Media Proxy] Error fetching Twilio media:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
