/**
 * Alerting Service
 *
 * Centralized system for sending critical alerts via multiple channels:
 * - Email (SendGrid)
 * - SMS (Twilio)
 * - Slack (webhook)
 * - Sentry (error tracking)
 */

// Sentry disabled for performance
// import * as Sentry from '@sentry/nextjs';
const Sentry = {
  captureMessage: (..._args: unknown[]) => { /* noop */ },
  captureException: (..._args: unknown[]) => { /* noop */ },
};

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertChannel = 'email' | 'sms' | 'slack' | 'sentry' | 'all';

export interface Alert {
  title: string;
  message: string;
  severity: AlertSeverity;
  channels?: AlertChannel[];
  metadata?: Record<string, unknown>;
}

/**
 * Send an alert through specified channels
 */
export async function sendAlert(alert: Alert): Promise<void> {
  const {
    title,
    message,
    severity,
    channels = ['sentry'], // Default to Sentry only
    metadata = {},
  } = alert;

  // Determine which channels to use
  const shouldSendEmail = channels.includes('email') || channels.includes('all');
  const shouldSendSMS = channels.includes('sms') || channels.includes('all');
  const shouldSendSlack = channels.includes('slack') || channels.includes('all');
  const shouldSendSentry = channels.includes('sentry') || channels.includes('all');

  // Always send to Sentry (it's free and useful)
  if (shouldSendSentry) {
    Sentry.captureMessage(title, {
      level: severity === 'critical' ? 'error' : severity === 'warning' ? 'warning' : 'info',
      tags: {
        alert_type: 'system_alert',
        severity,
      },
      extra: {
        message,
        ...metadata,
      },
    });
  }

  // Send email for critical/warning alerts
  if (shouldSendEmail && (severity === 'critical' || severity === 'warning')) {
    try {
      await sendEmailAlert({ title, message, severity, metadata });
    } catch (error) {
      console.error('Failed to send email alert:', error);
      Sentry.captureException(error);
    }
  }

  // Send SMS for critical alerts only (SMS is expensive)
  if (shouldSendSMS && severity === 'critical') {
    try {
      await sendSMSAlert({ title, message, metadata });
    } catch (error) {
      console.error('Failed to send SMS alert:', error);
      Sentry.captureException(error);
    }
  }

  // Send Slack notification
  if (shouldSendSlack) {
    try {
      await sendSlackAlert({ title, message, severity, metadata });
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
      Sentry.captureException(error);
    }
  }
}

/**
 * Send email alert using SendGrid
 */
async function sendEmailAlert(params: {
  title: string;
  message: string;
  severity: AlertSeverity;
  metadata: Record<string, unknown>;
}): Promise<void> {
  const { title, message, severity, metadata } = params;

  // Get admin email from environment
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SENDGRID_FROM_EMAIL;
  if (!adminEmail) {
    console.warn('No admin email configured for alerts');
    return;
  }

  // Import SendGrid dynamically (only if email alerts are needed)
  const sgMail = (await import('@sendgrid/mail')).default;
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

  const severityColors = {
    critical: '#DC2626', // Red
    warning: '#F59E0B',  // Orange
    info: '#3B82F6',     // Blue
  };

  const msg = {
    to: adminEmail,
    from: process.env.SENDGRID_FROM_EMAIL!,
    subject: `[${severity.toUpperCase()}] ${title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${severityColors[severity]}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">⚠️ System Alert</h1>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1f2937; margin-top: 0;">${title}</h2>
          <p style="color: #4b5563; line-height: 1.6;">${message}</p>

          ${Object.keys(metadata).length > 0 ? `
            <div style="background-color: white; padding: 15px; border-radius: 6px; margin-top: 20px;">
              <h3 style="color: #374151; margin-top: 0; font-size: 16px;">Additional Details:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                ${Object.entries(metadata).map(([key, value]) => `
                  <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-weight: 600;">${key}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #1f2937;">${JSON.stringify(value)}</td>
                  </tr>
                `).join('')}
              </table>
            </div>
          ` : ''}

          <p style="color: #9ca3af; font-size: 12px; margin-top: 20px; margin-bottom: 0;">
            Sent by Cold Lava BOS Alerting System • ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
    `,
  };

  await sgMail.send(msg);
}

/**
 * Send SMS alert using Twilio
 */
async function sendSMSAlert(params: {
  title: string;
  message: string;
  metadata: Record<string, unknown>;
}): Promise<void> {
  const { title, message } = params;

  // Get admin phone from environment
  const adminPhone = process.env.ADMIN_PHONE_NUMBER;
  if (!adminPhone) {
    console.warn('No admin phone configured for SMS alerts');
    return;
  }

  // Import Twilio dynamically
  const twilio = (await import('twilio')).default;
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!
  );

  await client.messages.create({
    body: `🚨 ${title}\n\n${message}`,
    from: process.env.TWILIO_PHONE_NUMBER!,
    to: adminPhone,
  });
}

