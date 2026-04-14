import React from "react";
import Link from "next/link";

export default function PrivacyPolicy() {
  return (
    <main style={styles.page}>
      <style>{globalStyles}</style>
      <div style={styles.container}>
        <Link href="/jobber" style={styles.back}>← Back to AccuInsight</Link>
        <h1 style={styles.h1}>Privacy Policy</h1>
        <p style={styles.updated}>Last updated: April 14, 2026</p>

        <div className="policy-content" style={{ color: "#475569" }}>
          <section>
            <h2>1. Who we are</h2>
            <p>
              AccuInsight is a product of <strong>Corel Holdings LLC</strong> (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;), a Texas limited liability company. Our business address is:
            </p>
            <p>
              3001 S Hardin Blvd, Ste 110 PMB 1106<br />
              McKinney, TX 75070<br />
              United States
            </p>
            <p>
              For privacy questions, data-subject requests, or any other inquiry: <a href="mailto:support@ownerview.io">support@ownerview.io</a>.
            </p>
          </section>

          <section>
            <h2>2. Scope</h2>
            <p>
              This policy applies to AccuInsight (the &quot;Service&quot;) — the analytics dashboard accessed at <em>app.accuinsight.io</em> — and the marketing site at <em>accuinsight.io</em>. It explains what we collect, how we use it, who we share it with, and the rights you have over it.
            </p>
          </section>

          <section>
            <h2>3. Information we collect</h2>

            <h3>Information you provide</h3>
            <ul>
              <li>Account: email, password, owner name, business type, team size.</li>
              <li>Billing: payment card and billing address (handled by Stripe — we never see the full card number).</li>
              <li>Support correspondence you send us.</li>
            </ul>

            <h3>Information from your Jobber account</h3>
            <p>When you authorize AccuInsight via OAuth, we read (never modify):</p>
            <ul>
              <li>Jobs, visits, quotes, invoices, and requests.</li>
              <li>Client names, invoice totals, balances, due dates, and payment timestamps.</li>
              <li>Account metadata (company name, currency code).</li>
            </ul>
            <p>
              We do not read job notes, file attachments, photos, or any data outside what is needed for the dashboard. You can revoke our access anytime in your AccuInsight dashboard or from Jobber&apos;s App Marketplace.
            </p>

            <h3>Automatically collected information</h3>
            <ul>
              <li>IP address and coarse geolocation.</li>
              <li>Browser and device metadata.</li>
              <li>Page views, feature usage, and error logs.</li>
              <li>Performance metrics via Vercel Speed Insights.</li>
            </ul>

            <h3>Cookies and local storage</h3>
            <p>
              We use strictly-necessary cookies and local storage to keep you signed in, remember your last-used filters, and count rate-limited attempts. We do not use advertising cookies or third-party trackers.
            </p>
          </section>

          <section>
            <h2>4. How we use information</h2>
            <ul>
              <li>Operate and display your dashboard.</li>
              <li>Authenticate you and keep your account secure.</li>
              <li>Process payments and manage your subscription.</li>
              <li>Send transactional emails (billing receipts, security alerts, trial expiration).</li>
              <li>Send product updates and marketing emails (you can opt out anytime — see Section 11).</li>
              <li>Provide customer support.</li>
              <li>Detect abuse, fraud, and security threats.</li>
              <li>Improve the Service, including creating anonymized, aggregated industry benchmarks that never identify you or your business.</li>
              <li>Comply with legal obligations.</li>
            </ul>
          </section>

          <section>
            <h2>5. Legal bases (EU/UK customers)</h2>
            <p>If you are in the EU, UK, or similar jurisdiction, we rely on these legal bases under GDPR / UK-GDPR:</p>
            <ul>
              <li><strong>Contract performance:</strong> operating your account, billing, providing the dashboard.</li>
              <li><strong>Legitimate interests:</strong> product improvement, security, fraud prevention, aggregated benchmarking.</li>
              <li><strong>Consent:</strong> marketing emails. You can withdraw consent at any time.</li>
              <li><strong>Legal obligation:</strong> tax, anti-fraud, and records retention required by law.</li>
            </ul>
          </section>

          <section>
            <h2>6. How we share information</h2>
            <p>
              <strong>We do not sell your personal information.</strong> We share only with the sub-processors below, and only as needed to operate the Service:
            </p>
            <ul>
              <li><strong>Stripe</strong> — payment processing (United States).</li>
              <li><strong>Supabase</strong> — database and authentication (United States).</li>
              <li><strong>Vercel</strong> — application hosting and edge network (United States).</li>
              <li><strong>Upstash / Vercel KV</strong> — rate-limit storage (United States).</li>
              <li><strong>Resend</strong> — transactional email delivery (United States).</li>
              <li><strong>Jobber</strong> — the data source you connect; Jobber&apos;s own privacy policy governs their processing.</li>
            </ul>
            <p>We may disclose information to comply with a subpoena, court order, or lawful government request, or to protect our rights, property, or safety (or those of our users).</p>
          </section>

          <section>
            <h2>7. International transfers</h2>
            <p>
              We process data in the United States. If you are in the EU, UK, Canada, Australia, or elsewhere outside the US, transferring your data to our US-based sub-processors is necessary to deliver the Service. Where required, we rely on Standard Contractual Clauses (EU/UK), adequacy decisions, or equivalent mechanisms.
            </p>
          </section>

          <section>
            <h2>8. Data retention</h2>
            <ul>
              <li>Jobber-sourced data (jobs, invoices, quotes, visits, requests) is retained while your account is active and deleted within 7 days after you disconnect Jobber.</li>
              <li>Account and billing records are retained for 30 days after you cancel, in case you reactivate.</li>
              <li>After 30 days, your account is deleted, except for records we must retain by law (tax, anti-fraud).</li>
              <li>Anonymized, aggregated data that does not identify you may be retained indefinitely.</li>
            </ul>
            <p>You can request immediate deletion at any time: <a href="mailto:support@ownerview.io">support@ownerview.io</a>.</p>
          </section>

          <section>
            <h2>9. Security</h2>
            <ul>
              <li>All data is encrypted in transit (TLS) and at rest.</li>
              <li>We authenticate to Jobber via OAuth — we never see or store your Jobber password.</li>
              <li>Supabase Row-Level Security enforces that you can only access your own data at the database layer.</li>
              <li>Access tokens are encrypted at application level before storage.</li>
              <li>We rate-limit sensitive endpoints and monitor for anomalous activity.</li>
            </ul>
            <p>No system is perfectly secure. If we learn of a breach that affects your data, we will notify you without undue delay and in accordance with applicable law.</p>
          </section>

          <section>
            <h2>10. Your rights</h2>

            <h3>Rights available to all users</h3>
            <ul>
              <li>Access a copy of your data.</li>
              <li>Correct inaccurate data.</li>
              <li>Delete your account and data.</li>
              <li>Disconnect Jobber at any time.</li>
              <li>Opt out of marketing email.</li>
            </ul>

            <h3>California residents (CCPA / CPRA)</h3>
            <p>You have the right to know what personal information we collect, to have it deleted, to correct inaccuracies, to opt out of the sale or sharing of personal information (we do neither), and to not be discriminated against for exercising these rights. To exercise any right, email <a href="mailto:support@ownerview.io">support@ownerview.io</a>. We will verify your identity before fulfilling the request.</p>

            <h3>EU / UK / EEA (GDPR)</h3>
            <p>In addition to the rights listed above, you have the rights of rectification, erasure, portability (machine-readable export), restriction of processing, and objection to processing based on legitimate interests. You may withdraw consent for marketing at any time. You also have the right to lodge a complaint with your local data protection authority.</p>

            <h3>Canadian residents (PIPEDA)</h3>
            <p>You may request access to your personal information and challenge its accuracy. If unresolved, you may contact the Office of the Privacy Commissioner of Canada.</p>

            <h3>Australian residents (Privacy Act 1988 / APPs)</h3>
            <p>You may access and correct your personal information and complain about our handling of it. If unresolved with us, you may contact the Office of the Australian Information Commissioner.</p>

            <p>To exercise any right, email <a href="mailto:support@ownerview.io">support@ownerview.io</a>. We respond within 30 days.</p>
          </section>

          <section>
            <h2>11. Marketing communications</h2>
            <p>
              With your consent we may send product updates, tips, and announcements. You can opt out anytime by clicking &quot;unsubscribe&quot; in any marketing email or emailing <a href="mailto:support@ownerview.io">support@ownerview.io</a>. We will continue to send transactional emails (billing receipts, security alerts, service updates) regardless of marketing preferences — these are necessary to operate your account.
            </p>
          </section>

          <section>
            <h2>12. Children</h2>
            <p>
              AccuInsight is a tool for business owners and is not intended for anyone under 18. We do not knowingly collect personal information from anyone under 18. If you believe a child has provided information to us, please contact <a href="mailto:support@ownerview.io">support@ownerview.io</a> and we will delete it.
            </p>
          </section>

          <section>
            <h2>13. Changes to this policy</h2>
            <p>
              We may update this policy from time to time. Material changes will be communicated by email or dashboard notification before they take effect. The &quot;Last updated&quot; date at the top of this page reflects the most recent change.
            </p>
          </section>

          <section>
            <h2>14. Contact</h2>
            <p>
              Questions, requests, or concerns: <a href="mailto:support@ownerview.io">support@ownerview.io</a>.
            </p>
            <p>
              Corel Holdings LLC<br />
              3001 S Hardin Blvd, Ste 110 PMB 1106<br />
              McKinney, TX 75070
            </p>
          </section>
        </div>

        <footer style={styles.footer}>
          <p>© 2026 Corel Holdings LLC. AccuInsight is a product of Corel Holdings LLC.</p>
          <p style={{ marginTop: 8 }}>
            <Link href="/privacy" style={styles.footLink}>Privacy</Link>
            {" · "}
            <Link href="/terms" style={styles.footLink}>Terms</Link>
          </p>
        </footer>
      </div>
    </main>
  );
}

