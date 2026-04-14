// src/app/forgot-password/page.tsx
"use client";

import { useState } from "react";

const BG = "#fbfaf7";
const FG = "#1a1a1a";
const MUTED = "#6b6b6b";
const BORDER = "#e8e5df";
const CARD = "#ffffff";
const ACCENT = "#c2410c";
const ACCENT_SOFT = "#fff1e6";

function LogoMark() {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 32, height: 32, borderRadius: 7, background: ACCENT, color: "#fff",
    }}>
      <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
        <path d="M4 14l4-4 4 4 8-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send reset email");
        setLoading(false);
        return;
      }
      setSent(true);
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <main style={styles.page}>
        <div style={styles.glow} />
        <div style={styles.card}>
          <div style={styles.brandRow}>
            <LogoMark />
            <span style={styles.brandName}>AccuInsight</span>
          </div>
          <h1 style={styles.title}>Check your email</h1>
          <p style={styles.subtitle}>
            We sent a password reset link to <strong style={{ color: FG }}>{email}</strong>.
          </p>
          <p style={{ ...styles.footer, marginTop: 20 }}>
            <a href="/login" style={styles.linkStrong}>Back to login</a>
          </p>
          <p style={styles.legal}>
            <a href="/terms" style={styles.legalLink}>Terms</a>
            <span style={styles.divider}>\u00B7</span>
            <a href="/privacy" style={styles.legalLink}>Privacy</a>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.glow} />
      <div style={styles.card}>
        <div style={styles.brandRow}>
          <LogoMark />
          <span style={styles.brandName}>AccuInsight</span>
        </div>
        <h1 style={styles.title}>Reset your password</h1>
        <p style={styles.subtitle}>Enter your email and we&apos;ll send you a reset link.</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
              placeholder="you@company.com"
              autoComplete="email"
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "Sending\u2026" : "Send reset link"}
          </button>
        </form>

        <p style={styles.footer}>
          Remember your password? <a href="/login" style={styles.linkStrong}>Log in</a>
        </p>

        <p style={styles.legal}>
          <a href="/terms" style={styles.legalLink}>Terms</a>
          <span style={styles.divider}>\u00B7</span>
          <a href="/privacy" style={styles.legalLink}>Privacy</a>
        </p>
      </div>
    </main>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: BG,
    color: FG,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    padding: 20,
    position: "relative",
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    top: "-20%",
    left: "50%",
    width: 800,
    height: 500,
    transform: "translateX(-50%)",
    borderRadius: "50%",
    background: ACCENT_SOFT,
    opacity: 0.55,
    filter: "blur(80px)",
    pointerEvents: "none",
    zIndex: 0,
  },
  card: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: 400,
    background: CARD,
    border: `1px solid ${BORDER}`,
    borderRadius: 16,
    padding: "36px 32px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 20px 40px -10px rgba(0,0,0,0.08)",
  },
  brandRow: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
    marginBottom: 20,
  },
  brandName: { fontSize: 15, fontWeight: 600, color: FG, letterSpacing: -0.2 },
  title: {
    fontSize: 24, fontWeight: 600, color: FG, marginBottom: 6,
    textAlign: "center", letterSpacing: -0.4,
  },
  subtitle: { fontSize: 14, color: MUTED, marginBottom: 24, textAlign: "center", lineHeight: 1.5 },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  label: { display: "block", fontSize: 13, fontWeight: 500, color: FG, marginBottom: 6 },
  input: {
    width: "100%", padding: "11px 14px", fontSize: 14, borderRadius: 8,
    border: `1px solid ${BORDER}`, background: CARD, color: FG, outline: "none",
    boxSizing: "border-box",
  },
  button: {
    marginTop: 4, padding: "12px 24px", fontSize: 14, fontWeight: 600,
    borderRadius: 8, border: "none", background: ACCENT, color: "#fff",
    cursor: "pointer", boxShadow: "0 4px 12px rgba(194,65,12,0.2)",
  },
  error: {
    padding: "10px 14px", borderRadius: 8,
    background: "#fdecec", border: "1px solid #f4c4c4",
    color: "#b91c1c", fontSize: 13,
  },
  footer: { marginTop: 20, textAlign: "center", fontSize: 13, color: MUTED },
  linkStrong: { color: ACCENT, textDecoration: "none", fontWeight: 600 },
  legal: { marginTop: 20, fontSize: 12, color: MUTED, textAlign: "center" },
  legalLink: { color: MUTED, textDecoration: "none" },
  divider: { margin: "0 8px" },
};
