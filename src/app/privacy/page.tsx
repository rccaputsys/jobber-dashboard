import React from "react";
import Link from "next/link";

export default function PrivacyPolicy() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        color: "#1e293b",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <style>{`
        .policy-content h2 {
          font-size: 20px;
          font-weight: 700;
          color: #1e293b;
          margin: 32px 0 16px 0;
          padding-bottom: 8px;
          border-bottom: 1px solid #e2e8f0;
        }
        .policy-content h3 {
          font-size: 16px;
          font-weight: 600;
          color: #334155;
          margin: 24px 0 12px 0;
        }
        .policy-content p {
          margin: 0 0 16px 0;
          line-height: 1.8;
        }
        .policy-content ul {
          margin: 0 0 16px 0;
          padding-left: 24px;
        }
        .policy-content li {
          margin: 8px 0;
          line-height: 1.7;
          position: relative;
        }
        .policy-content li::marker {
          color: #5aa6ff;
        }
        .policy-content section {
          margin-bottom: 32px;
        }
        .policy-content a {
          color: #5aa6ff;
          text-decoration: none;
        }
        .policy-content a:hover {
          text-decoration: underline;
        }
        .policy-content strong {
          color: #1e293b;
        }
      `}</style>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "60px 24px" }}>
        <Link
          href="/jobber"
          style={{
            color: "#5aa6ff",
            textDecoration: "none",
            fontSize: 14,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 32,
          }}
        >
          &larr; Back to AccuInsight
        </Link>

        <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8, color: "#1e293b" }}>
          Privacy Policy
        </h1>

        <p style={{ color: "#64748b", marginBottom: 48 }}>
          Last updated: April 9, 2026
        </p>

        <div className="policy-content" style={{ color: "#475569" }}>
          <section>
            <h2>Introduction</h2>
            <p>
              This Privacy Policy explains how OwnerView (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) collects, uses, and
              shares information when you use AccuInsight and related services. We are committed to protecting your privacy
              and do not sell personal information.
            </p>
          </section>

          <section>
            <h2>Information We Collect</h2>

            <h3>Information You Provide</h3>
            <p>
              When you create an account, subscribe, or contact support, we collect:
            </p>
            <ul>
              <li>Name and email address</li>
              <li>Billing and payment information (processed securely via Stripe)</li>
              <li>Account credentials</li>
              <li>Any other information you choose to provide</li>
            </ul>

            <h3>Data from Jobber</h3>
            <p>
              When you connect your Jobber account, we access data needed to display your analytics dashboard:
            </p>
            <ul>
              <li>Jobs and scheduling information</li>
              <li>Visits and completion status</li>
              <li>Invoices, payment status, and due dates</li>
              <li>Quotes and conversion status</li>
              <li>Requests (new customer inquiries)</li>
              <li>Client names (for display purposes only)</li>
            </ul>
            <p>
              We access this data via Jobber&apos;s API using OAuth authentication. We also receive real-time notifications
              (webhooks) from Jobber when your data changes so your dashboard stays current. We only read this data to
              display insights&mdash;we never modify your Jobber data. You can disconnect at any time from your dashboard
              or Jobber&apos;s App Marketplace.
            </p>

            <h3>Automatically Collected Information</h3>
            <p>
              We automatically collect:
            </p>
            <ul>
              <li>IP address and general location</li>
              <li>Browser type and device information</li>
              <li>Usage patterns and feature interactions (e.g., which dashboard tabs you visit, buttons you click, and how frequently you sync your data)</li>
              <li>Error logs for troubleshooting</li>
            </ul>

            <h3>Browser Local Storage</h3>
            <p>
              We use your browser&apos;s local storage to save display preferences such as your theme (light/dark mode),
              capacity view settings, and onboarding progress. No tracking cookies are used. This data stays on your device
              and is never transmitted to our servers.
            </p>
          </section>

          <section>
            <h2>How We Use Information</h2>
            <p>We use your information to:</p>
            <ul>
              <li>Display your business analytics dashboard and prioritized action lists</li>
              <li>Authenticate your account and keep it secure</li>
              <li>Process payments and manage your subscription</li>
              <li>Sync your Jobber data on a nightly schedule and via real-time webhooks</li>
              <li>Provide customer support</li>
              <li>Send important service updates (e.g., sync failures, trial expiration)</li>
              <li>Improve the product based on aggregated usage patterns</li>
              <li>Comply with legal obligations</li>
              <li>Create anonymized, aggregated industry benchmarks (see below)</li>
            </ul>
          </section>

          <section>
            <h2>Aggregated Industry Benchmarks</h2>
            <p>
              We may use anonymized data to publish insights about home service industry trends, such as average
              quote conversion rates, typical invoice aging patterns, or scheduling utilization benchmarks. This
              research helps service business owners understand how their performance compares to the industry.
            </p>
            <p>
              <strong>We will never publish aggregate statistics derived from fewer than 25 businesses.</strong>{" "}
              This minimum threshold prevents any individual business from being identifiable in published data.
              Your business name, client names, and specific dollar amounts are never included in any published
              benchmark or research.
            </p>
          </section>

          <section>
            <h2>Marketing Communications</h2>
            <p>
              We may send product updates, tips, and announcements to your email address.
            </p>
            <p>
              You can opt out anytime by:
            </p>
            <ul>
              <li>Clicking &quot;unsubscribe&quot; in any marketing email</li>
              <li>Emailing support@ownerview.io</li>
            </ul>
            <p>
              We will still send transactional emails (billing receipts, sync failure alerts, security notifications)
              regardless of your marketing preferences.
            </p>
          </section>

          <section>
            <h2>How We Share Information</h2>
            <p>
              <strong>We do not sell your data. Ever.</strong>
            </p>
            <p>We share information only with the following service providers, each under appropriate data processing agreements:</p>
            <ul>
              <li><strong>Stripe:</strong> Payment processing. Stripe receives your billing information to process subscriptions securely.</li>
              <li><strong>Supabase:</strong> Database hosting (US East and US West regions). Your Jobber data and account information are stored here.</li>
              <li><strong>Vercel:</strong> Application hosting. Serves the AccuInsight web application.</li>
              <li><strong>Resend:</strong> Transactional email delivery. Receives your email address to send sync failure alerts, billing notifications, and product updates.</li>
              <li><strong>Legal authorities:</strong> When required by law, subpoena, or court order.</li>
            </ul>
          </section>

          <section>
            <h2>Data Retention</h2>
            <p>
              We retain your data while your account is active. When you disconnect your Jobber account or your app access is revoked:
            </p>
            <ul>
              <li>Your Jobber data (jobs, invoices, quotes, visits, requests) is <strong>deleted immediately</strong></li>
              <li>Analytics events associated with your connection are <strong>deleted immediately</strong></li>
              <li>Your OAuth tokens are <strong>deleted immediately</strong></li>
              <li>Your account information and billing records are retained for 30 days (in case you return), then deleted</li>
              <li>Billing transaction records are retained as required by law</li>
            </ul>
            <p>
              If you cancel your subscription without disconnecting Jobber, your data is retained for 30 days after
              cancellation, then automatically cleaned up.
            </p>
            <p>
              You can request immediate and full deletion of all your data at any time by emailing{" "}
              <a href="mailto:support@ownerview.io">support@ownerview.io</a>.
            </p>
          </section>

          <section>
            <h2>Data Security</h2>
            <p>
              We take security seriously:
            </p>
            <ul>
              <li>All data encrypted in transit (HTTPS/TLS) and at rest</li>
              <li>OAuth 2.0 authentication with Jobber (we never see or store your Jobber password)</li>
              <li>Row-level security (RLS) in our database ensures you can only access your own data</li>
              <li>Webhook payloads verified via HMAC-SHA256 signatures</li>
              <li>Access tokens refreshed automatically; refresh tokens stored securely</li>
              <li>Regular security reviews and dependency audits</li>
            </ul>
            <p>
              No system is 100% secure, but we follow industry best practices to protect your information.
            </p>
          </section>

          <section>
            <h2>Data Breach Notification</h2>
            <p>
              In the event of a data breach that affects your personal information or business data, we will notify
              you via email within <strong>72 hours</strong> of becoming aware of the breach. The notification will
              include the nature of the breach, what data was affected, what steps we are taking, and what you can
              do to protect yourself.
            </p>
          </section>

          <section>
            <h2>Your Rights</h2>
            <p>
              You have the right to:
            </p>
            <ul>
              <li><strong>Access:</strong> Export your data from the dashboard (CSV download available on each tab)</li>
              <li><strong>Correct:</strong> Update inaccurate information by re-syncing your Jobber data</li>
              <li><strong>Delete:</strong> Request full deletion of your account and all associated data</li>
              <li><strong>Disconnect:</strong> Revoke AccuInsight&apos;s access to your Jobber data at any time</li>
              <li><strong>Portability:</strong> Download your data in CSV format for use elsewhere</li>
              <li><strong>Opt out:</strong> Unsubscribe from marketing communications at any time</li>
            </ul>
            <p>
              To exercise any of these rights, email{" "}
              <a href="mailto:support@ownerview.io">support@ownerview.io</a> or use the relevant controls in your dashboard.
            </p>
          </section>

          <section>
            <h2>United States &amp; Canada</h2>
            <p>
              AccuInsight is designed primarily for service businesses in the United States and Canada. Your data is
              stored and processed in the United States (East and West coast regions).
            </p>
            <p>
              <strong>California Residents (CCPA):</strong> We do not sell personal information as defined by the
              California Consumer Privacy Act. You have the right to know what data we collect, request its deletion,
              and opt out of any future sale (though we don&apos;t sell data).
            </p>
            <p>
              <strong>Canadian Users (PIPEDA):</strong> We comply with the Personal Information Protection and Electronic
              Documents Act. Your data is processed with your consent (provided when you connect your Jobber account).
              You may withdraw consent at any time by disconnecting your account.
            </p>
          </section>

          <section>
            <h2>International Users</h2>
            <p>
              If you access AccuInsight from outside the United States or Canada, please be aware that your data will be
              transferred to and processed in the United States. By using AccuInsight, you consent to this transfer. We
              process your data on the legal basis of contract performance (providing the service you signed up for) and
              legitimate interest (improving our product and maintaining security).
            </p>
            <p>
              <strong>EU/EEA Residents (GDPR):</strong> If applicable, you have additional rights including the right to
              lodge a complaint with your local data protection authority. For data protection inquiries, contact{" "}
              <a href="mailto:support@ownerview.io">support@ownerview.io</a>.
            </p>
          </section>

          <section>
            <h2>Children</h2>
            <p>
              AccuInsight is a business tool not intended for anyone under 18. We do not knowingly collect data from minors.
            </p>
          </section>

          <section>
            <h2>Changes to This Policy</h2>
            <p>
              We may update this policy occasionally. Material changes will be communicated via email or dashboard notification
              at least 30 days before they take effect.
            </p>
          </section>

          <section>
            <h2>Contact Us</h2>
            <p>
              Questions about this privacy policy or how we handle your data? Reach us at{" "}
              <a href="mailto:support@ownerview.io">support@ownerview.io</a>
            </p>
            <p style={{ marginTop: 8 }}>
              OwnerView<br />
              United States
            </p>
          </section>
        </div>

        <footer
          style={{
            marginTop: 60,
            paddingTop: 32,
            borderTop: "1px solid #e2e8f0",
            textAlign: "center",
            fontSize: 13,
            color: "#94a3b8",
          }}
        >
          <p>&copy; 2026 OwnerView. All rights reserved.</p>
          <p style={{ marginTop: 8 }}>
            <Link href="/privacy" style={{ color: "#64748b", textDecoration: "none" }}>Privacy Policy</Link>
            {" · "}
            <Link href="/terms" style={{ color: "#64748b", textDecoration: "none" }}>Terms of Service</Link>
          </p>
        </footer>
      </div>
    </main>
  );
}
