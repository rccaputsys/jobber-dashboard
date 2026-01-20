// src/app/terms/page.tsx
import React from "react";
import Link from "next/link";

export default function TermsOfService() {
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
          Terms of Service
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
              Agreement to Terms
            </h2>
            <p>
              By accessing or using OwnerView ("Service"), you agree to be bound by these Terms 
              of Service ("Terms"). If you disagree with any part of the terms, you may not 
              access the Service. These Terms apply to all visitors, users, and others who 
              access or use the Service.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: "#fff" }}>
              Description of Service
            </h2>
            <p>
              OwnerView provides a business intelligence dashboard that connects to your Jobber 
              account to display metrics, analytics, and actionable insights about your 
              invoices, jobs, and quotes. The Service is designed to help service business 
              owners make better decisions by providing visibility into their operations.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: "#fff" }}>
              Account Registration
            </h2>
            <p style={{ marginBottom: 16 }}>
              To use the Service, you must connect your Jobber account through OAuth 
              authentication. By connecting your account, you:
            </p>
            <ul style={{ marginBottom: 24, paddingLeft: 24 }}>
              <li style={{ marginBottom: 8 }}>Confirm you have the authority to grant access to the Jobber account</li>
              <li style={{ marginBottom: 8 }}>Authorize us to access your Jobber data as described in our Privacy Policy</li>
              <li style={{ marginBottom: 8 }}>Agree to maintain the security of your account credentials</li>
            </ul>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: "#fff" }}>
              Subscriptions and Payment
            </h2>
            <p style={{ marginBottom: 16 }}>
              Some features of the Service require a paid subscription. By subscribing, you agree to:
            </p>
            <ul style={{ marginBottom: 24, paddingLeft: 24 }}>
              <li style={{ marginBottom: 8 }}>Pay all applicable fees as described at the time of purchase</li>
              <li style={{ marginBottom: 8 }}>Provide accurate billing information</li>
              <li style={{ marginBottom: 8 }}>Automatic renewal of your subscription unless cancelled</li>
            </ul>
            <p style={{ marginBottom: 16 }}>
              <strong style={{ color: "#fff" }}>Free Trial:</strong> We may offer a free trial period. 
              At the end of the trial, you will be charged unless you cancel before the trial ends.
            </p>
            <p style={{ marginBottom: 16 }}>
              <strong style={{ color: "#fff" }}>Cancellation:</strong> You may cancel your subscription 
              at any time. Cancellation will take effect at the end of the current billing period. 
              No refunds will be provided for partial billing periods.
            </p>
            <p>
              <strong style={{ color: "#fff" }}>Price Changes:</strong> We reserve the right to change 
              our prices. Any price changes will be communicated in advance and will apply to the 
              next billing cycle.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: "#fff" }}>
              Acceptable Use
            </h2>
            <p style={{ marginBottom: 16 }}>You agree not to:</p>
            <ul style={{ marginBottom: 24, paddingLeft: 24 }}>
              <li style={{ marginBottom: 8 }}>Use the Service for any unlawful purpose</li>
              <li style={{ marginBottom: 8 }}>Attempt to gain unauthorized access to any part of the Service</li>
              <li style={{ marginBottom: 8 }}>Interfere with or disrupt the Service or servers</li>
              <li style={{ marginBottom: 8 }}>Reverse engineer, decompile, or disassemble the Service</li>
              <li style={{ marginBottom: 8 }}>Use automated systems to access the Service without permission</li>
              <li style={{ marginBottom: 8 }}>Share your account access with unauthorized users</li>
            </ul>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: "#fff" }}>
              Intellectual Property
            </h2>
            <p style={{ marginBottom: 16 }}>
              The Service and its original content, features, and functionality are owned by 
              OwnerView and are protected by international copyright, trademark, and other 
              intellectual property laws.
            </p>
            <p>
              Your Jobber data remains your property. We claim no ownership over any data 
              you provide or that we access from your Jobber account.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: "#fff" }}>
              Third-Party Services
            </h2>
            <p>
              The Service integrates with Jobber and may integrate with other third-party 
              services. Your use of these third-party services is subject to their respective 
              terms of service and privacy policies. We are not responsible for the content, 
              privacy practices, or availability of third-party services.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: "#fff" }}>
              Disclaimer of Warranties
            </h2>
            <p style={{ marginBottom: 16 }}>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY 
              KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES 
              OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
            <p>
              We do not warrant that the Service will be uninterrupted, error-free, or secure, 
              or that any defects will be corrected. The metrics and data displayed are based 
              on information from your Jobber account and may not reflect real-time data.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: "#fff" }}>
              Limitation of Liability
            </h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, OWNERVIEW SHALL NOT BE LIABLE FOR ANY 
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING 
              BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES, ARISING 
              OUT OF OR RELATED TO YOUR USE OF THE SERVICE, EVEN IF WE HAVE BEEN ADVISED OF 
              THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL LIABILITY SHALL NOT EXCEED THE 
              AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: "#fff" }}>
              Indemnification
            </h2>
            <p>
              You agree to indemnify and hold harmless OwnerView and its officers, directors, 
              employees, and agents from any claims, damages, losses, or expenses (including 
              reasonable attorneys&apos; fees) arising out of your use of the Service, your 
              violation of these Terms, or your violation of any rights of a third party.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: "#fff" }}>
              Termination
            </h2>
            <p style={{ marginBottom: 16 }}>
              We may terminate or suspend your access to the Service immediately, without 
              prior notice or liability, for any reason, including if you breach these Terms.
            </p>
            <p>
              Upon termination, your right to use the Service will cease immediately. You may 
              disconnect your Jobber account and request deletion of your data at any time.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: "#fff" }}>
              Governing Law
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of 
              the State of Texas, United States, without regard to its conflict of law 
              provisions. Any disputes arising under these Terms shall be resolved in the 
              courts located in Texas.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: "#fff" }}>
              Changes to Terms
            </h2>
            <p>
              We reserve the right to modify or replace these Terms at any time. If a revision 
              is material, we will provide at least 30 days&apos; notice prior to any new terms 
              taking effect. By continuing to access or use our Service after revisions become 
              effective, you agree to be bound by the revised terms.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: "#fff" }}>
              Contact Us
            </h2>
            <p>
              If you have any questions about these Terms, please contact us at{" "}
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
