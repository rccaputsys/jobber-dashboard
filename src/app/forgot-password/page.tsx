// src/app/forgot-password/page.tsx
"use client";

import { useState } from "react";

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
    } catch (err) {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <main style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.title}>Check your email</h1>
          <p style={styles.subtitle}>
            We sent a password reset link to <strong>{email}</strong>
          </p>
          <p style={{ ...styles.subtitle, marginTop: 24 }}>
            <a href="/login" style={styles.link}>Back to login</a>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Reset your password</h1>
        <p style={styles.subtitle}>
          Enter your email and we'll send you a reset link
        </p>

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

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <p style={styles.footer}>
          Remember your password?{" "}
          <a href="/login" style={styles.link}>Log in</a>
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
    background: "linear-gradient(180deg, #060811 0%, #0A1222 100%)",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 16,
    padding: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: "#EAF1FF",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(234,241,255,0.6)",
    marginBottom: 24,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "rgba(234,241,255,0.8)",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    fontSize: 14,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(0,0,0,0.3)",
    color: "#EAF1FF",
    outline: "none",
  },
  button: {
    marginTop: 8,
    padding: "14px 20px",
    fontSize: 15,
    fontWeight: 700,
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(135deg, rgba(124,92,255,0.95), rgba(90,166,255,0.95))",
    color: "white",
    cursor: "pointer",
  },
  error: {
    padding: "10px 14px",
    borderRadius: 8,
    background: "rgba(239,68,68,0.15)",
    border: "1px solid rgba(239,68,68,0.3)",
    color: "#fca5a5",
    fontSize: 13,
  },
  footer: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 13,
    color: "rgba(234,241,255,0.6)",
  },
  link: {
    color: "#5aa6ff",
    textDecoration: "none",
  },
};