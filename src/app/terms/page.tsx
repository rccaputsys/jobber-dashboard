import React from "react";
import Link from "next/link";

export default function TermsOfService() {
  return (
    <main style={styles.page}>
      <style>{globalStyles}</style>
      <div style={styles.container}>
        <Link href="/jobber" style={styles.back}>← Back to AccuInsight</Link>
        <h1 style={styles.h1}>Terms of Service</h1>
        <p style={styles.updated}>Last updated: April 14, 2026</p>

        <div className="policy-content" style={{ color: "#475569" }}>
          <section>
            <h2>1. Agreement</h2>
            <p>
              These Terms of Service (&quot;Terms&quot;) are a binding agreement between you and <strong>Corel Holdings LLC</strong> (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;), a Texas limited liability company with offices at 3001 S Hardin Blvd, Ste 110 PMB 1106, McKinney, TX 75070. They govern your use of AccuInsight (the &quot;Service&quot;). By creating an account, connecting Jobber, or otherwise using the Service, you agree to these Terms. If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2>2. What the Service does</h2>
            <p>
              AccuInsight connects to your Jobber account via OAuth and displays analytics about your business: accounts receivable, quote pipeline, scheduling capacity, and related metrics. We read Jobber data only to display it back to you. We do not modify your Jobber data.
            </p>
          </section>

          <section>
            <h2>3. Eligibility and your account</h2>
            <ul>
              <li>You must be at least 18 years old and legally able to enter binding contracts in your jurisdiction.</li>
              <li>You must provide accurate information when creating your account and keep it up to date.</li>
              <li>You are responsible for all activity under your account and for keeping your credentials secure.</li>
              <li>Notify us immediately at <a href="mailto:ryan@ownerview.io">ryan@ownerview.io</a> if you suspect unauthorized access.</li>
            </ul>
          </section>

          <section>
            <h2>4. Connecting Jobber</h2>
            <p>When you connect Jobber, you represent that:</p>
            <ul>
              <li>You have the authority to grant access to that Jobber account.</li>
              <li>You are authorized to share the business data it contains with us.</li>
              <li>Your use of AccuInsight complies with Jobber&apos;s own terms of service.</li>
            </ul>
            <p>
              You may disconnect Jobber at any time from the AccuInsight dashboard or from Jobber&apos;s App Marketplace. When you disconnect, we delete Jobber-sourced data from our systems in line with our Privacy Policy.
            </p>
          </section>

          <section>
            <h2>5. Your data</h2>
            <p>
              <strong>Your data belongs to you.</strong> We do not claim ownership of it and we do not sell it. You grant Corel Holdings LLC a worldwide, non-exclusive, royalty-free license to host, process, transmit, and display your data solely to operate, secure, and improve the Service, including to create anonymized, aggregated benchmarks that do not identify you or your business.
            </p>
          </section>

          <section>
            <h2>6. Subscription, trial, and billing</h2>
            <ul>
              <li>AccuInsight offers a free trial followed by a paid subscription. Current pricing is shown at signup and on the marketing site.</li>
              <li>Subscriptions renew automatically on a monthly (or other) cycle until you cancel.</li>
              <li>You may cancel anytime from the dashboard or by emailing <a href="mailto:ryan@ownerview.io">ryan@ownerview.io</a>. Cancellation takes effect at the end of the current billing period; no partial refunds except where required by law.</li>
              <li>If a payment fails, we may suspend your access until it succeeds.</li>
              <li>We may change prices with at least 30 days&apos; notice. Price changes do not apply mid-billing-period.</li>
              <li>You are responsible for any applicable taxes.</li>
            </ul>
          </section>

          <section>
            <h2>7. Acceptable use</h2>
            <p>You will not:</p>
            <ul>
              <li>Use the Service for any illegal purpose or in violation of any applicable law.</li>
              <li>Attempt to probe, scan, reverse-engineer, or circumvent our security controls.</li>
              <li>Scrape the Service, use bots against it, or interfere with its operation.</li>
              <li>Resell, sublicense, or redistribute access to the Service.</li>
              <li>Impersonate another person or misrepresent your affiliation with any entity.</li>
              <li>Upload or submit content that infringes intellectual property, is defamatory, or violates privacy rights.</li>
            </ul>
            <p>Violations may result in immediate suspension or termination without refund.</p>
          </section>

          <section>
            <h2>8. Our intellectual property</h2>
            <p>
              The Service, including its software, design, branding, and documentation, is owned by Corel Holdings LLC and protected by intellectual property laws. We grant you a limited, non-exclusive, non-transferable, revocable license to use the Service for your internal business purposes while these Terms are in effect. All rights not expressly granted are reserved.
            </p>
          </section>

          <section>
            <h2>9. Third-party services</h2>
            <p>
              AccuInsight integrates with third-party services, most importantly Jobber. We are not affiliated with, endorsed by, or sponsored by Jobber Software Inc. We are not responsible for third-party uptime, data accuracy, policies, or terms. If Jobber changes their API in a way that affects the Service, we will adapt as quickly as reasonably possible.
            </p>
          </section>

          <section>
            <h2>10. Not professional advice</h2>
            <div className="disclaimer">
              <p style={{ margin: 0 }}>
                <strong>AccuInsight provides informational dashboards only.</strong> Nothing in the Service constitutes financial, accounting, tax, legal, or investment advice. Decisions you make about your business are your own. Consult qualified professionals as appropriate.
              </p>
            </div>
          </section>

          <section>
            <h2>11. Disclaimers</h2>
            <div className="disclaimer">
              <p style={{ margin: 0 }}>
                THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE,&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, AND UNINTERRUPTED OR ERROR-FREE OPERATION. WE DO NOT WARRANT THAT DATA WILL BE ACCURATE, COMPLETE, OR CURRENT, OR THAT THE SERVICE WILL MEET YOUR REQUIREMENTS.
              </p>
            </div>
          </section>

          <section>
            <h2>12. Limitation of liability</h2>
            <div className="disclaimer">
              <p style={{ margin: 0 }}>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, COREL HOLDINGS LLC AND ITS AFFILIATES, OFFICERS, EMPLOYEES, AND AGENTS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY FOR ALL CLAIMS IN ANY 12-MONTH PERIOD IS LIMITED TO THE AMOUNT YOU PAID US IN THE PRIOR 12 MONTHS, OR USD $100, WHICHEVER IS GREATER.
              </p>
            </div>
          </section>

          <section>
            <h2>13. Indemnification</h2>
            <p>
              You agree to indemnify and hold Corel Holdings LLC harmless from any claims, losses, damages, liabilities, and expenses (including reasonable attorneys&apos; fees) arising out of (a) your breach of these Terms, (b) your violation of applicable law, or (c) your misuse of data obtained through the Service.
            </p>
          </section>

          <section>
            <h2>14. Termination</h2>
            <p>
              We may suspend or terminate your access if you violate these Terms, fail to pay, or use the Service in a way that harms others or us. You may terminate by cancelling your subscription and/or emailing <a href="mailto:ryan@ownerview.io">ryan@ownerview.io</a>. Sections that by their nature should survive termination (IP, disclaimers, liability, indemnification, dispute resolution, governing law) will do so.
            </p>
          </section>

          <section>
            <h2>15. Binding arbitration and class-action waiver</h2>
            <div className="disclaimer">
              <p>
                <strong>Please read carefully — this section affects your legal rights.</strong>
              </p>
              <p>
                Except for disputes that qualify for small-claims court, any dispute arising out of or relating to these Terms or the Service will be resolved by binding individual arbitration administered by JAMS under its Streamlined Arbitration Rules. The arbitration will be conducted in Collin County, Texas, or by video conference at the arbitrator&apos;s discretion. Judgment on the award may be entered in any court of competent jurisdiction.
              </p>
              <p>
                <strong>Class-action waiver:</strong> You and Corel Holdings LLC each waive any right to bring or participate in a class, collective, or representative action. Claims may be brought only in an individual capacity.
              </p>
              <p>
                <strong>Opt-out:</strong> You may opt out of this arbitration clause by emailing <a href="mailto:ryan@ownerview.io">ryan@ownerview.io</a> within 30 days of first accepting these Terms, stating your name and that you opt out of arbitration. Opting out will not affect any other part of these Terms.
              </p>
            </div>
          </section>

          <section>
            <h2>16. Governing law and venue</h2>
            <p>
              These Terms are governed by the laws of the State of Texas, without regard to conflict-of-laws principles. Any claim not subject to arbitration will be brought exclusively in the state or federal courts located in Collin County, Texas, and you consent to personal jurisdiction there. Nothing in this section limits rights you may have under mandatory consumer laws in your jurisdiction.
            </p>
          </section>

          <section>
            <h2>17. Changes to these Terms</h2>
            <p>
              We may update these Terms from time to time. Material changes will be communicated by email or dashboard notification at least 30 days before they take effect. Continued use of the Service after the effective date means you accept the updated Terms.
            </p>
          </section>

          <section>
            <h2>18. Miscellaneous</h2>
            <ul>
              <li><strong>Entire agreement:</strong> these Terms plus the Privacy Policy are the full agreement between you and Corel Holdings LLC regarding the Service.</li>
              <li><strong>Severability:</strong> if any provision is held unenforceable, the rest remains in effect.</li>
              <li><strong>No waiver:</strong> our failure to enforce any provision is not a waiver of it.</li>
              <li><strong>Assignment:</strong> you may not assign these Terms without our written consent. We may assign them in connection with a merger, acquisition, or sale of assets.</li>
              <li><strong>Force majeure:</strong> we are not liable for failures caused by events beyond our reasonable control.</li>
            </ul>
          </section>

          <section>
            <h2>19. Contact</h2>
            <p>
              Corel Holdings LLC<br />
              3001 S Hardin Blvd, Ste 110 PMB 1106<br />
              McKinney, TX 75070<br />
              <a href="mailto:ryan@ownerview.io">ryan@ownerview.io</a>
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
  .policy-content .disclaimer { background: #fff7ed; border: 1px solid #fcd6b4; border-radius: 10px; padding: 14px 18px; margin: 14px 0; }
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
