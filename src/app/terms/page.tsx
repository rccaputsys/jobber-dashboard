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
        .policy-content .disclaimer {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 16px;
          margin: 16px 0;
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
          Terms of Service
        </h1>

        <p style={{ color: "rgba(234,241,255,0.5)", marginBottom: 48 }}>
          Last updated: January 23, 2026
        </p>

        <div className="policy-content" style={{ color: "rgba(234,241,255,0.8)" }}>
          <section>
            <h2>Agreement to Terms</h2>
            <p>
              By accessing or using OwnerView ("Service"), you agree to be bound
              by these Terms of Service ("Terms"). If you do not agree to these Terms,
              you may not use the Service.
            </p>
            <p>
              These Terms constitute a legally binding agreement between you and OwnerView.
              Please read them carefully.
            </p>
          </section>

          <section>
            <h2>Description of the Service</h2>
            <p>
              OwnerView provides business analytics and dashboards derived from
              third-party services, including Jobber, to help business owners
              understand and manage their operations more effectively.
            </p>
            <p>
              Our Service includes:
            </p>
            <ul>
              <li>Accounts receivable aging reports and alerts</li>
              <li>Quote tracking and conversion analytics</li>
              <li>Job scheduling and backlog management tools</li>
              <li>Business performance dashboards</li>
            </ul>
          </section>

          <section>
            <h2>Account Registration</h2>
            <p>
              To use the Service, you must:
            </p>
            <ul>
              <li>Create an account with accurate and complete information</li>
              <li>Be at least 18 years old or the age of majority in your jurisdiction</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access</li>
            </ul>
            <p>
              You are responsible for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2>Account Connection and Data Access</h2>
            <p>
              To use certain features, you may See Your Numbers Now using
              OAuth authentication. By connecting your account, you represent that:
            </p>
            <ul>
              <li>You have authority to grant access to the connected account</li>
              <li>You are authorized to share the data contained therein</li>
              <li>Your use complies with the third party's terms of service</li>
            </ul>
            <p>
              <strong>We access Jobber data solely to provide the Service.</strong> We do not sell
              your data, do not use it for advertising, and do not claim ownership of it.
            </p>
            <p>
              You may revoke access at any time through your Jobber account settings.
            </p>
          </section>

          <section>
            <h2>Data Ownership</h2>
            <p>
              <strong>Your data remains your property.</strong> All Jobber data and business
              information you provide belongs to you.
            </p>
            <p>
              We may generate aggregated and anonymized data for product improvement
              purposes. This data will not identify you or your business.
            </p>
          </section>

          <section>
            <h2>No Professional Advice</h2>
            <div className="disclaimer">
              <p style={{ margin: 0 }}>
                <strong>Important:</strong> The Service provides informational tools only and does not
                constitute financial, accounting, tax, legal, or other professional advice.
              </p>
            </div>
            <p>
              You are solely responsible for decisions made using the Service. We recommend
              consulting with qualified professionals for specific business, financial, or legal matters.
            </p>
          </section>

          <section>
            <h2>Subscriptions and Payment</h2>
            <p>
              Certain features of the Service require a paid subscription. By subscribing, you agree that:
            </p>
            <ul>
              <li>Subscriptions renew automatically unless canceled before the renewal date</li>
              <li>You authorize us to charge your payment method for recurring fees</li>
              <li>Failed payments may result in suspension or termination of access</li>
              <li>Fees are non-refundable except where required by law</li>
            </ul>
            <p>
              You may cancel your subscription at any time through your account settings or by
              contacting support@ownerview.io.
            </p>
          </section>

          <section>
            <h2>Free Trial</h2>
            <p>
              We may offer a free trial period for new users. At the end of the trial:
            </p>
            <ul>
              <li>Your subscription will automatically begin unless you cancel</li>
              <li>You will be charged the applicable subscription fee</li>
              <li>You may cancel at any time during the trial without charge</li>
            </ul>
          </section>

          <section>
            <h2>Acceptable Use</h2>
            <p>
              You agree not to:
            </p>
            <ul>
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Reverse engineer, decompile, or disassemble the Service</li>
              <li>Copy, modify, or distribute any part of the Service</li>
              <li>Use automated systems to access the Service without permission</li>
              <li>Impersonate any person or entity</li>
            </ul>
          </section>

          <section>
            <h2>Third-Party Services</h2>
            <p>
              The Service relies on third-party platforms, including Jobber.
            </p>
            <ul>
              <li>OwnerView is not affiliated with or endorsed by Jobber</li>
              <li>We are not responsible for third-party data accuracy or availability</li>
              <li>Third-party services are subject to their own terms and policies</li>
            </ul>
          </section>

          <section>
            <h2>Intellectual Property</h2>
            <p>
              The Service, including all content, features, and functionality, is owned by
              OwnerView and is protected by copyright, trademark, and other intellectual
              property laws.
            </p>
            <p>
              You are granted a limited, non-exclusive, non-transferable license to use the
              Service for your business purposes in accordance with these Terms.
            </p>
          </section>

          <section>
            <h2>Security</h2>
            <p>
              We implement reasonable safeguards to protect your data, including:
            </p>
            <ul>
              <li>Encryption of data in transit and at rest</li>
              <li>Secure authentication mechanisms</li>
              <li>Regular security monitoring</li>
            </ul>
            <p>
              However, no system is completely secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2>Disclaimer of Warranties</h2>
            <div className="disclaimer">
              <p style={{ margin: 0 }}>
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
                EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF
                MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </p>
            </div>
            <p>
              We do not warrant that the Service will be uninterrupted, error-free, or secure.
            </p>
          </section>

          <section>
            <h2>Limitation of Liability</h2>
            <div className="disclaimer">
              <p style={{ margin: 0 }}>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, OWNERVIEW SHALL NOT BE LIABLE FOR ANY
                INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING
                BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES.
              </p>
            </div>
            <p>
              Our total liability for any claims arising from these Terms or your use of the
              Service shall not exceed the amounts you paid to us in the twelve (12) months
              preceding the claim.
            </p>
          </section>

          <section>
            <h2>Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless OwnerView and its officers, directors,
              employees, and agents from any claims, damages, losses, or expenses arising from:
            </p>
            <ul>
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any third-party rights</li>
            </ul>
          </section>

          <section>
            <h2>Termination</h2>
            <p>
              We may suspend or terminate your access to the Service:
            </p>
            <ul>
              <li>For violations of these Terms</li>
              <li>For non-payment of fees</li>
              <li>If required by law</li>
              <li>At our discretion with reasonable notice</li>
            </ul>
            <p>
              You may terminate your account at any time by contacting support@ownerview.io
              or through your account settings.
            </p>
          </section>

          <section>
            <h2>Governing Law</h2>
            <p>
              These Terms are governed by and construed in accordance with the laws of the
              State of Texas, without regard to its conflict of law provisions.
            </p>
            <p>
              Any disputes arising from these Terms shall be resolved in the courts located
              in Texas.
            </p>
          </section>

          <section>
            <h2>Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. We will notify you of any material
              changes by posting the updated Terms on this page and updating the "Last updated" date.
            </p>
            <p>
              Your continued use of the Service after changes constitutes acceptance of the
              updated Terms.
            </p>
          </section>

          <section>
            <h2>Contact Us</h2>
            <p>
              If you have questions about these Terms, please contact us at:
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
