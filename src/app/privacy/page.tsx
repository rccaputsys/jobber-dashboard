import React from "react";
import Link from "next/link";

export default function PrivacyPolicy() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #060811 0%, #0A1222 50%, #0d1a2d 100%)",
        color: "#EAF1FF",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <style>{`
        .policy-content h2 {
          font-size: 20px;
          font-weight: 700;
          color: #EAF1FF;
          margin: 32px 0 16px 0;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .policy-content h3 {
          font-size: 16px;
          font-weight: 600;
          color: rgba(234,241,255,0.9);
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
          color: #a5b4fc;
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
            color: "#a5b4fc",
            textDecoration: "none",
            fontSize: 14,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 32,
          }}
        >
          ← Back to OwnerView
        </Link>

        <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>
          Privacy Policy
        </h1>

        <p style={{ color: "rgba(234,241,255,0.5)", marginBottom: 48 }}>
          Last updated: January 23, 2026
        </p>

        <div className="policy-content" style={{ color: "rgba(234,241,255,0.8)" }}>
          <section>
            <h2>Introduction</h2>
            <p>
              This Privacy Policy explains how OwnerView ("we," "us," or "our") collects, uses, and
              shares information when you use our Service. We are committed to protecting your privacy
              and do not sell personal information.
            </p>
          </section>

          <section>
            <h2>Information We Collect</h2>

            <h3>Information You Provide</h3>
            <p>
              When you register for an account, subscribe, contact support, or
              otherwise communicate with us, we may collect:
            </p>
            <ul>
              <li>Name and email address</li>
              <li>Billing details and payment information</li>
              <li>Account credentials</li>
              <li>Any other information you choose to provide</li>
            </ul>

            <h3>Connected Account Data (Jobber)</h3>
            <p>
              If you See Your Numbers Now, we access data needed to display analytics,
              including:
            </p>
            <ul>
              <li>Jobs and scheduling information</li>
              <li>Invoices and payment status</li>
              <li>Quotes and client information</li>
              <li>Related business records</li>
            </ul>
            <p>
              You may revoke this access at any time through your Jobber account settings.
            </p>

            <h3>Automatically Collected Information</h3>
            <p>
              We may automatically collect certain information when you use the Service:
            </p>
            <ul>
              <li>IP address and location data</li>
              <li>Browser type and device information</li>
              <li>Usage activity and interaction data</li>
              <li>Diagnostic logs for security and operations</li>
            </ul>
          </section>

          <section>
            <h2>How We Use Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide, operate, and maintain the Service</li>
              <li>Display dashboards and business analytics</li>
              <li>Authenticate users and secure accounts</li>
              <li>Process payments and manage subscriptions</li>
              <li>Provide customer support</li>
              <li>Send important service updates</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2>Marketing Communications</h2>
            <p>
              We may use your email address to send product updates, feature
              announcements, educational content, and other communications
              related to OwnerView.
            </p>
            <p>
              You may opt out of marketing emails at any time by:
            </p>
            <ul>
              <li>Using the unsubscribe link in any marketing email</li>
              <li>Contacting us at support@ownerview.io</li>
            </ul>
          </section>

          <section>
            <h2>How We Share Information</h2>
            <p>
              <strong>We do not sell personal information.</strong> We may share information only in the following circumstances:
            </p>
            <ul>
              <li><strong>Service Providers:</strong> With trusted third parties who help us operate the Service (e.g., payment processors, hosting providers)</li>
              <li><strong>Legal Compliance:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transactions:</strong> In connection with a merger, acquisition, or sale of assets</li>
            </ul>
          </section>

          <section>
            <h2>Data Retention</h2>
            <p>
              We retain information only as long as necessary to:
            </p>
            <ul>
              <li>Provide the Service to you</li>
              <li>Comply with legal obligations</li>
              <li>Resolve disputes and enforce agreements</li>
              <li>Maintain security and prevent fraud</li>
            </ul>
            <p>
              You may request deletion of your data by contacting support@ownerview.io.
            </p>
          </section>

          <section>
            <h2>Security</h2>
            <p>
              We implement reasonable technical and organizational safeguards to protect your
              information, including:
            </p>
            <ul>
              <li>Encryption of data in transit and at rest</li>
              <li>Secure authentication mechanisms</li>
              <li>Regular security assessments</li>
            </ul>
            <p>
              However, no system is completely secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2>Your Rights</h2>
            <p>
              Depending on your location, you may have the right to:
            </p>
            <ul>
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your information</li>
              <li>Object to certain processing of your information</li>
              <li>Export your data in a portable format</li>
            </ul>
            <p>
              <strong>California Residents:</strong> We do not sell personal information as defined under the CCPA.
            </p>
          </section>

          <section>
            <h2>Children</h2>
            <p>
              The Service is not intended for children under 13 years of age. We do not knowingly
              collect personal information from children under 13.
            </p>
          </section>

          <section>
            <h2>Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any
              material changes by posting the new policy on this page and updating the
              "Last updated" date.
            </p>
            <p>
              Your continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2>Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us at:
            </p>
            <p>
              <strong>Email:</strong>{" "}
              <a href="mailto:support@ownerview.io">support@ownerview.io</a>
            </p>
          </section>
        </div>

        <footer
          style={{
            marginTop: 60,
            paddingTop: 32,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            textAlign: "center",
            fontSize: 13,
            color: "rgba(234,241,255,0.4)",
          }}
        >
          <p>© 2026 OwnerView. All rights reserved.</p>
          <p style={{ marginTop: 8 }}>
            <Link href="/privacy" style={{ color: "rgba(234,241,255,0.5)", textDecoration: "none" }}>Privacy Policy</Link>
            {" · "}
            <Link href="/terms" style={{ color: "rgba(234,241,255,0.5)", textDecoration: "none" }}>Terms of Service</Link>
          </p>
        </footer>
      </div>
    </main>
  );
}