/**
 * Send Slack alert using webhook
 */
async function sendSlackAlert(params: {
  title: string;
  message: string;
  severity: AlertSeverity;
  metadata: Record<string, unknown>;
}): Promise<void> {
  const { title, message, severity, metadata } = params;

  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('No Slack webhook URL configured for alerts');
    return;
  }

  const severityEmojis = {
    critical: ':rotating_light:',
    warning: ':warning:',
    info: ':information_source:',
  };

  const severityColors = {
    critical: '#DC2626',
    warning: '#F59E0B',
    info: '#3B82F6',
  };

  const payload = {
    text: `${severityEmojis[severity]} *${title}*`,
    attachments: [
      {
        color: severityColors[severity],
        fields: [
          {
            title: 'Message',
            value: message,
            short: false,
          },
          {
            title: 'Severity',
            value: severity.toUpperCase(),
            short: true,
          },
          {
            title: 'Timestamp',
            value: new Date().toISOString(),
            short: true,
          },
          ...Object.entries(metadata).map(([key, value]) => ({
            title: key,
            value: JSON.stringify(value),
            short: true,
          })),
        ],
      },
    ],
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/**
 * Pre-configured alert functions for common scenarios
 */
export const Alerts = {
  /**
   * Database connection failed
   */
  databaseConnectionFailed: (error: Error) =>
    sendAlert({
      title: 'Database Connection Failed',
      message: `Unable to connect to Supabase database. Application may be experiencing downtime.`,
      severity: 'critical',
      channels: ['all'],
      metadata: {
        error: error.message,
        stack: error.stack,
      },
    }),

  /**
   * API rate limit exceeded
   */
  rateLimitExceeded: (service: string, limit: number) =>
    sendAlert({
      title: `${service} Rate Limit Exceeded`,
      message: `API rate limit of ${limit} requests has been exceeded. Service may be degraded.`,
      severity: 'warning',
      channels: ['email', 'slack', 'sentry'],
      metadata: {
        service,
        limit,
      },
    }),

  /**
   * Payment processing failed
   */
  paymentFailed: (customerId: string, amount: number, error: Error) =>
    sendAlert({
      title: 'Payment Processing Failed',
      message: `Failed to process payment of £${amount} for customer ${customerId}.`,
      severity: 'critical',
      channels: ['all'],
      metadata: {
        customer_id: customerId,
        amount,
        error: error.message,
      },
    }),

  /**
   * Email delivery failed
   */
  emailDeliveryFailed: (recipientEmail: string, error: Error) =>
    sendAlert({
      title: 'Email Delivery Failed',
      message: `Failed to deliver email to ${recipientEmail}.`,
      severity: 'warning',
      channels: ['email', 'slack', 'sentry'],
      metadata: {
        recipient: recipientEmail,
        error: error.message,
      },
    }),

  /**
   * SMS delivery failed
   */
  smsDeliveryFailed: (recipientPhone: string, error: Error) =>
    sendAlert({
      title: 'SMS Delivery Failed',
      message: `Failed to send SMS to ${recipientPhone}.`,
      severity: 'warning',
      channels: ['email', 'slack', 'sentry'],
      metadata: {
        recipient: recipientPhone,
        error: error.message,
      },
    }),

  /**
   * Disk space low
   */
  diskSpaceLow: (percentage: number) =>
    sendAlert({
      title: 'Disk Space Running Low',
      message: `System disk usage is at ${percentage}%. Consider cleanup or scaling.`,
      severity: percentage > 90 ? 'critical' : 'warning',
      channels: ['email', 'slack', 'sentry'],
      metadata: {
        disk_usage_percent: percentage,
      },
    }),

  /**
   * High error rate detected
   */
  highErrorRate: (errorCount: number, timeWindow: string) =>
    sendAlert({
      title: 'High Error Rate Detected',
      message: `${errorCount} errors detected in the last ${timeWindow}. System may be experiencing issues.`,
      severity: 'critical',
      channels: ['all'],
      metadata: {
        error_count: errorCount,
        time_window: timeWindow,
      },
    }),

  /**
   * Successful deployment
   */
  deploymentSuccessful: (version: string, environment: string) =>
    sendAlert({
      title: 'Deployment Successful',
      message: `Version ${version} has been deployed to ${environment}.`,
      severity: 'info',
      channels: ['slack', 'sentry'],
      metadata: {
        version,
        environment,
      },
    }),

  /**
   * Deployment failed
   */
  deploymentFailed: (version: string, environment: string, error: Error) =>
    sendAlert({
      title: 'Deployment Failed',
      message: `Failed to deploy version ${version} to ${environment}.`,
      severity: 'critical',
      channels: ['all'],
      metadata: {
        version,
        environment,
        error: error.message,
        stack: error.stack,
      },
    }),
};