const globalStyles = `
  .policy-content h2 { font-size: 20px; font-weight: 700; color: #1e293b; margin: 32px 0 16px 0; padding-bottom: 8px; border-bottom: 1px solid #e8e5df; }
  .policy-content h3 { font-size: 16px; font-weight: 600; color: #334155; margin: 24px 0 10px 0; }
  .policy-content p  { margin: 0 0 14px 0; line-height: 1.75; }
  .policy-content ul { margin: 0 0 16px 0; padding-left: 22px; }
  .policy-content li { margin: 6px 0; line-height: 1.7; }
  .policy-content li::marker { color: #c2410c; }
  .policy-content section { margin-bottom: 28px; }
  .policy-content a { color: #c2410c; text-decoration: none; }
  .policy-content a:hover { text-decoration: underline; }
`;

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: "100vh",
    background: "#fbfaf7",
    color: "#1a1a1a",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  container: { maxWidth: 800, margin: "0 auto", padding: "60px 24px" },
  back: {
    color: "#c2410c", textDecoration: "none", fontSize: 14,
    display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 32,
  },
  h1: { fontSize: 36, fontWeight: 700, marginBottom: 8, color: "#1a1a1a", letterSpacing: -0.5 },
  updated: { color: "#6b6b6b", marginBottom: 48 },
  footer: {
    marginTop: 60, paddingTop: 32, borderTop: "1px solid #e8e5df",
    textAlign: "center", fontSize: 13, color: "#9a9a9a",
  },
  footLink: { color: "#6b6b6b", textDecoration: "none" },
};
