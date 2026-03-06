import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - Cold Lava BOS',
  description: 'Terms of Service for Cold Lava BOS - Legal agreement for using our platform',
};

export default function TermsOfServicePage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>

      <div className="prose prose-slate max-w-none">
        <p className="text-sm text-muted-foreground mb-8">
          <strong>Last Updated:</strong> 19 January 2026
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Agreement to Terms</h2>
          <p>
            By accessing or using Cold Lava BOS ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.
          </p>
          <p>
            These Terms constitute a legally binding agreement between you and Cold Lava ("we", "our", or "us").
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
          <p>
            Cold Lava BOS is a cloud-based business operating system designed for UK trade and service businesses. The Service includes:
          </p>
          <ul>
            <li>Customer relationship management (CRM)</li>
            <li>Job and project management</li>
            <li>Quote generation and management</li>
            <li>Calendar and appointment scheduling</li>
            <li>Communications (email and SMS)</li>
            <li>Integration with third-party services (Google Maps, OS Places)</li>
            <li>Mobile and web access</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Eligibility</h2>
          <p>
            You must be at least 18 years old and have the authority to enter into these Terms on behalf of your business. By using the Service, you represent and warrant that you meet these requirements.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Account Registration</h2>

          <h3 className="text-xl font-medium mb-3">4.1 Account Creation</h3>
          <p>
            To use the Service, you must create an account and provide accurate, complete, and current information. You are responsible for maintaining the confidentiality of your account credentials.
          </p>

          <h3 className="text-xl font-medium mb-3 mt-6">4.2 Account Security</h3>
          <p>
            You are responsible for all activity under your account. Notify us immediately of any unauthorized access or security breach.
          </p>

          <h3 className="text-xl font-medium mb-3 mt-6">4.3 Multi-User Accounts</h3>
          <p>
            Your subscription plan determines the number of users allowed. You are responsible for all users associated with your account.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Subscription Plans and Pricing</h2>

          <h3 className="text-xl font-medium mb-3">5.1 Plans</h3>
          <p>We offer three subscription tiers:</p>
          <ul>
            <li><strong>Essential:</strong> £79/month - Basic CRM, quotes, calendar, email/SMS</li>
            <li><strong>Pro:</strong> £199/month - Advanced features, pipeline management, route optimization</li>
            <li><strong>Premium:</strong> £499/month - Unlimited automations, AI agents, custom integrations, white-label</li>
          </ul>

          <h3 className="text-xl font-medium mb-3 mt-6">5.2 Payment</h3>
          <p>
            Subscriptions are billed monthly in advance. Payments are processed securely through our payment provider. All prices are in GBP and exclude VAT (which will be added at checkout).
          </p>

          <h3 className="text-xl font-medium mb-3 mt-6">5.3 Price Changes</h3>
          <p>
            We may change our pricing with 30 days' notice. Existing subscribers will be grandfathered at their current price for 12 months.
          </p>

          <h3 className="text-xl font-medium mb-3 mt-6">5.4 Refunds</h3>
          <p>
            We offer a 14-day money-back guarantee for new subscribers. After 14 days, subscriptions are non-refundable. No refunds for partial months.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Usage Limits and Fair Use</h2>

          <h3 className="text-xl font-medium mb-3">6.1 Storage Limits</h3>
          <ul>
            <li><strong>Essential:</strong> 5GB storage</li>
            <li><strong>Pro:</strong> 50GB storage</li>
            <li><strong>Premium:</strong> 500GB storage</li>
          </ul>

          <h3 className="text-xl font-medium mb-3 mt-6">6.2 API Rate Limits</h3>
          <p>
            API usage is subject to rate limits to ensure fair access for all users. Excessive usage may result in throttling or additional charges.
          </p>

          <h3 className="text-xl font-medium mb-3 mt-6">6.3 SMS and Email Limits</h3>
          <p>
            Each plan includes a monthly allowance for SMS and email communications. Overage charges apply beyond the included allowance.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Acceptable Use Policy</h2>
          <p>You agree NOT to use the Service to:</p>
          <ul>
            <li>Violate any laws or regulations</li>
            <li>Infringe on intellectual property rights</li>
            <li>Transmit spam, viruses, or malicious code</li>
            <li>Harass, abuse, or harm others</li>
            <li>Impersonate others or provide false information</li>
            <li>Scrape or data mine without permission</li>
            <li>Reverse engineer or attempt to access source code</li>
            <li>Overload or disrupt our systems</li>
            <li>Resell or redistribute the Service without authorization</li>
          </ul>
          <p>
            Violations may result in immediate suspension or termination of your account.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Intellectual Property</h2>

          <h3 className="text-xl font-medium mb-3">8.1 Our IP</h3>
          <p>
            The Service, including all software, designs, logos, and content, is owned by Cold Lava and protected by UK and international intellectual property laws. You may not copy, modify, or create derivative works without our written permission.
          </p>

          <h3 className="text-xl font-medium mb-3 mt-6">8.2 Your Data</h3>
          <p>
            You retain all rights to your customer data and content. By using the Service, you grant us a license to process and store your data solely to provide the Service.
          </p>

          <h3 className="text-xl font-medium mb-3 mt-6">8.3 Feedback</h3>
          <p>
            Any feedback, suggestions, or ideas you provide become our property and may be used without compensation or attribution.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Data Protection and Privacy</h2>
          <p>
            Our collection and use of your data is governed by our <a href="/legal/privacy" className="text-primary hover:underline">Privacy Policy</a>, which is incorporated into these Terms by reference.
          </p>
          <p>
            You are responsible for complying with UK GDPR and data protection laws when using the Service to process your customers' data. You are the data controller; we are the data processor.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">10. Third-Party Services</h2>
          <p>
            The Service integrates with third-party services (Google Maps, SendGrid, Twilio, etc.). Your use of these services is subject to their respective terms and conditions. We are not responsible for third-party services.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">11. Service Availability</h2>

          <h3 className="text-xl font-medium mb-3">11.1 Uptime</h3>
          <p>
            We strive for 99.9% uptime but do not guarantee uninterrupted service. The Service may be unavailable due to maintenance, updates, or circumstances beyond our control.
          </p>

          <h3 className="text-xl font-medium mb-3 mt-6">11.2 Maintenance</h3>
          <p>
            We may perform scheduled maintenance with advance notice. Emergency maintenance may occur without notice.
          </p>

          <h3 className="text-xl font-medium mb-3 mt-6">11.3 Beta Features</h3>
          <p>
            Beta features are provided "as is" without warranties. We may discontinue beta features at any time.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">12. Termination</h2>

          <h3 className="text-xl font-medium mb-3">12.1 Termination by You</h3>
          <p>
            You may cancel your subscription at any time. Access continues until the end of your billing period. No refunds for partial months.
          </p>

          <h3 className="text-xl font-medium mb-3 mt-6">12.2 Termination by Us</h3>
          <p>
            We may suspend or terminate your account immediately for:
          </p>
          <ul>
            <li>Violation of these Terms</li>
            <li>Non-payment</li>
            <li>Fraudulent activity</li>
            <li>Abuse of the Service</li>
            <li>Legal requirements</li>
          </ul>

          <h3 className="text-xl font-medium mb-3 mt-6">12.3 Data Retention After Termination</h3>
          <p>
            After termination, your data is retained for 90 days for recovery. After 90 days, data is permanently deleted. Export your data before cancellation.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">13. Disclaimers and Limitations of Liability</h2>

          <h3 className="text-xl font-medium mb-3">13.1 No Warranties</h3>
          <p>
            THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DISCLAIM ALL WARRANTIES INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>

          <h3 className="text-xl font-medium mb-3 mt-6">13.2 Limitation of Liability</h3>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, COLD LAVA SHALL NOT BE LIABLE FOR:
          </p>
          <ul>
            <li>INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES</li>
            <li>LOSS OF PROFITS, REVENUE, DATA, OR USE</li>
            <li>DAMAGES RESULTING FROM THIRD-PARTY SERVICES</li>
            <li>DAMAGES EXCEEDING FEES PAID IN THE 12 MONTHS PRIOR TO THE CLAIM</li>
          </ul>

          <h3 className="text-xl font-medium mb-3 mt-6">13.3 Compliance Disclaimer</h3>
          <p>
            While Cold Lava BOS includes tools to help manage your business operations, you are solely responsible for ensuring your compliance with all applicable laws and regulations. We do not provide legal advice.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">14. Indemnification</h2>
          <p>
            You agree to indemnify and hold Cold Lava harmless from any claims, damages, or expenses arising from:
          </p>
          <ul>
            <li>Your use of the Service</li>
            <li>Violation of these Terms</li>
            <li>Violation of any laws or third-party rights</li>
            <li>Your customer data or content</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">15. Dispute Resolution</h2>

          <h3 className="text-xl font-medium mb-3">15.1 Governing Law</h3>
          <p>
            These Terms are governed by the laws of England and Wales.
          </p>

          <h3 className="text-xl font-medium mb-3 mt-6">15.2 Jurisdiction</h3>
          <p>
            Any disputes shall be resolved exclusively in the courts of England and Wales.
          </p>

          <h3 className="text-xl font-medium mb-3 mt-6">15.3 Informal Resolution</h3>
          <p>
            Before initiating legal action, we encourage you to contact us to seek informal resolution: <a href="mailto:legal@coldlava.ai" className="text-primary hover:underline">legal@coldlava.ai</a>
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">16. Changes to Terms</h2>
          <p>
            We may update these Terms from time to time. We will notify you of material changes via email or through the Service. Continued use after changes constitutes acceptance of the updated Terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">17. General Provisions</h2>

          <h3 className="text-xl font-medium mb-3">17.1 Entire Agreement</h3>
          <p>
            These Terms, together with our Privacy Policy, constitute the entire agreement between you and Cold Lava.
          </p>

          <h3 className="text-xl font-medium mb-3 mt-6">17.2 Severability</h3>
          <p>
            If any provision of these Terms is found invalid, the remaining provisions remain in effect.
          </p>

          <h3 className="text-xl font-medium mb-3 mt-6">17.3 Assignment</h3>
          <p>
            You may not assign these Terms without our written consent. We may assign these Terms without restriction.
          </p>

          <h3 className="text-xl font-medium mb-3 mt-6">17.4 No Waiver</h3>
          <p>
            Our failure to enforce any provision does not constitute a waiver of our right to enforce it later.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">18. Contact Information</h2>
          <p>For questions about these Terms, contact us:</p>
          <ul>
            <li><strong>Email:</strong> <a href="mailto:legal@coldlava.ai" className="text-primary hover:underline">legal@coldlava.ai</a></li>
            <li><strong>Support:</strong> <a href="mailto:support@coldlava.ai" className="text-primary hover:underline">support@coldlava.ai</a></li>
            <li><strong>Address:</strong> Cold Lava, [Your UK Address]</li>
          </ul>
        </section>

        <div className="mt-12 p-6 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground mb-0">
            These Terms of Service were last updated on <strong>19 January 2026</strong>. We recommend reviewing these Terms periodically.
          </p>
        </div>
      </div>
    </div>
  );
}
