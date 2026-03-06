import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { generateQuotePDF } from '@/lib/pdf/quote-pdf'
import sgMail from '@sendgrid/mail'

// POST /api/quotes/:id/email - Send quote by email with PDF attachment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const { id } = await params

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    // Parse request body for optional overrides
    const body = await request.json()
    const { to: toOverride, subject: subjectOverride, message: additionalMessage } = body

    // Fetch quote with all necessary expanded data
    const { data: quote, error } = await supabase
      .from('quotes')
      .select(`
        *,
        line_items:quote_line_items(id, description, quantity, unit_price, total_price, position),
        job:jobs(
          id,
          job_number,
          customer:customers(
            id,
            name,
            email,
            phone,
            address_line_1,
            address_line_2,
            city,
            postcode
          )
        )
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Quote not found' },
          { status: 404 }
        )
      }

      console.error('Error fetching quote for email:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Determine recipient email
    const customerEmail = quote.job?.customer?.email
    const recipientEmail = toOverride || customerEmail

    if (!recipientEmail) {
      return NextResponse.json(
        { error: 'No customer email available. Please provide a "to" address in the request body.' },
        { status: 400 }
      )
    }

    // Get tenant details for email sender and PDF
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single()

    const tenantName = tenant?.name || 'Cold Lava'

    // Check for SendGrid API key
    if (!process.env.SENDGRID_API_KEY) {
      console.error('SENDGRID_API_KEY environment variable not set')
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      )
    }

    // Initialize SendGrid
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)

    // Generate PDF
    const pdfBuffer = await generateQuotePDF(quote, tenantName)

    // Prepare email content
    const subject = subjectOverride || `Quote ${quote.quote_number} from ${tenantName}`

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Quote ${quote.quote_number}</h2>
        <p>Dear ${quote.job?.customer?.name || 'Customer'},</p>
        <p>Please find attached your quote for Job ${quote.job?.job_number || 'N/A'}.</p>
        ${additionalMessage ? `<p>${additionalMessage}</p>` : ''}
        <p><strong>Quote Details:</strong></p>
        <ul>
          <li>Quote Number: ${quote.quote_number}</li>
          <li>Total Amount: £${quote.total_amount?.toFixed(2) || '0.00'}</li>
          ${quote.valid_until ? `<li>Valid Until: ${new Date(quote.valid_until).toLocaleDateString('en-GB')}</li>` : ''}
        </ul>
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <p>Best regards,<br>${tenantName}</p>
      </div>
    `

    // Prepare email message with PDF attachment
    const msg = {
      to: recipientEmail,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@coldlava.co.uk',
      subject,
      html: htmlBody,
      attachments: [
        {
          content: pdfBuffer.toString('base64'),
          filename: `${quote.quote_number}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment',
        },
      ],
    }

    // Send email
    await sgMail.send(msg)

    // Update quote status to 'sent' if currently 'draft'
    let updatedStatus = quote.status
    if (quote.status === 'draft') {
      const { error: updateError } = await supabase
        .from('quotes')
        .update({ status: 'sent' })
        .eq('id', id)
        .eq('tenant_id', tenantId)

      if (!updateError) {
        updatedStatus = 'sent'
      }
    }

    return NextResponse.json({
      message: 'Quote emailed successfully',
      data: {
        id: quote.id,
        status: updatedStatus,
        to: recipientEmail,
      },
    })
  } catch (error) {
    console.error('Error in POST /api/quotes/:id/email:', error)

    // Handle SendGrid specific errors
    if (error && typeof error === 'object' && 'response' in error) {
      const sgError = error as { response?: { body?: { errors?: Array<{ message: string }> } } }
      const errorMessage = sgError.response?.body?.errors?.[0]?.message || 'Failed to send email'
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
