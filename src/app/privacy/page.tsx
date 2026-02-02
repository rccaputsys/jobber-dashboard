import React from "react";
import Link from "next/link";

export default function PrivacyPolicy() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#ffffff",
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
          color: #7c5cff;
        }
        .policy-content section {
          margin-bottom: 32px;
        }
        .policy-content a {
          color: #7c5cff;
          text-decoration: none;
        }
        .policy-content a:hover {
          text-decoration: underline;
        }
      `}</style>
      
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "60px 24px" }}>
        <Link
          href="/jobber"
          style={{
            color: "#7c5cff",
            textDecoration: "none",
            fontSize: 14,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 32,
          }}
        >
          ← Back to AccuInsight
        </Link>

        <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8, color: "#1e293b" }}>
          Privacy Policy
        </h1>

        <p style={{ color: "#64748b", marginBottom: 48 }}>
          Last updated: February 2, 2026
        </p>

        <div className="policy-content" style={{ color: "#475569" }}>
          <section>
            <h2>Introduction</h2>
            <p>
              This Privacy Policy explains how OwnerView ("we," "us," or "our") collects, uses, and
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
              <li>Invoices, payment status, and due dates</li>
              <li>Quotes and conversion status</li>
              <li>Client names (for display purposes only)</li>
            </ul>
            <p>
              We only read this data to display insights—we never modify your Jobber data. You can disconnect at any time from your dashboard or Jobber's App Marketplace.
            </p>

            <h3>Automatically Collected Information</h3>
            <p>
              We automatically collect:
            </p>
            <ul>
              <li>IP address and general location</li>
              <li>Browser type and device information</li>
              <li>Usage patterns and feature interactions</li>
              <li>Error logs for troubleshooting</li>
            </ul>
          </section>

          <section>
            <h2>How We Use Information</h2>
            <p>We use your information to:</p>
            <ul>
              <li>Display your business analytics dashboard</li>
              <li>Authenticate your account and keep it secure</li>
              <li>Process payments and manage your subscription</li>
              <li>Provide customer support</li>
              <li>Send important service updates (e.g., trial expiration)</li>
              <li>Improve the product based on usage patterns</li>
              <li>Comply with legal obligations</li>
              <li>Create anonymized, aggregated research and industry benchmarks</li>
              <li>Publish insights about home service industry trends (never identifying individual businesses)</li>
            </ul>
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
              <li>Clicking "unsubscribe" in any marketing email</li>
              <li>Emailing support@ownerview.io</li>
            </ul>
            <p>
              We will still send transactional emails (billing receipts, security alerts, etc.) regardless of your marketing preferences.
            </p>
          </section>

          <section>
            <h2>How We Share Information</h2>
            <p>
              <strong>We do not sell your data. Ever.</strong>
            </p>
            <p>We only share information with:</p>
            <ul>
              <li><strong>Stripe:</strong> To process payments securely</li>
              <li><strong>Supabase:</strong> To store your data securely</li>
              <li><strong>Vercel:</strong> To host and serve the application</li>
              <li><strong>Legal authorities:</strong> When required by law</li>
              <li><strong>Research & Benchmarks:</strong> We may publish aggregated industry insights (e.g., "average quote conversion rate for lawn care businesses"). This data will never identify you or your business.</li>
            </ul>
          </section>

          <section>
            <h2>Data Retention</h2>
            <p>
              We retain your data while your account is active. If you disconnect Jobber or cancel your subscription:
            </p>
            <ul>
              <li>Your Jobber data is deleted immediately</li>
              <li>Your account information is retained for 30 days (in case you return)</li>
              <li>Billing records are retained as required by law</li>
            </ul>
            <p>
              Request full deletion anytime at support@ownerview.io.
            </p>
          </section>

          <section>
            <h2>Security</h2>
            <p>
              We take security seriously:
            </p>
            <ul>
              <li>All data encrypted in transit (HTTPS) and at rest</li>
              <li>OAuth authentication with Jobber (we never see your Jobber password)</li>
              <li>Row-level security ensures you only see your own data</li>
              <li>Regular security reviews</li>
            </ul>
            <p>
              No system is 100% secure, but we follow industry best practices to protect your information.
            </p>
          </section>

          <section>
            <h2>Your Rights</h2>
            <p>
              You have the right to:
            </p>
            <ul>
              <li>Access your data (export available from dashboard)</li>
              <li>Correct inaccurate information</li>
              <li>Delete your account and data</li>
              <li>Disconnect Jobber at any time</li>
            </ul>
            <p>
              <strong>California Residents:</strong> We do not sell personal information under the CCPA.
            </p>
          </section>

          <section>
            <h2>Children</h2>
            <p>
              AccuInsight is a business tool not intended for anyone under 18.
            </p>
          </section>

          <section>
            <h2>Changes to This Policy</h2>
            <p>
              We may update this policy occasionally. Material changes will be communicated via email or dashboard notification.
            </p>
          </section>

          <section>
            <h2>Contact Us</h2>
            <p>
              Questions? Reach us at{" "}
              <a href="mailto:support@ownerview.io">support@ownerview.io</a>
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
          <p>© 2026 OwnerView. All rights reserved.</p>
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