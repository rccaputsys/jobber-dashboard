// src/app/privacy/page.tsx
import React from "react";
import Link from "next/link";

export default function PrivacyPolicy() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #060811 0%, #0A1222 50%, #0d1a2d 100%)",
        color: "#EAF1FF",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 800,
          margin: "0 auto",
          padding: "60px 24px",
        }}
      >
        {/* Header */}
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

        <h1
          style={{
            fontSize: 36,
            fontWeight: 800,
            marginBottom: 8,
          }}
        >
          Privacy Policy
        </h1>
        
        <p style={{ color: "rgba(234,241,255,0.5)", marginBottom: 48 }}>
          Last updated: January 19, 2025
        </p>

        <div
          style={{
            color: "rgba(234,241,255,0.8)",
            lineHeight: 1.8,
            fontSize: 16,
          }}
        >
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: "#fff" }}>
              Introduction
            </h2>
            <p style={{ marginBottom: 16 }}>
              OwnerView ("we", "us", or "our") operates the OwnerView application and website 
              (the "Service"). This page informs you of our policies regarding the collection, 
              use, and disclosure of personal data when you use our Service.
            </p>
            <p>
              We use your data to provide and improve the Service. By using the Service, you 
              agree to the collection and use of information in accordance with this policy.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: "#fff" }}>
              Information We Collect
            </h2>
            
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, color: "#fff" }}>
              Data from Jobber
            </h3>
            <p style={{ marginBottom: 16 }}>
              When you connect your Jobber account, we access and store certain data from your 
              Jobber account, including:
            </p>
            <ul style={{ marginBottom: 24, paddingLeft: 24 }}>
              <li style={{ marginBottom: 8 }}>Account information (company name, account ID)</li>
              <li style={{ marginBottom: 8 }}>Invoice data (invoice numbers, amounts, due dates, client names)</li>
              <li style={{ marginBottom: 8 }}>Job data (job numbers, titles, scheduled dates, amounts)</li>
              <li style={{ marginBottom: 8 }}>Quote data (quote numbers, titles, amounts, status)</li>
            </ul>

            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, color: "#fff" }}>
              Automatically Collected Data
            </h3>
            <p style={{ marginBottom: 16 }}>
              We automatically collect certain information when you use our Service:
            </p>
            <ul style={{ marginBottom: 24, paddingLeft: 24 }}>
              <li style={{ marginBottom: 8 }}>Browser type and version</li>
              <li style={{ marginBottom: 8 }}>Pages visited and time spent</li>
              <li style={{ marginBottom: 8 }}>Device information</li>
              <li style={{ marginBottom: 8 }}>IP address</li>
            </ul>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: "#fff" }}>
              How We Use Your Data
            </h2>
            <p style={{ marginBottom: 16 }}>We use the collected data for the following purposes:</p>
            <ul style={{ marginBottom: 24, paddingLeft: 24 }}>
              <li style={{ marginBottom: 8 }}>To provide and maintain our Service</li>
              <li style={{ marginBottom: 8 }}>To display your business metrics and dashboards</li>
              <li style={{ marginBottom: 8 }}>To notify you about changes to our Service</li>
              <li style={{ marginBottom: 8 }}>To provide customer support</li>
              <li style={{ marginBottom: 8 }}>To detect, prevent, and address technical issues</li>
            </ul>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: "#fff" }}>
              Data Storage and Security
            </h2>
            <p style={{ marginBottom: 16 }}>
              Your data is stored securely using industry-standard encryption. We use Supabase 
              for our database infrastructure, which provides enterprise-grade security including:
            </p>
            <ul style={{ marginBottom: 24, paddingLeft: 24 }}>
              <li style={{ marginBottom: 8 }}>Encryption at rest and in transit</li>
              <li style={{ marginBottom: 8 }}>Regular security audits</li>
              <li style={{ marginBottom: 8 }}>Access controls and authentication</li>
            </ul>
            <p>
              OAuth tokens used to access your Jobber data are encrypted before storage.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: "#fff" }}>
              Data Sharing
            </h2>
            <p style={{ marginBottom: 16 }}>
              We do not sell, trade, or rent your personal data to third parties. We may share 
              data only in the following circumstances:
            </p>
            <ul style={{ marginBottom: 24, paddingLeft: 24 }}>
              <li style={{ marginBottom: 8 }}>With service providers who assist in operating our Service (e.g., hosting, payment processing)</li>
              <li style={{ marginBottom: 8 }}>If required by law or to respond to legal process</li>
              <li style={{ marginBottom: 8 }}>To protect our rights, privacy, safety, or property</li>
            </ul>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: "#fff" }}>
              Your Rights
            </h2>
            <p style={{ marginBottom: 16 }}>You have the right to:</p>
            <ul style={{ marginBottom: 24, paddingLeft: 24 }}>
              <li style={{ marginBottom: 8 }}>Access the personal data we hold about you</li>
              <li style={{ marginBottom: 8 }}>Request correction of inaccurate data</li>
              <li style={{ marginBottom: 8 }}>Request deletion of your data</li>
              <li style={{ marginBottom: 8 }}>Disconnect your Jobber account at any time</li>
              <li style={{ marginBottom: 8 }}>Export your data</li>
            </ul>
            <p>
              To exercise any of these rights, please contact us at{" "}
              <a href="mailto:support@ownerview.io" style={{ color: "#a5b4fc" }}>
                support@ownerview.io
              </a>
              .
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: "#fff" }}>
              Data Retention
            </h2>
            <p>
              We retain your data for as long as your account is active or as needed to provide 
              you with our Service. If you disconnect your Jobber account or request deletion, 
              we will delete your data within 30 days, except where we are required to retain 
              it for legal or legitimate business purposes.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: "#fff" }}>
              Cookies
            </h2>
            <p>
              We use cookies and similar tracking technologies to track activity on our Service 
              and hold certain information. Cookies are used for authentication and to remember 
              your preferences. You can instruct your browser to refuse all cookies, but some 
              features of our Service may not function properly.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: "#fff" }}>
              Changes to This Policy
            </h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any 
              changes by posting the new Privacy Policy on this page and updating the "Last 
              updated" date. You are advised to review this Privacy Policy periodically for 
              any changes.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: "#fff" }}>
              Contact Us
            </h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at{" "}
              <a href="mailto:support@ownerview.io" style={{ color: "#a5b4fc" }}>
                support@ownerview.io
              </a>
              .
            </p>
          </section>
        </div>

        {/* Footer */}
        <footer
          style={{
            marginTop: 60,
            paddingTop: 32,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            textAlign: "center",
            color: "rgba(234,241,255,0.4)",
            fontSize: 13,
          }}
        >
          <p>© 2025 OwnerView. All rights reserved.</p>
          <p style={{ marginTop: 8 }}>
            <Link
              href="/privacy"
              style={{ color: "rgba(234,241,255,0.5)", textDecoration: "none", marginRight: 16 }}
            >
              Privacy Policy
            </Link>
            <Link href="/terms" style={{ color: "rgba(234,241,255,0.5)", textDecoration: "none" }}>
              Terms of Service
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}
