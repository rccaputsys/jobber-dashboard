// src/app/complete-signup/page.tsx
"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function CompleteSignupForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const connectionId = searchParams.get("connection_id");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/complete-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, connectionId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Signup failed");
        setLoading(false);
        return;
      }

      router.push("/jobber/dashboard");
    } catch (err) {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  if (!connectionId) {
    return (
      <div style={styles.card}>
        <h1 style={styles.title}>Invalid Link</h1>
        <p style={styles.subtitle}>
          This signup link is invalid or has expired. Please connect your Jobber account again.
        </p>
        <a href="/jobber" style={styles.button as any}>
          Connect Jobber →
        </a>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <div style={styles.iconWrapper}>
        <span style={{ fontSize: 32 }}>🎉</span>
      </div>
      
      <h1 style={styles.title}>Jobber Connected!</h1>
      <p style={styles.subtitle}>
        Create your AccuInsight login to access your dashboard anytime.
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

        <div>
          <label style={styles.label}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            style={styles.input}
            placeholder="At least 8 characters"
          />
        </div>

        <div>
          <label style={styles.label}>Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            style={styles.input}
            placeholder="Confirm your password"
          />
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? "Creating account..." : "Create Account & View Dashboard"}
        </button>
      </form>

   <div style={styles.features}>
        <div style={styles.feature}>
          <span>✓</span> 14-day free trial
        </div>
        <div style={styles.feature}>
          <span>✓</span> No credit card required
        </div>
        <div style={styles.feature}>
          <span>✓</span> Cancel anytime
        </div>
      </div>

      <p style={{ marginTop: 24, fontSize: 12, color: "rgba(234,241,255,0.5)", textAlign: "center" }}>
        By signing up, you agree to our{" "}
        <a href="/terms" style={{ color: "#a5b4fc", textDecoration: "none" }}>Terms of Service</a>
        {" "}and{" "}
        <a href="/privacy" style={{ color: "#a5b4fc", textDecoration: "none" }}>Privacy Policy</a>
      </p>
    </div>
  );
}

export default function CompleteSignupPage() {
  return (
    <main style={styles.page}>
      <Suspense fallback={<div style={styles.card}>Loading...</div>}>
        <CompleteSignupForm />
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
    maxWidth: 420,
    background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 24,
    padding: "40px 32px",
    boxShadow: "0 32px 64px rgba(0,0,0,0.4)",
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 16,
    background: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.05))",
    border: "1px solid rgba(16,185,129,0.3)",
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
    lineHeight: 1.5,
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
    transition: "border-color 0.2s, box-shadow 0.2s",
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
    transition: "transform 0.2s, box-shadow 0.2s",
    textAlign: "center",
    textDecoration: "none",
    display: "block",
  },
  error: {
    padding: "12px 16px",
    borderRadius: 10,
    background: "rgba(239,68,68,0.15)",
    border: "1px solid rgba(239,68,68,0.3)",
    color: "#fca5a5",
    fontSize: 13,
  },
  features: {
    display: "flex",
    justifyContent: "center",
    gap: 16,
    marginTop: 24,
    flexWrap: "wrap",
  },
  feature: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: "rgba(234,241,255,0.5)",
  },
};