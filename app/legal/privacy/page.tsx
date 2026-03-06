import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - Cold Lava BOS',
  description: 'Privacy Policy for Cold Lava BOS - How we collect, use, and protect your data',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

      <div className="prose prose-slate max-w-none">
        <p className="text-sm text-muted-foreground mb-8">
          <strong>Last Updated:</strong> 19 January 2026
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
          <p>
            Cold Lava ("we", "our", or "us") operates Cold Lava BOS, a business operating system for UK trade and service businesses. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.
          </p>
          <p>
            We are committed to protecting your privacy and complying with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>

          <h3 className="text-xl font-medium mb-3">2.1 Information You Provide</h3>
          <ul>
            <li><strong>Account Information:</strong> Name, email address, company name, phone number</li>
            <li><strong>Customer Data:</strong> Customer names, addresses, contact details, property information</li>
            <li><strong>Job Data:</strong> Project details, quotes, appointments, documents</li>
            <li><strong>Payment Information:</strong> Billing details (processed securely through our payment provider)</li>
            <li><strong>Communications:</strong> Messages, emails, SMS content sent through our platform</li>
          </ul>

          <h3 className="text-xl font-medium mb-3 mt-6">2.2 Information We Collect Automatically</h3>
          <ul>
            <li><strong>Usage Data:</strong> Pages visited, features used, time spent, clicks</li>
            <li><strong>Device Information:</strong> IP address, browser type, operating system, device identifiers</li>
            <li><strong>Location Data:</strong> Approximate location based on IP address</li>
            <li><strong>Cookies:</strong> See our Cookie Policy for details</li>
          </ul>

          <h3 className="text-xl font-medium mb-3 mt-6">2.3 Information from Third Parties</h3>
          <ul>
            <li><strong>Google Maps:</strong> Property location data for site analysis</li>
            <li><strong>OS Places API:</strong> UK address lookup and validation</li>
            <li><strong>Third-party integrations:</strong> Design data (if you integrate)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
          <p>We use your information for the following purposes:</p>
          <ul>
            <li><strong>Service Delivery:</strong> Provide and maintain Cold Lava BOS platform</li>
            <li><strong>Customer Management:</strong> Enable you to manage your customer database and jobs</li>
            <li><strong>Communications:</strong> Send emails and SMS on your behalf to your customers</li>
            <li><strong>Operations:</strong> Help you manage your business operations effectively</li>
            <li><strong>Analytics:</strong> Understand how you use our service to improve it</li>
            <li><strong>Support:</strong> Respond to your inquiries and provide technical support</li>
            <li><strong>Security:</strong> Detect and prevent fraud, abuse, and security incidents</li>
            <li><strong>Legal Compliance:</strong> Comply with legal obligations and enforce our terms</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Legal Basis for Processing (UK GDPR)</h2>
          <p>We process your personal data under the following legal bases:</p>
          <ul>
            <li><strong>Contract:</strong> Processing necessary to provide our service to you</li>
            <li><strong>Legitimate Interests:</strong> Improving our service, security, fraud prevention</li>
            <li><strong>Legal Obligation:</strong> Compliance with tax, accounting, and regulatory requirements</li>
            <li><strong>Consent:</strong> Marketing communications (where required)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Data Sharing and Disclosure</h2>

          <h3 className="text-xl font-medium mb-3">5.1 Service Providers</h3>
          <p>We share data with trusted third-party service providers:</p>
          <ul>
            <li><strong>Supabase:</strong> Database and authentication (EU servers)</li>
            <li><strong>Vercel:</strong> Hosting and deployment (EU region)</li>
            <li><strong>SendGrid:</strong> Email delivery</li>
            <li><strong>Twilio:</strong> SMS delivery</li>
            <li><strong>Google Cloud:</strong> Maps and location services</li>
            <li><strong>Trigger.dev:</strong> Background job processing</li>
            <li><strong>Sentry:</strong> Error tracking and monitoring</li>
          </ul>

          <h3 className="text-xl font-medium mb-3 mt-6">5.2 Your Customers</h3>
          <p>
            When you use our platform to send emails or SMS to your customers, we process that data on your behalf. You are the data controller; we are the data processor.
          </p>

          <h3 className="text-xl font-medium mb-3 mt-6">5.3 Legal Requirements</h3>
          <p>
            We may disclose your information if required by law, court order, or to protect our rights, property, or safety.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
          <p>We retain your data for as long as necessary to provide our service and comply with legal obligations:</p>
          <ul>
            <li><strong>Active Accounts:</strong> Data retained while your account is active</li>
            <li><strong>Deleted Accounts:</strong> Most data deleted within 90 days; some retained for legal/tax purposes (7 years)</li>
            <li><strong>Soft Deletes:</strong> Deleted records marked as deleted but retained for 90 days for recovery</li>
            <li><strong>Backup Data:</strong> May persist in backups for up to 30 days after deletion</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Your Rights (UK GDPR)</h2>
          <p>You have the following rights regarding your personal data:</p>
          <ul>
            <li><strong>Right to Access:</strong> Request a copy of your personal data</li>
            <li><strong>Right to Rectification:</strong> Correct inaccurate or incomplete data</li>
            <li><strong>Right to Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
            <li><strong>Right to Restriction:</strong> Restrict processing of your data</li>
            <li><strong>Right to Data Portability:</strong> Receive your data in a machine-readable format</li>
            <li><strong>Right to Object:</strong> Object to processing based on legitimate interests</li>
            <li><strong>Right to Withdraw Consent:</strong> Withdraw consent for marketing communications</li>
            <li><strong>Right to Complain:</strong> Lodge a complaint with the ICO (Information Commissioner's Office)</li>
          </ul>
          <p>
            To exercise these rights, contact us at: <a href="mailto:privacy@coldlava.ai" className="text-primary hover:underline">privacy@coldlava.ai</a>
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Data Security</h2>
          <p>We implement robust security measures to protect your data:</p>
          <ul>
            <li><strong>Encryption:</strong> Data encrypted in transit (TLS 1.3) and at rest (AES-256)</li>
            <li><strong>Access Controls:</strong> Role-based access control (RBAC) and multi-factor authentication</li>
            <li><strong>Multi-Tenant Isolation:</strong> Row-level security (RLS) ensures tenant data separation</li>
            <li><strong>Regular Audits:</strong> Security assessments and penetration testing</li>
            <li><strong>Monitoring:</strong> Real-time error tracking and anomaly detection</li>
            <li><strong>Backup & Recovery:</strong> Daily automated backups with 30-day retention</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. International Data Transfers</h2>
          <p>
            Your data is primarily stored in the EU (Supabase EU region). If we transfer data outside the UK/EU, we ensure adequate safeguards are in place (e.g., Standard Contractual Clauses).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">10. Children's Privacy</h2>
          <p>
            Cold Lava BOS is not intended for use by children under 18. We do not knowingly collect data from children. If you believe we have collected data from a child, please contact us immediately.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">11. Cookies</h2>
          <p>
            We use essential cookies to operate our service and analytics cookies to improve it. You can control cookies through your browser settings. See our Cookie Policy for details.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">12. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of significant changes via email or through the platform. Your continued use of Cold Lava BOS after changes indicates acceptance of the updated policy.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">13. Contact Us</h2>
          <p>If you have questions about this Privacy Policy or our data practices, contact us:</p>
          <ul>
            <li><strong>Email:</strong> <a href="mailto:privacy@coldlava.ai" className="text-primary hover:underline">privacy@coldlava.ai</a></li>
            <li><strong>Address:</strong> Cold Lava, [Your UK Address]</li>
            <li><strong>Data Protection Officer:</strong> <a href="mailto:dpo@coldlava.ai" className="text-primary hover:underline">dpo@coldlava.ai</a></li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">14. ICO Registration</h2>
          <p>
            Cold Lava is registered with the UK Information Commissioner's Office (ICO). Registration number: [TO BE COMPLETED]
          </p>
          <p>
            To lodge a complaint with the ICO: <a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://ico.org.uk/make-a-complaint/</a>
          </p>
        </section>

        <div className="mt-12 p-6 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground mb-0">
            This Privacy Policy was last updated on <strong>19 January 2026</strong>. We recommend reviewing this policy periodically.
          </p>
        </div>
      </div>
    </div>
  );
}
