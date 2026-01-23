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
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "60px 24px" }}>
        <Link
          href="/"
          style={{
            color: "#a5b4fc",
            textDecoration: "none",
            fontSize: 14,
            display: "inline-block",
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

        <div style={{ color: "rgba(234,241,255,0.8)", lineHeight: 1.8 }}>
          <section style={{ marginBottom: 40 }}>
            <h2>Introduction</h2>
            <p>
              This Privacy Policy explains how OwnerView collects, uses, and
              shares information when you use our Service. We do not sell
              personal information.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2>Information We Collect</h2>

            <h3>Information You Provide</h3>
            <p>
              When you register for an account, subscribe, contact support, or
              otherwise communicate with us, we may collect your name, email
              address, billing details, and other information you choose to
              provide.
            </p>

            <h3>Connected Account Data (Jobber)</h3>
            <p>
              If you connect Jobber, we access data needed to display analytics,
              such as jobs, invoices, quotes, and related records. You may revoke
              access at any time through Jobber.
            </p>

            <h3>Automatically Collected Information</h3>
            <p>
              We may collect IP address, browser type, device information, usage
              activity, and diagnostic logs for security and operation.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2>How We Use Information</h2>
            <ul>
              <li>Provide and operate the Service</li>
              <li>Display dashboards and analytics</li>
              <li>Authenticate users and secure accounts</li>
              <li>Provide customer support</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2>Marketing Communications</h2>
            <p>
              We may use your email address to send product updates, feature
              announcements, educational content, and other communications
              related to OwnerView. You may opt out of marketing emails at any
              time by using the unsubscribe link included in such emails or by
              contacting us.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2>How We Share Information</h2>
            <p>
              We do not sell personal information. We may share information with
              service providers, for legal compliance, or during a business
              transaction, subject to this Policy.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2>Data Retention</h2>
            <p>
              We retain information only as long as necessary to provide the
              Service, comply with legal obligations, and maintain security.
              You may request deletion by contacting support.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2>Security</h2>
            <p>
              We use reasonable safeguards to protect information but cannot
              guarantee absolute security.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2>Your Rights</h2>
            <p>
              You may request access, correction, or deletion of personal
              information. California residents: we do not sell personal
              information.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2>Children</h2>
            <p>
              The Service is not intended for children under 13.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2>Changes</h2>
            <p>
              We may update this Policy. Continued use means acceptance.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2>Contact</h2>
            <p>
              Email{" "}
              <a href="mailto:support@ownerview.io" style={{ color: "#a5b4fc" }}>
                support@ownerview.io
              </a>
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
          <p>
            <Link href="/privacy">Privacy Policy</Link> ·{" "}
            <Link href="/terms">Terms of Service</Link>
          </p>
        </footer>
      </div>
    </main>
  );
}
