// src/app/reset-password/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

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

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    // Supabase has two password-reset flows depending on project settings:
    //   1. PKCE flow:   ?code=<...>  as a query param
    //   2. Legacy flow: #access_token=…&refresh_token=…&type=recovery as a hash
    // We handle both so either configuration works.

    const fail = () => setError("Invalid or expired reset link. Please request a new one.");

    const codeParam = searchParams.get("code");
    if (codeParam) {
      supabase.auth.exchangeCodeForSession(codeParam).then(({ error }) => {
        if (error) fail();
        else setReady(true);
      });
      return;
    }

    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const type = hashParams.get("type");

    if (accessToken && refreshToken && type === "recovery") {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(({ error }) => {
        if (error) fail();
        else setReady(true);
      });
      return;
    }

    // No token in URL — maybe the user already has a session from clicking
    // the link in the same browser tab.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else fail();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) return setError("Passwords don't match");
    if (password.length < 8) return setError("Password must be at least 8 characters");
    setLoading(true);
    const { error: updErr } = await supabase.auth.updateUser({ password });
    if (updErr) {
      setError(updErr.message);
      setLoading(false);
      return;
    }
    await supabase.auth.signOut();
    router.push("/login?message=password_reset");
  }

  if (error && !ready) {
    return (
      <div style={styles.card}>
        <div style={styles.brandRow}><LogoMark /><span style={styles.brandName}>AccuInsight</span></div>
        <h1 style={styles.title}>Link expired</h1>
        <p style={styles.subtitle}>{error}</p>
        <a href="/forgot-password" style={styles.buttonLink}>Request new link</a>
        <p style={styles.legal}>
          <a href="/terms" style={styles.legalLink}>Terms</a>
          <span style={styles.divider}>\u00B7</span>
          <a href="/privacy" style={styles.legalLink}>Privacy</a>
        </p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div style={styles.card}>
        <div style={styles.brandRow}><LogoMark /><span style={styles.brandName}>AccuInsight</span></div>
        <h1 style={styles.title}>Verifying\u2026</h1>
        <p style={styles.subtitle}>Please wait while we verify your reset link.</p>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <div style={styles.brandRow}><LogoMark /><span style={styles.brandName}>AccuInsight</span></div>
      <h1 style={styles.title}>Set new password</h1>
      <p style={styles.subtitle}>Enter your new password below.</p>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div>
          <label style={styles.label}>New password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required minLength={8}
            style={styles.input}
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
        </div>
        <div>
          <label style={styles.label}>Confirm password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required minLength={8}
            style={styles.input}
            placeholder="Confirm your password"
            autoComplete="new-password"
          />
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? "Updating\u2026" : "Update password"}
        </button>
      </form>

      <p style={styles.legal}>
        <a href="/terms" style={styles.legalLink}>Terms</a>
        <span style={styles.divider}>\u00B7</span>
        <a href="/privacy" style={styles.legalLink}>Privacy</a>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main style={styles.page}>
      <div style={styles.glow} />
      <Suspense fallback={<div style={styles.card}>Loading\u2026</div>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    background: BG, color: FG,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    padding: 20, position: "relative", overflow: "hidden",
  },
  glow: {
    position: "absolute", top: "-20%", left: "50%",
    width: 800, height: 500, transform: "translateX(-50%)",
    borderRadius: "50%", background: ACCENT_SOFT, opacity: 0.55,
    filter: "blur(80px)", pointerEvents: "none", zIndex: 0,
  },
  card: {
    position: "relative", zIndex: 1,
    width: "100%", maxWidth: 400,
    background: CARD, border: `1px solid ${BORDER}`,
    borderRadius: 16, padding: "36px 32px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 20px 40px -10px rgba(0,0,0,0.08)",
    textAlign: "center",
  },
  brandRow: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
    marginBottom: 20,
  },
  brandName: { fontSize: 15, fontWeight: 600, color: FG, letterSpacing: -0.2 },
  title: {
    fontSize: 24, fontWeight: 600, color: FG, marginBottom: 6,
    letterSpacing: -0.4,
  },
  subtitle: { fontSize: 14, color: MUTED, marginBottom: 24, lineHeight: 1.5 },
  form: { display: "flex", flexDirection: "column", gap: 16, textAlign: "left" },
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
  buttonLink: {
    display: "inline-block", padding: "12px 24px", fontSize: 14, fontWeight: 600,
    borderRadius: 8, background: ACCENT, color: "#fff", textDecoration: "none",
    boxShadow: "0 4px 12px rgba(194,65,12,0.2)",
  },
  error: {
    padding: "10px 14px", borderRadius: 8,
    background: "#fdecec", border: "1px solid #f4c4c4",
    color: "#b91c1c", fontSize: 13, textAlign: "center",
  },
  legal: { marginTop: 24, fontSize: 12, color: MUTED },
  legalLink: { color: MUTED, textDecoration: "none" },
  divider: { margin: "0 8px" },
};
