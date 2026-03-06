/**
 * Session 104: Reviews API - Invitations
 * POST /api/reviews/invitations - Send review invitation via email or SMS
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getTenantIdFromHeaders, getUserIdFromHeaders } from "@/lib/supabase/tenant-context"
import { sendSmsDirect, sendEmailDirect } from "@/lib/services/messaging.service"

interface ReviewInvitationRequest {
  customer_id: string
  job_id?: string
  channel: "email" | "sms"
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const tenantId = await getTenantIdFromHeaders(request.headers)
    const userId = await getUserIdFromHeaders(request.headers)

    if (!tenantId || !userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json() as ReviewInvitationRequest

    // Validate required fields
    if (!body.customer_id || !body.channel) {
      return NextResponse.json(
        { error: "Missing required fields: customer_id, channel" },
        { status: 400 }
      )
    }

    if (!["email", "sms"].includes(body.channel)) {
      return NextResponse.json(
        { error: "Invalid channel. Must be 'email' or 'sms'" },
        { status: 400 }
      )
    }

    // Get customer details
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, first_name, last_name, email, phone")
      .eq("id", body.customer_id)
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .single()

    if (customerError || !customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      )
    }

    // Validate customer has required contact info
    if (body.channel === "email" && !customer.email) {
      return NextResponse.json(
        { error: "Customer does not have an email address" },
        { status: 400 }
      )
    }

    if (body.channel === "sms" && !customer.phone) {
      return NextResponse.json(
        { error: "Customer does not have a phone number" },
        { status: 400 }
      )
    }

    // Get job details if provided
    let job = null
    if (body.job_id) {
      const { data: jobData, error: jobError } = await supabase
        .from("jobs")
        .select("id, job_number, site_address")
        .eq("id", body.job_id)
        .eq("tenant_id", tenantId)
        .eq("customer_id", body.customer_id)
        .is("deleted_at", null)
        .single()

      if (jobError || !jobData) {
        return NextResponse.json(
          { error: "Job not found or does not belong to this customer" },
          { status: 404 }
        )
      }

      job = jobData
    }

    // Get or create message thread
    const channel = body.channel
    let threadId: string | null = null

    const { data: existingThread } = await supabase
      .from("message_threads")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("customer_id", customer.id)
      .eq("channel", channel)
      .maybeSingle()

    if (existingThread) {
      threadId = existingThread.id
    } else {
      // Create new thread
      const { data: newThread, error: threadError } = await supabase
        .from("message_threads")
        .insert({
          tenant_id: tenantId,
          customer_id: customer.id,
          channel,
          subject: `Review: ${customer.first_name} ${customer.last_name}`,
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (threadError || !newThread) {
        console.error("[Reviews Invitation] Error creating thread:", threadError)
        return NextResponse.json(
          { error: "Failed to create message thread" },
          { status: 500 }
        )
      }

      threadId = newThread.id
    }

    // Generate invitation message
    const customerName = `${customer.first_name} ${customer.last_name}`
    const messageBody =
      body.channel === "email"
        ? generateEmailInvitation(customerName, job)
        : generateSmsInvitation(customerName, job)

    const messageSubject =
      body.channel === "email"
        ? "We'd love your feedback on our service"
        : undefined

    // Create message record
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        tenant_id: tenantId,
        thread_id: threadId,
        direction: "outbound",
        channel: body.channel,
        recipient: body.channel === "email" ? customer.email : customer.phone,
        subject: messageSubject,
        body: messageBody,
        status: "queued",
        created_by: userId,
      })
      .select()
      .single()

    if (messageError || !message) {
      console.error("[Reviews Invitation] Error creating message:", messageError)
      return NextResponse.json(
        { error: "Failed to create message record" },
        { status: 500 }
      )
    }

    // Create review row
    const { data: review, error: reviewError } = await supabase
      .from("reviews")
      .insert({
        tenant_id: tenantId,
        customer_id: customer.id,
        job_id: body.job_id || null,
        source: "invited",
        invitation_sent_at: new Date().toISOString(),
        invitation_channel: body.channel,
        invitation_message_id: message.id,
        status: "new",
      })
      .select(`
        *,
        customer:customers(id, first_name, last_name, email),
        job:jobs(id, job_number, site_address)
      `)
      .single()

    if (reviewError || !review) {
      console.error("[Reviews Invitation] Error creating review:", reviewError)

      // Clean up message if review creation failed
      await supabase
        .from("messages")
        .delete()
        .eq("id", message.id)

      return NextResponse.json(
        { error: "Failed to create review record" },
        { status: 500 }
      )
    }

    // Send email or SMS directly
    let sendResult: { success: boolean; error?: string }

    if (body.channel === "email") {
      sendResult = await sendEmailDirect({
        tenantId,
        to: customer.email!,
        subject: messageSubject!,
        body: messageBody,
        messageId: message.id,
      })
    } else {
      sendResult = await sendSmsDirect({
        tenantId,
        to: customer.phone!,
        body: messageBody,
        messageId: message.id,
      })
    }

    if (!sendResult.success) {
      console.error("[Reviews Invitation] Error sending:", sendResult.error)

      return NextResponse.json(
        {
          success: true,
          warning: "Review invitation created but send failed. Message will need to be resent manually.",
          data: review,
        },
        { status: 207 } // Multi-Status
      )
    }

    // Update thread's last_message_at
    await supabase
      .from("message_threads")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", threadId)

    return NextResponse.json({
      success: true,
      message: `Review invitation sent via ${body.channel}`,
      data: review,
    })
  } catch (error) {
    console.error("[Reviews Invitation] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * Generate email invitation HTML
 */
function generateEmailInvitation(customerName: string, job: { job_number: string; site_address: string } | null): string {
  const jobInfo = job
    ? `<p>We recently completed your project at <strong>${job.site_address}</strong> (Job #${job.job_number}).</p>`
    : `<p>We recently completed your project.</p>`

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Hi ${customerName},</h2>

      ${jobInfo}

      <p>We would love to hear about your experience with our service! Your feedback helps us continue providing excellent service.</p>

      <p>Please take a moment to share your thoughts:</p>

      <ul>
        <li>How was your overall experience?</li>
        <li>How would you rate our work quality?</li>
        <li>Would you recommend us to friends and family?</li>
      </ul>

      <p>You can reply directly to this email with your feedback, or we'll follow up with you shortly.</p>

      <p>Thank you for choosing us!</p>

      <p>Best regards,<br>The Team</p>
    </div>
  `.trim()
}

/**
 * Generate SMS invitation message
 */
function generateSmsInvitation(customerName: string, job: { job_number: string } | null): string {
  const jobRef = job ? ` (Job #${job.job_number})` : ""

  return `Hi ${customerName}, we'd love your feedback on your recent project${jobRef}! How was your experience? Reply with your thoughts or rate us 1-5 stars. Thank you!`
}
