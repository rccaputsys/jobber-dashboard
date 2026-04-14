"use client";

import { useState } from "react";

const BG = "#fbfaf7";
const FG = "#1a1a1a";
const MUTED = "#6b6b6b";
const BORDER = "#e8e5df";
const ACCENT = "#c2410c";
const ACCENT_SOFT = "#fff1e6";

function LogoMark() {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 28, height: 28, borderRadius: 6, background: ACCENT, color: "#fff",
    }}>
      <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
        <path d="M4 14l4-4 4 4 8-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function ConnectButton({ size = "lg" }: { size?: "lg" | "sm" }) {
  const [loading, setLoading] = useState(false);
  const padding = size === "lg" ? "14px 28px" : "10px 18px";
  const fontSize = size === "lg" ? 15 : 13;

  return (
    <a
      href="/api/jobber/connect"
      onClick={() => setLoading(true)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding, fontSize, fontWeight: 600, color: "#fff",
        background: loading ? "#334155" : ACCENT,
        borderRadius: 8, textDecoration: "none",
        opacity: loading ? 0.8 : 1,
        pointerEvents: loading ? "none" : "auto",
        transition: "opacity 0.2s",
      }}
    >
      {loading ? "Connecting\u2026" : "See it with your Jobber data"}
    </a>
  );
}

export default function JobberLanding() {
  return (
    <div style={{
      minHeight: "100vh", background: BG, color: FG,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* Nav */}
      <header style={{
        position: "sticky", top: 0, zIndex: 40,
        background: `${BG}cc`, backdropFilter: "blur(8px)",
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <div style={{
          maxWidth: 1100, margin: "0 auto", padding: "16px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <a href="https://accuinsight.io" style={{
            display: "flex", alignItems: "center", gap: 8,
            color: FG, textDecoration: "none", fontWeight: 600,
          }}>
            <LogoMark />
            <span>AccuInsight</span>
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <a href="/login" style={{ fontSize: 14, color: MUTED, textDecoration: "none" }}>
              Log in
            </a>
            <ConnectButton size="sm" />
          </div>
        </div>
      </header>

      {/* Hero */}
      <main style={{ position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: -1,
        }}>
          <div style={{
            position: "absolute", left: "50%", top: "-10%",
            width: 900, height: 540, transform: "translateX(-50%)",
            borderRadius: "50%", background: ACCENT_SOFT, opacity: 0.6,
            filter: "blur(80px)",
          }} />
        </div>

        <section style={{
          maxWidth: 900, margin: "0 auto", padding: "96px 24px 64px",
          textAlign: "center",
        }}>
          <h1 style={{
            fontSize: "clamp(36px, 6vw, 56px)",
            fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.1,
            margin: 0,
          }}>
            Know what to do next.
            <br />
            Before it costs you.
          </h1>

          <p style={{
            fontSize: 18, color: MUTED, lineHeight: 1.6,
            maxWidth: 560, margin: "24px auto 0",
          }}>
            Connect your Jobber account and AccuInsight will surface your top
            priorities every morning — overdue invoices, cooling quotes, and
            open capacity. One screen. No digging.
          </p>

          <div style={{ marginTop: 32 }}>
            <ConnectButton />
          </div>

          <p style={{ fontSize: 14, color: MUTED, marginTop: 16 }}>
            <strong style={{ color: FG }}>14-day free trial,</strong> then $49/month. No contract, cancel anytime.
          </p>

          <p style={{ fontSize: 13, color: MUTED, marginTop: 48 }}>
            Want the full tour?{" "}
            <a href="https://accuinsight.io" style={{ color: ACCENT, fontWeight: 600, textDecoration: "none" }}>
              Visit accuinsight.io \u2192
            </a>
          </p>
        </section>

        {/* Three value props */}
        <section style={{
          maxWidth: 1000, margin: "0 auto", padding: "32px 24px 96px",
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
        }}>
          {[
            {
              title: "Collect",
              body: "See every past-due invoice and chase-ready client in one list.",
            },
            {
              title: "Book",
              body: "Know exactly how full your schedule is and what's waiting to be booked.",
            },
            {
              title: "Sell",
              body: "Follow up on cooling quotes before they go cold for good.",
            },
          ].map((card) => (
            <div key={card.title} style={{
              padding: 24, background: "#fff",
              border: `1px solid ${BORDER}`, borderRadius: 12,
            }}>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                {card.title}
              </div>
              <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.6 }}>
                {card.body}
              </div>
            </div>
          ))}
        </section>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: `1px solid ${BORDER}`, padding: "24px",
        textAlign: "center", fontSize: 13, color: MUTED,
      }}>
        <div style={{ marginBottom: 8 }}>
          \u00A9 {new Date().getFullYear()} AccuInsight. Built for Jobber users.
        </div>
        <div>
          <a href="/privacy" style={{ color: MUTED, marginRight: 16 }}>Privacy</a>
          <a href="/terms" style={{ color: MUTED }}>Terms</a>
        </div>
      </footer>
    </div>
  );
}
