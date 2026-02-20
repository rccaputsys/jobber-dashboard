// src/app/jobber/page.tsx
"use client";

import React, { useState } from "react";

/* --------------------------------- Styles --------------------------------- */
const globalStyles = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(24px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .fade-in {
    animation: fadeInUp 0.6s ease-out forwards;
    opacity: 0;
  }
  .fade-in-d1 { animation-delay: 0.1s; }
  .fade-in-d2 { animation-delay: 0.2s; }
  .fade-in-d3 { animation-delay: 0.3s; }
  .fade-in-d4 { animation-delay: 0.4s; }

  * { box-sizing: border-box; }

  .landing-section {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 24px;
  }

  @media (min-width: 768px) {
    .landing-section { padding: 0 32px; }
  }

  .grid-3 {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
  }
  @media (min-width: 768px) {
    .grid-3 { grid-template-columns: repeat(3, 1fr); gap: 24px; }
  }

  .grid-2 {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
  }
  @media (min-width: 768px) {
    .grid-2 { grid-template-columns: 1fr 1fr; gap: 32px; }
  }

  .feature-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 28px;
    transition: all 0.2s ease;
  }
  .feature-card:hover {
    background: rgba(255,255,255,0.05);
    border-color: rgba(255,255,255,0.12);
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(0,0,0,0.3);
  }

  .faq-item {
    border-bottom: 1px solid rgba(255,255,255,0.08);
    padding: 20px 0;
  }
  .faq-item:last-child { border-bottom: none; }

  .nav-link {
    color: rgba(234,241,255,0.7);
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
    transition: color 0.15s;
    padding: 8px 0;
  }
  .nav-link:hover { color: #EAF1FF; }

  .section-label {
    display: inline-block;
    padding: 6px 14px;
    background: rgba(124,92,255,0.12);
    border: 1px solid rgba(124,92,255,0.2);
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    color: #a5b4fc;
    letter-spacing: 0.3px;
    text-transform: uppercase;
    margin-bottom: 16px;
  }
`;

/* --------------------------------- Components --------------------------------- */
function ConnectButton({ children, size = "large" }: { children: React.ReactNode; size?: "large" | "small" }) {
  const [loading, setLoading] = useState(false);

  const isLarge = size === "large";

  const buttonStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding: isLarge ? "16px 36px" : "12px 24px",
    background: loading
      ? "linear-gradient(135deg, #4a5568, #5a6578)"
      : "linear-gradient(135deg, #7c5cff, #5aa6ff)",
    color: "#ffffff",
    fontSize: isLarge ? 17 : 15,
    fontWeight: 700,
    borderRadius: 12,
    border: "none",
    textDecoration: "none",
    boxShadow: loading ? "none" : "0 4px 24px rgba(124,92,255,0.4)",
    pointerEvents: loading ? "none" : "auto",
    opacity: loading ? 0.8 : 1,
    transition: "all 0.2s ease",
    cursor: "pointer",
  };

  return (
    <a href="/api/jobber/connect" onClick={() => setLoading(true)} style={buttonStyle}>
      {loading ? (
        <>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Connecting...
        </>
      ) : (
        children
      )}
    </a>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="faq-item">
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          textAlign: "left",
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 600, color: "#EAF1FF", lineHeight: 1.4 }}>{q}</span>
        <span style={{
          fontSize: 20,
          color: "rgba(234,241,255,0.4)",
          flexShrink: 0,
          transition: "transform 0.2s",
          transform: open ? "rotate(45deg)" : "none",
        }}>+</span>
      </button>
      {open && (
        <p style={{ fontSize: 14, color: "rgba(234,241,255,0.6)", lineHeight: 1.7, marginTop: 12, paddingRight: 32 }}>
          {a}
        </p>
      )}
    </div>
  );
}

/* --------------------------------- Page --------------------------------- */
export default function JobberLanding() {
  return (
    <main style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #060811 0%, #0A1222 50%, #0d1a2d 100%)",
      color: "#EAF1FF",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      <style>{globalStyles}</style>

      {/* ============ TOP NAV ============ */}
      <nav style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(6,8,17,0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div className="landing-section" style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          height: 64,
        }}>
          <img src="/AccuInsight_Logo_Dark.svg" alt="AccuInsight" style={{ height: 32 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <a href="#pricing" className="nav-link" style={{ display: "none" }}>Pricing</a>
            <a href="#faq" className="nav-link" style={{ display: "none" }}>FAQ</a>
            <style>{`
              @media (min-width: 640px) {
                .nav-link { display: inline !important; }
              }
            `}</style>
            <ConnectButton size="small">Start Free Trial</ConnectButton>
          </div>
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <section style={{ paddingTop: 64, paddingBottom: 40 }}>
        <div className="landing-section" style={{ textAlign: "center" }}>
          <div className="fade-in">
            <span className="section-label">Built for Jobber users</span>
          </div>

          <h1 className="fade-in fade-in-d1" style={{
            fontSize: "clamp(28px, 5vw, 48px)",
            fontWeight: 800,
            lineHeight: 1.15,
            maxWidth: 800,
            margin: "0 auto 20px",
            letterSpacing: "-1px",
          }}>
            You&apos;re booked solid.<br />So where&apos;s the money going?
          </h1>

          <p className="fade-in fade-in-d2" style={{
            fontSize: "clamp(15px, 2.5vw, 18px)",
            color: "rgba(234,241,255,0.65)",
            maxWidth: 640,
            margin: "0 auto 32px",
            lineHeight: 1.7,
          }}>
            AccuInsight connects to your Jobber account and shows you the overdue invoices, cold quotes, and scheduling gaps that are quietly costing you thousands. One dashboard. No digging through reports.
          </p>

          <div className="fade-in fade-in-d3" style={{ marginBottom: 12 }}>
            <ConnectButton>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3" />
              </svg>
              Connect Jobber and See Your Numbers
            </ConnectButton>
          </div>
          <p className="fade-in fade-in-d3" style={{ fontSize: 13, color: "rgba(234,241,255,0.45)" }}>
            Free 14-day trial. No credit card. Takes 2 minutes.
          </p>

          {/* Dashboard preview */}
          <div className="fade-in fade-in-d4" style={{
            marginTop: 48,
            borderRadius: 16,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 32px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,92,255,0.1)",
          }}>
            <img
              src="/dashboard-preview.png"
              alt="AccuInsight Dashboard"
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </div>
        </div>
      </section>

      {/* ============ PROBLEM SECTION ============ */}
      <section style={{ padding: "80px 0" }}>
        <div className="landing-section">
          <h2 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800, textAlign: "center", marginBottom: 48 }}>
            Sound familiar?
          </h2>
          <div className="grid-3">
            <div className="feature-card" style={{ borderLeft: "3px solid #f59e0b" }}>
              <p style={{ fontSize: 15, color: "rgba(234,241,255,0.7)", lineHeight: 1.7, margin: 0 }}>
                You sent a quote three weeks ago. Did they ever respond? You can&apos;t remember, and you don&apos;t have time to check.
              </p>
            </div>
            <div className="feature-card" style={{ borderLeft: "3px solid #ef4444" }}>
              <p style={{ fontSize: 15, color: "rgba(234,241,255,0.7)", lineHeight: 1.7, margin: 0 }}>
                There&apos;s an invoice from last month that still hasn&apos;t been paid. You keep meaning to follow up but it slips through the cracks.
              </p>
            </div>
            <div className="feature-card" style={{ borderLeft: "3px solid #7c5cff" }}>
              <p style={{ fontSize: 15, color: "rgba(234,241,255,0.7)", lineHeight: 1.7, margin: 0 }}>
                You had a great month but your bank account doesn&apos;t reflect it. You know money is leaking somewhere but you can&apos;t pinpoint where.
              </p>
            </div>
          </div>
          <p style={{
            textAlign: "center",
            fontSize: 16,
            color: "rgba(234,241,255,0.55)",
            maxWidth: 700,
            margin: "36px auto 0",
            lineHeight: 1.7,
          }}>
            Jobber is great at running your business. AccuInsight shows you what Jobber doesn&apos;t: <strong style={{ color: "#EAF1FF" }}>where the money is stuck</strong> and what to do about it.
          </p>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section style={{ padding: "80px 0" }}>
        <div className="landing-section">
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span className="section-label">Features</span>
            <h2 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800, marginTop: 12 }}>
              Every dollar that&apos;s slipping through the cracks
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Feature 1 */}
            <div className="feature-card" style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                background: "rgba(239,68,68,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
              }}>
                💰
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6, margin: 0 }}>
                  Overdue invoices, sorted by how late they are
                </h3>
                <p style={{ fontSize: 14, color: "rgba(234,241,255,0.6)", lineHeight: 1.7, margin: 0, marginTop: 6 }}>
                  You have invoices sitting at 15, 30, even 60+ days. AccuInsight sorts them by age so you know exactly who to call first. One click opens the invoice in Jobber so you can follow up right now.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="feature-card" style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                background: "rgba(124,92,255,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
              }}>
                📋
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6, margin: 0 }}>
                  Quotes that went cold
                </h3>
                <p style={{ fontSize: 14, color: "rgba(234,241,255,0.6)", lineHeight: 1.7, margin: 0, marginTop: 6 }}>
                  You spent time on those estimates. AccuInsight tracks which ones were sent but never approved so you can follow up before they hire someone else. See the total dollar amount sitting in unanswered quotes.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="feature-card" style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                background: "rgba(90,166,255,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
              }}>
                📦
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6, margin: 0 }}>
                  Unscheduled jobs eating your calendar
                </h3>
                <p style={{ fontSize: 14, color: "rgba(234,241,255,0.6)", lineHeight: 1.7, margin: 0, marginTop: 6 }}>
                  Jobs that are approved but not on the schedule yet. That&apos;s revenue you&apos;ve already won but aren&apos;t collecting. AccuInsight flags them so nothing falls through.
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="feature-card" style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                background: "rgba(16,185,129,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
              }}>
                📥
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6, margin: 0 }}>
                  Open requests you haven&apos;t responded to
                </h3>
                <p style={{ fontSize: 14, color: "rgba(234,241,255,0.6)", lineHeight: 1.7, margin: 0, marginTop: 6 }}>
                  New leads are waiting. AccuInsight shows you pending work requests so you can respond fast and win the job before they call the next guy.
                </p>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="feature-card" style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                background: "rgba(245,158,11,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
              }}>
                📊
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6, margin: 0 }}>
                  Trends that tell you what&apos;s coming
                </h3>
                <p style={{ fontSize: 14, color: "rgba(234,241,255,0.6)", lineHeight: 1.7, margin: 0, marginTop: 6 }}>
                  See your quote leak, AR aging, and scheduling gaps over time. Know whether things are getting better or worse, not just where they stand today.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ WHO IT'S FOR ============ */}
      <section style={{ padding: "80px 0" }}>
        <div className="landing-section" style={{ textAlign: "center" }}>
          <span className="section-label">Who it&apos;s for</span>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800, marginTop: 12, marginBottom: 20 }}>
            Built for contractors who run on Jobber
          </h2>
          <p style={{
            fontSize: 16,
            color: "rgba(234,241,255,0.6)",
            maxWidth: 700,
            margin: "0 auto",
            lineHeight: 1.7,
          }}>
            Lawn care and landscaping. HVAC. Plumbing. Electrical. Cleaning. Pest control. If you use Jobber to run your business, AccuInsight gives you the visibility Jobber&apos;s reports don&apos;t.
          </p>
          <p style={{
            fontSize: 15,
            color: "rgba(234,241,255,0.5)",
            maxWidth: 600,
            margin: "16px auto 0",
            lineHeight: 1.7,
          }}>
            You don&apos;t need to be a numbers person. If you can read a bank statement, you can use AccuInsight.
          </p>
        </div>
      </section>

      {/* ============ FOUNDER SECTION ============ */}
      <section style={{ padding: "80px 0" }}>
        <div className="landing-section">
          <div style={{
            maxWidth: 720,
            margin: "0 auto",
            background: "linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 20,
            padding: "36px 32px",
            position: "relative",
          }}>
            <div style={{
              fontSize: 48,
              lineHeight: 1,
              color: "rgba(124,92,255,0.3)",
              position: "absolute",
              top: 20,
              left: 28,
              fontFamily: "Georgia, serif",
            }}>
              &ldquo;
            </div>
            <blockquote style={{ margin: 0, paddingLeft: 8 }}>
              <p style={{
                fontSize: 16,
                color: "rgba(234,241,255,0.75)",
                lineHeight: 1.8,
                margin: 0,
                fontStyle: "italic",
              }}>
                I ran a lawn care and landscaping company. I was using Jobber every day and had no idea I was sitting on thousands in unpaid invoices and cold quotes. I&apos;d check my bank account and the number never matched what I thought I earned. So I built the dashboard I wished I had. That&apos;s AccuInsight.
              </p>
              <footer style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: "linear-gradient(135deg, #7c5cff, #5aa6ff)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, fontWeight: 700, color: "#fff",
                }}>
                  R
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#EAF1FF" }}>Ryan</div>
                  <div style={{ fontSize: 12, color: "rgba(234,241,255,0.5)" }}>Founder of AccuInsight &middot; Former lawn care business owner</div>
                </div>
              </footer>
            </blockquote>
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section style={{ padding: "80px 0" }}>
        <div className="landing-section">
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span className="section-label">How it works</span>
            <h2 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800, marginTop: 12 }}>
              Set it up in 2 minutes. Seriously.
            </h2>
          </div>

          <div className="grid-3" style={{ maxWidth: 900, margin: "0 auto" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "linear-gradient(135deg, #7c5cff, #5aa6ff)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, fontWeight: 800, color: "#fff",
                margin: "0 auto 16px",
                boxShadow: "0 8px 24px rgba(124,92,255,0.3)",
              }}>1</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Connect your Jobber account</h3>
              <p style={{ fontSize: 14, color: "rgba(234,241,255,0.55)", lineHeight: 1.6 }}>
                One-click authorization. No passwords shared.
              </p>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "linear-gradient(135deg, #7c5cff, #5aa6ff)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, fontWeight: 800, color: "#fff",
                margin: "0 auto 16px",
                boxShadow: "0 8px 24px rgba(124,92,255,0.3)",
              }}>2</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Data pulls automatically</h3>
              <p style={{ fontSize: 14, color: "rgba(234,241,255,0.55)", lineHeight: 1.6 }}>
                AccuInsight pulls your invoices, quotes, jobs, and requests automatically.
              </p>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "linear-gradient(135deg, #7c5cff, #5aa6ff)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, fontWeight: 800, color: "#fff",
                margin: "0 auto 16px",
                boxShadow: "0 8px 24px rgba(124,92,255,0.3)",
              }}>3</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>See what needs attention</h3>
              <p style={{ fontSize: 14, color: "rgba(234,241,255,0.55)", lineHeight: 1.6 }}>
                Open your dashboard and see exactly what needs attention today.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section id="pricing" style={{ padding: "80px 0" }}>
        <div className="landing-section">
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span className="section-label">Pricing</span>
            <h2 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800, marginTop: 12 }}>
              Simple pricing. Cancel anytime.
            </h2>
          </div>

          <div style={{
            maxWidth: 480,
            margin: "0 auto",
            background: "linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
            border: "1px solid rgba(124,92,255,0.3)",
            borderRadius: 20,
            padding: "40px 32px",
            textAlign: "center",
            boxShadow: "0 24px 48px rgba(0,0,0,0.3), 0 0 0 1px rgba(124,92,255,0.1)",
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(234,241,255,0.5)", marginBottom: 8 }}>
              One plan. Everything included.
            </div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4, marginBottom: 8 }}>
              <span style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-2px" }}>$29</span>
              <span style={{ fontSize: 16, color: "rgba(234,241,255,0.5)" }}>/month</span>
            </div>
            <p style={{ fontSize: 13, color: "rgba(234,241,255,0.45)", marginBottom: 24, lineHeight: 1.6 }}>
              After your free 14-day trial.<br />
              No contracts. No setup fees. No per-user charges.
            </p>
            <ConnectButton>Start Free Trial</ConnectButton>
            <p style={{ fontSize: 13, color: "rgba(234,241,255,0.4)", marginTop: 16 }}>
              If AccuInsight helps you collect even one overdue invoice, it pays for itself.
            </p>
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" style={{ padding: "80px 0" }}>
        <div className="landing-section" style={{ maxWidth: 720 }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span className="section-label">FAQ</span>
            <h2 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800, marginTop: 12 }}>
              Frequently asked questions
            </h2>
          </div>

          <div>
            <FAQItem
              q="Does AccuInsight replace Jobber?"
              a="No. AccuInsight works alongside Jobber. You keep using Jobber to run your business. AccuInsight just shows you the things Jobber's built-in reports miss, like aging invoices, cold quotes, and scheduling gaps."
            />
            <FAQItem
              q="Is my data safe?"
              a="Yes. AccuInsight uses Jobber's official API with read-only access. We never modify your Jobber data. Your information is encrypted in transit and at rest."
            />
            <FAQItem
              q="How long does setup take?"
              a="About 2 minutes. Click the connect button, authorize with Jobber, and your dashboard is ready. No downloads, no configuration, no IT department needed."
            />
            <FAQItem
              q="What if I cancel?"
              a="Cancel anytime from your account settings. No cancellation fees, no contracts. Your Jobber data stays untouched since we only have read-only access."
            />
            <FAQItem
              q="Do I need to be tech-savvy?"
              a="Not at all. If you can check your email and use Jobber, you can use AccuInsight. It's designed for business owners in the field, not accountants behind a desk."
            />
            <FAQItem
              q="What types of businesses use AccuInsight?"
              a="Any service business running on Jobber: lawn care, landscaping, HVAC, plumbing, electrical, cleaning, pest control, and more. If you send invoices and quotes through Jobber, AccuInsight works for you."
            />
          </div>
        </div>
      </section>

      {/* ============ BOTTOM CTA ============ */}
      <section style={{ padding: "80px 0" }}>
        <div className="landing-section">
          <div style={{
            background: "linear-gradient(135deg, rgba(124,92,255,0.2), rgba(90,166,255,0.1))",
            borderRadius: 20,
            padding: "56px 32px",
            textAlign: "center",
            border: "1px solid rgba(124,92,255,0.25)",
            boxShadow: "0 24px 48px rgba(0,0,0,0.3)",
          }}>
            <h2 style={{ fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 800, marginBottom: 16 }}>
              Ready to see where your money is going?
            </h2>
            <p style={{
              fontSize: 16,
              color: "rgba(234,241,255,0.65)",
              marginBottom: 28,
              maxWidth: 500,
              margin: "0 auto 28px",
              lineHeight: 1.6,
            }}>
              Join other service businesses who stopped guessing and started knowing.
            </p>
            <ConnectButton>
              Connect Jobber and See Your Numbers
            </ConnectButton>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer style={{ padding: "32px 0 48px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="landing-section" style={{ textAlign: "center" }}>
          <img src="/AccuInsight_Logo_Dark.svg" alt="AccuInsight" style={{ height: 24, marginBottom: 16, opacity: 0.5 }} />
          <p style={{ fontSize: 13, color: "rgba(234,241,255,0.35)", marginBottom: 8 }}>
            &copy; 2026 OwnerView. All rights reserved.
          </p>
          <p style={{ fontSize: 13 }}>
            <a href="/privacy" style={{ color: "rgba(234,241,255,0.4)", textDecoration: "none", marginRight: 16 }}>Privacy Policy</a>
            <a href="/terms" style={{ color: "rgba(234,241,255,0.4)", textDecoration: "none" }}>Terms of Service</a>
          </p>
        </div>
      </footer>
    </main>
  );
}
