import { NextRequest, NextResponse } from 'next/server'

/**
 * Simple test endpoint to verify webhooks work
 * Visit: https://cold-lava-bos-app.vercel.app/api/webhooks/test
 */
export async function GET(request: NextRequest) {
  console.log('[TEST WEBHOOK] GET called!')
  console.log('[TEST WEBHOOK] URL:', request.url)
  console.log('[TEST WEBHOOK] Headers:', Object.fromEntries(request.headers))

  return NextResponse.json({
    success: true,
    message: 'Test webhook works!',
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  console.log('[TEST WEBHOOK] POST called!')
  console.log('[TEST WEBHOOK] URL:', request.url)
  console.log('[TEST WEBHOOK] Headers:', Object.fromEntries(request.headers))

  const body = await request.text()
  console.log('[TEST WEBHOOK] Body:', body)

  return NextResponse.json({
    success: true,
    message: 'Test POST webhook works!',
    receivedBody: body,
    timestamp: new Date().toISOString()
  })
}
