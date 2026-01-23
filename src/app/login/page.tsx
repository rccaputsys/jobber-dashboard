// src/app/login/page.tsx
"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const message = searchParams.get("message");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      router.push("/jobber/dashboard");
    } catch (err) {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div style={styles.card}>
      <div style={styles.logoWrapper}>
        <span style={{ fontSize: 28 }}>📊</span>
      </div>
      
      <h1 style={styles.title}>Welcome back</h1>
      <p style={styles.subtitle}>
        Sign in to your AccuInsight dashboard
      </p>

      {message === "jobber_reconnected" && (
        <div style={styles.info}>
          Jobber reconnected! Please log in to continue.
        </div>
      )}

      {message === "password_reset" && (
        <div style={styles.success}>
          Password reset! You can now log in with your new password.
        </div>
      )}

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
          />
        </div>

        <div>
          <label style={styles.label}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
            placeholder="Your password"
          />
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div style={styles.links}>
        <a href="/forgot-password" style={styles.link}>
          Forgot password?
        </a>
        <span style={styles.divider}>•</span>
        <a href="/jobber" style={styles.link}>
          Connect new Jobber account
        </a>
      </div>

      <p style={{ marginTop: 20, fontSize: 12, color: "rgba(234,241,255,0.4)", textAlign: "center" }}>
        <a href="/terms" style={{ color: "rgba(234,241,255,0.5)", textDecoration: "none" }}>Terms</a>
        {" · "}
        <a href="/privacy" style={{ color: "rgba(234,241,255,0.5)", textDecoration: "none" }}>Privacy</a>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main style={styles.page}>
      <Suspense fallback={<div style={styles.card}>Loading...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: `
      radial-gradient(ellipse 80% 60% at 50% -20%, rgba(124,92,255,0.15), transparent),
      radial-gradient(ellipse 60% 40% at 100% 0%, rgba(90,166,255,0.1), transparent),
      linear-gradient(180deg, #060811 0%, #0a1020 100%)
    `,
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 24,
    padding: "40px 32px",
    boxShadow: "0 32px 64px rgba(0,0,0,0.4)",
  },
  logoWrapper: {
    width: 56,
    height: 56,
    borderRadius: 14,
    background: "linear-gradient(135deg, rgba(124,92,255,0.2), rgba(90,166,255,0.2))",
    border: "1px solid rgba(124,92,255,0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
  },
  title: {
    fontSize: 26,
    fontWeight: 800,
    color: "#EAF1FF",
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(234,241,255,0.6)",
    marginBottom: 28,
    textAlign: "center",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "rgba(234,241,255,0.8)",
    marginBottom: 8,
  },
  input: {
    width: "100%",
    padding: "14px 16px",
    fontSize: 15,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.3)",
    color: "#EAF1FF",
    outline: "none",
  },
  button: {
    marginTop: 8,
    padding: "16px 24px",
    fontSize: 15,
    fontWeight: 700,
    borderRadius: 14,
    border: "none",
    background: "linear-gradient(135deg, rgba(124,92,255,0.95), rgba(90,166,255,0.95))",
    color: "white",
    cursor: "pointer",
    boxShadow: "0 8px 24px rgba(90,166,255,0.25)",
  },
  error: {
    padding: "12px 16px",
    borderRadius: 10,
    background: "rgba(239,68,68,0.15)",
    border: "1px solid rgba(239,68,68,0.3)",
    color: "#fca5a5",
    fontSize: 13,
  },
  info: {
    padding: "12px 16px",
    borderRadius: 10,
    background: "rgba(90,166,255,0.15)",
    border: "1px solid rgba(90,166,255,0.3)",
    color: "#93c5fd",
    fontSize: 13,
    marginBottom: 16,
    textAlign: "center",
  },
  success: {
    padding: "12px 16px",
    borderRadius: 10,
    background: "rgba(16,185,129,0.15)",
    border: "1px solid rgba(16,185,129,0.3)",
    color: "#6ee7b7",
    fontSize: 13,
    marginBottom: 16,
    textAlign: "center",
  },
  links: {
    marginTop: 24,
    textAlign: "center",
    fontSize: 13,
    color: "rgba(234,241,255,0.5)",
  },
  link: {
    color: "#5aa6ff",
    textDecoration: "none",
  },
  divider: {
    margin: "0 10px",
  },
};
