import React from "react";
import Link from "next/link";

export default function TermsOfService() {
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
          Terms of Service
        </h1>

        <p style={{ color: "rgba(234,241,255,0.5)", marginBottom: 48 }}>
          Last updated: January 23, 2026
        </p>

        <div style={{ color: "rgba(234,241,255,0.8)", lineHeight: 1.8 }}>
          <section style={{ marginBottom: 40 }}>
            <h2>Agreement to Terms</h2>
            <p>
              By accessing or using OwnerView (“Service”), you agree to be bound
              by these Terms of Service (“Terms”). If you do not agree, you may
              not use the Service.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2>Description of the Service</h2>
            <p>
              OwnerView provides business analytics and dashboards derived from
              third-party services, including Jobber, to help business owners
              understand their operations.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2>Account Connection and Data Access</h2>
            <p>
              To use certain features, you may connect your Jobber account using
              OAuth authentication. You represent that you have authority to
              grant this access.
            </p>
            <p>
              We access Jobber data solely to provide the Service. We do not sell
              your data, do not use it for advertising, and do not claim
              ownership of it. You may revoke access at any time through Jobber.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2>Data Ownership</h2>
            <p>
              All Jobber data remains your property. We may generate aggregated
              and anonymized data for product improvement that does not identify
              you or your business.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2>No Professional Advice</h2>
            <p>
              The Service provides informational tools only and does not provide
              financial, accounting, tax, or legal advice. You are responsible
              for decisions made using the Service.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2>Subscriptions and Payment</h2>
            <p>
              Certain features require payment. Subscriptions renew
              automatically unless canceled. Failed payments may result in
              suspension. Fees are non-refundable except where required by law.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2>Acceptable Use</h2>
            <ul>
              <li>Do not misuse or attempt to disrupt the Service</li>
              <li>Do not access the Service unlawfully</li>
              <li>Do not reverse engineer or copy the Service</li>
            </ul>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2>Third-Party Services</h2>
            <p>
              The Service relies on third-party platforms, including Jobber.
              OwnerView is not affiliated with or endorsed by Jobber and is not
              responsible for third-party data accuracy or availability.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2>Security</h2>
            <p>
              We implement reasonable safeguards to protect data, but no system
              is completely secure.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2>Disclaimer of Warranties</h2>
            <p>
              THE SERVICE IS PROVIDED “AS IS” WITHOUT WARRANTIES OF ANY KIND.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2>Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, OWNERVIEW SHALL NOT BE
              LIABLE FOR INDIRECT OR CONSEQUENTIAL DAMAGES. TOTAL LIABILITY
              SHALL NOT EXCEED AMOUNTS PAID IN THE PRIOR 12 MONTHS.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2>Termination</h2>
            <p>
              We may suspend or terminate access for violations of these Terms.
              You may revoke Jobber access at any time.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2>Governing Law</h2>
            <p>
              These Terms are governed by the laws of the State of Texas.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2>Changes</h2>
            <p>
              We may update these Terms. Continued use constitutes acceptance.
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
