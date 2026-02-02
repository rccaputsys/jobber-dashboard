import React from "react";
import Link from "next/link";

export default function TermsOfService() {
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
        .policy-content .disclaimer {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
          margin: 16px 0;
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
          Terms of Service
        </h1>

        <p style={{ color: "#64748b", marginBottom: 48 }}>
          Last updated: February 2, 2026
        </p>

        <div className="policy-content" style={{ color: "#475569" }}>
          <section>
            <h2>Agreement to Terms</h2>
            <p>
              By using AccuInsight ("Service"), you agree to these Terms of Service. If you don't agree, please don't use the Service.
            </p>
          </section>

          <section>
            <h2>What AccuInsight Does</h2>
            <p>
              AccuInsight connects to your Jobber account and displays business analytics to help you:
            </p>
            <ul>
              <li>Track accounts receivable aging and overdue invoices</li>
              <li>Monitor quote conversion rates and follow-up opportunities</li>
              <li>Manage unscheduled jobs and backlog</li>
              <li>See trends in your key business metrics</li>
            </ul>
            <p>
              We read your Jobber data to display insights. We never modify your Jobber data.
            </p>
          </section>

          <section>
            <h2>Your Account</h2>
            <p>
              To use AccuInsight, you must:
            </p>
            <ul>
              <li>Create an account with accurate information</li>
              <li>Be at least 18 years old</li>
              <li>Keep your login credentials secure</li>
              <li>Notify us immediately if you suspect unauthorized access</li>
            </ul>
            <p>
              You're responsible for all activity under your account.
            </p>
          </section>

          <section>
            <h2>Connecting Jobber</h2>
            <p>
              When you connect your Jobber account via OAuth, you confirm that:
            </p>
            <ul>
              <li>You have authority to grant access to that Jobber account</li>
              <li>You're authorized to share the business data it contains</li>
              <li>Your use complies with Jobber's terms of service</li>
            </ul>
            <p>
              You can disconnect Jobber anytime from your AccuInsight dashboard or from Jobber's App Marketplace. When you disconnect, we delete your Jobber data immediately.
            </p>
          </section>

          <section>
            <h2>Your Data</h2>
            <p>
              <strong>Your data belongs to you.</strong> We don't sell it and don't claim ownership of it.
            </p>
            <p>
              You grant us a license to use your data to:
            </p>
            <ul>
              <li>Provide and improve the Service</li>
              <li>Create aggregated, anonymized benchmarks and industry research</li>
              <li>Publish insights about home service industry trends (without identifying your business)</li>
            </ul>
            <p>
              We will never share data that identifies you or your business without your explicit consent.
            </p>
          </section>

          <section>
            <h2>Not Professional Advice</h2>
            <div className="disclaimer">
              <p style={{ margin: 0 }}>
                <strong>Important:</strong> AccuInsight provides informational dashboards only—not financial, accounting, tax, or legal advice. Consult qualified professionals for business decisions.
              </p>
            </div>
          </section>

          <section>
            <h2>Pricing & Payment</h2>
            <p>
              AccuInsight offers a free trial followed by a paid subscription. Current pricing is available at signup.
            </p>
            <ul>
              <li>Your subscription renews automatically each month</li>
              <li>Cancel anytime—you'll keep access until the end of your billing period</li>
              <li>No refunds for partial months (except where required by law)</li>
              <li>Failed payments may result in access suspension</li>
            </ul>
            <p>
              Cancel via your dashboard or email support@ownerview.io.
            </p>
          </section>

          <section>
            <h2>Free Trial</h2>
            <p>
              New users get a free trial. At the end of your trial:
            </p>
            <ul>
              <li>Subscribe to continue using AccuInsight</li>
              <li>If you don't subscribe, you'll lose access to the dashboard</li>
              <li>Your data remains available if you subscribe later</li>
            </ul>
          </section>

          <section>
            <h2>Don't Do These Things</h2>
            <ul>
              <li>Use AccuInsight for anything illegal</li>
              <li>Try to hack, reverse engineer, or break the Service</li>
              <li>Scrape data or use bots without permission</li>
              <li>Share your account with others</li>
              <li>Impersonate someone else</li>
            </ul>
          </section>

          <section>
            <h2>Third-Party Services</h2>
            <p>
              AccuInsight integrates with Jobber but is not affiliated with or endorsed by Jobber. We're also not responsible for:
            </p>
            <ul>
              <li>Jobber's uptime or data accuracy</li>
              <li>Changes Jobber makes to their API</li>
              <li>Jobber's terms of service or policies</li>
            </ul>
          </section>

          <section>
            <h2>Our Intellectual Property</h2>
            <p>
              AccuInsight's design, code, and branding belong to OwnerView. You get a license to use the Service for your business—not to copy, resell, or redistribute it.
            </p>
          </section>

          <section>
            <h2>Service Availability</h2>
            <div className="disclaimer">
              <p style={{ margin: 0 }}>
                AccuInsight is provided "as is." We do our best to keep it running smoothly, but we can't guarantee 100% uptime or that it will be error-free.
              </p>
            </div>
          </section>

          <section>
            <h2>Limitation of Liability</h2>
            <div className="disclaimer">
              <p style={{ margin: 0 }}>
                To the maximum extent permitted by law, OwnerView is not liable for indirect, incidental, or consequential damages. Our total liability is limited to what you've paid us in the past 12 months.
              </p>
            </div>
          </section>

          <section>
            <h2>We Can Terminate Access</h2>
            <p>
              We may suspend or terminate your account if you:
            </p>
            <ul>
              <li>Violate these Terms</li>
              <li>Don't pay your subscription</li>
              <li>Use the Service in a way that harms others</li>
            </ul>
            <p>
              You can cancel anytime via your dashboard or by emailing support@ownerview.io.
            </p>
          </section>

          <section>
            <h2>Governing Law</h2>
            <p>
              These Terms are governed by Texas law. Any disputes will be resolved in Texas courts.
            </p>
          </section>

          <section>
            <h2>Changes to Terms</h2>
            <p>
              We may update these Terms occasionally. We'll notify you of material changes via email or dashboard notification. Continued use after changes means you accept the new Terms.
            </p>
          </section>

          <section>
            <h2>Contact</h2>
            <p>
              Questions? Email <a href="mailto:support@ownerview.io">support@ownerview.io</a>
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