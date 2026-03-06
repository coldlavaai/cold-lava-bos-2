import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { resolveEmailCredentials } from '@/lib/services/integrations.service'
import type { TestEmailRequest } from '@/lib/api/types'
import sgMail from '@sendgrid/mail'

/**
 * POST /api/integrations/communications/email/test
 * Send a test email using the tenant's configured SendGrid integration
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json() as TestEmailRequest

    // Get test email address (default to current user's email)
    const toEmail = body.toEmail || user.email

    if (!toEmail) {
      return NextResponse.json(
        { error: 'No email address specified' },
        { status: 400 }
      )
    }

    // Resolve email credentials
    const creds = await resolveEmailCredentials(tenantId)

    if (!creds) {
      return NextResponse.json(
        { error: 'Email integration not configured' },
        { status: 400 }
      )
    }

    // Send test email via SendGrid
    sgMail.setApiKey(creds.apiKey)

    const msg = {
      to: toEmail,
      from: {
        email: creds.fromEmail,
        name: creds.fromName || 'BOS Communications',
      },
      subject: 'Test Email from BOS Communications',
      text: 'This is a test email sent from your BOS communications integrations. If you received this email, your SendGrid integration is configured correctly!',
      html: '<p>This is a test email sent from your <strong>BOS communications integrations</strong>.</p><p>If you received this email, your SendGrid integration is configured correctly!</p>',
    }

    await sgMail.send(msg)

    return NextResponse.json({
      success: true,
      message: `Test email sent successfully to ${toEmail}`,
    })
  } catch (error: unknown) {
    console.error('Error sending test email:', error)

    // Handle SendGrid-specific errors
    if (error && typeof error === 'object' && 'response' in error) {
      const sgError = error as { response: { body: { errors: Array<{ message: string }> } } }
      const errorMessage = sgError.response?.body?.errors?.[0]?.message || 'SendGrid API error'
      return NextResponse.json(
        {
          success: false,
          message: `Failed to send test email: ${errorMessage}`,
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to send test email. Please check your configuration.',
      },
      { status: 500 }
    )
  }
}
