import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders, getUserIdFromHeaders } from '@/lib/supabase/tenant-context'
import { sendOutlookEmail, refreshOutlookToken } from '@/lib/integrations/outlook'
import { headers } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const userId = await getUserIdFromHeaders(headersList)

    if (!tenantId || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Parse request body (FormData or JSON)
    const contentType = request.headers.get('content-type') || ''
    let integrationId: string
    let to: string
    let cc: string | null = null
    let bcc: string | null = null
    let subject = ''
    let emailBody: string
    let bodyType: 'text' | 'html' = 'text'
    let customerId: string | null = null
    let signatureId: string | null = null
    const attachments: Array<{ name: string; contentType: string; contentBytes: string }> = []
    const uploadedFiles: Array<{ file_name: string; file_type: string; file_size: number; storage_path: string }> = []

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      integrationId = formData.get('integrationId') as string
      to = formData.get('to') as string
      cc = formData.get('cc') as string | null
      bcc = formData.get('bcc') as string | null
      subject = (formData.get('subject') as string) || ''
      emailBody = formData.get('body') as string
      bodyType = (formData.get('bodyType') as string) === 'html' ? 'html' : 'text'
      customerId = formData.get('customerId') as string | null
      signatureId = formData.get('signatureId') as string | null

      const files = formData.getAll('files') as File[]
      for (const file of files) {
        if (file && file.size > 0) {
          const buffer = Buffer.from(await file.arrayBuffer())
          const storagePath = `${tenantId}/${userId}/${Date.now()}-${file.name}`

          await supabase.storage
            .from('customer-files')
            .upload(storagePath, buffer, {
              contentType: file.type || 'application/octet-stream',
              upsert: false,
            })

          attachments.push({
            name: file.name,
            contentType: file.type || 'application/octet-stream',
            contentBytes: buffer.toString('base64'),
          })

          uploadedFiles.push({
            file_name: file.name,
            file_type: file.type || 'application/octet-stream',
            file_size: file.size,
            storage_path: storagePath,
          })
        }
      }
    } else {
      const body = await request.json()
      integrationId = body.integrationId
      to = body.to
      cc = body.cc
      bcc = body.bcc
      subject = body.subject || ''
      emailBody = body.body
      bodyType = body.bodyType === 'html' ? 'html' : 'text'
      customerId = body.customerId
      signatureId = body.signatureId || null
    }

    if (!integrationId || !to || !emailBody) {
      return NextResponse.json(
        { error: 'Missing required fields: integrationId, to, body' },
        { status: 400 }
      )
    }

    // Get integration
    const { data: integration, error: integrationError } = await supabase
      .from('email_integrations')
      .select('*')
      .eq('id', integrationId)
      .eq('tenant_id', tenantId)
      .in('provider', ['outlook', 'office365'])
      .single()

    if (integrationError || !integration) {
      return NextResponse.json({ error: 'Outlook integration not found' }, { status: 404 })
    }

    // Token refresh
    let accessToken = integration.access_token
    if (new Date(integration.token_expires_at) <= new Date()) {
      const tokens = await refreshOutlookToken(integration.refresh_token)
      await supabase
        .from('email_integrations')
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || integration.refresh_token,
          token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        })
        .eq('id', integration.id)
      accessToken = tokens.access_token
    }

    // Append signature
    let emailBodyWithSignature = emailBody
    if (signatureId) {
      const { data: signature } = await supabase
        .from('email_signatures')
        .select('html_content, text_content')
        .eq('id', signatureId)
        .single()

      if (signature) {
        const sigContent = bodyType === 'html' ? signature.html_content : signature.text_content
        emailBodyWithSignature = bodyType === 'html'
          ? `${emailBody}<br><br>${sigContent}`
          : `${emailBody}\n\n${sigContent}`
      }
    }

    // Send email
    await sendOutlookEmail(accessToken, {
      to: Array.isArray(to) ? to : [to],
      cc: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
      bcc: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined,
      subject,
      body: emailBodyWithSignature,
      bodyType: bodyType === 'html' ? 'HTML' : 'Text',
      attachments: attachments.length > 0 ? attachments : undefined,
    })

    // Store in database
    const toEmails = Array.isArray(to) ? to : [to]

    let linkedCustomerId = customerId
    if (!linkedCustomerId && toEmails.length === 1) {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('tenant_id', tenantId)
        .ilike('email', toEmails[0])
        .maybeSingle()
      linkedCustomerId = customer?.id || null
    }

    const { data: emailThread } = await supabase
      .from('email_threads_synced')
      .insert({
        tenant_id: tenantId,
        integration_id: integration.id,
        customer_id: linkedCustomerId,
        provider: 'outlook',
        provider_message_id: `sent-${Date.now()}`,
        from_email: integration.email_address,
        from_name: integration.display_name,
        to_emails: toEmails,
        cc_emails: cc ? [cc] : [],
        subject,
        body_text: bodyType === 'text' ? emailBody : null,
        body_html: bodyType === 'html' ? emailBody : null,
        direction: 'outbound',
        signature_id: signatureId,
        is_read: true,
        is_sent: true,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single()

    // Save attachments
    if (uploadedFiles.length > 0 && emailThread) {
      await supabase.from('email_attachments').insert(
        uploadedFiles.map((file) => ({
          tenant_id: tenantId,
          email_thread_id: emailThread.id,
          file_name: file.file_name,
          file_type: file.file_type,
          file_size: file.file_size,
          storage_path: file.storage_path,
        }))
      )
    }

    return NextResponse.json({ success: true, message: 'Email sent successfully' })
  } catch (error: unknown) {
    console.error('Error sending Outlook email:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    )
  }
}
