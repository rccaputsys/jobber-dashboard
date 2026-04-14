// src/app/complete-signup/page.tsx
"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const BG = "#fbfaf7";
const FG = "#1a1a1a";
const MUTED = "#6b6b6b";
const BORDER = "#e8e5df";
const CARD = "#ffffff";
const ACCENT = "#c2410c";
const ACCENT_SOFT = "#fff1e6";
const SUCCESS = "#15803d";

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

function CompleteSignupForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const signupToken = searchParams.get("signup_token");
  const connectionId = signupToken;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const businessTypes = [
    "Lawn Care / Landscaping", "HVAC", "Plumbing", "Electrical",
    "Cleaning / Janitorial", "Pest Control", "Pool Service", "Roofing",
    "Painting", "Handyman", "Pressure Washing", "Window Cleaning",
    "Tree Service / Arborist", "Fencing", "Flooring", "Appliance Repair",
    "Locksmith", "Junk Removal", "Moving Services", "Snow Removal", "Other",
  ];

  const teamSizes = ["Just me", "2-5 employees", "6-10 employees", "11-25 employees", "25+ employees"];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) return setError("Passwords don't match");
    if (password.length < 8) return setError("Password must be at least 8 characters");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/complete-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, signupToken, ownerName, businessType, teamSize }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Signup failed");
        setLoading(false);
        return;
      }
      router.push("/jobber/dashboard");
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  const isEmailExistsError =
    error.toLowerCase().includes("already registered") ||
    error.toLowerCase().includes("already exists") ||
    error.toLowerCase().includes("email already");

  if (!connectionId) {
    return (
      <div style={styles.card}>
        <div style={styles.brandRow}><LogoMark /><span style={styles.brandName}>AccuInsight</span></div>
        <h1 style={styles.title}>Invalid link</h1>
        <p style={styles.subtitle}>This signup link is invalid or has expired. Please try again.</p>
        <a href="https://accuinsight.io" style={styles.buttonLink}>Back to accuinsight.io</a>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <div style={styles.brandRow}><LogoMark /><span style={styles.brandName}>AccuInsight</span></div>

      <h1 style={styles.title}>Jobber connected.</h1>
      <p style={styles.subtitle}>
        Create your AccuInsight login so you can come back to your dashboard anytime.
      </p>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div>
          <label style={styles.label}>Your name</label>
          <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)}
            required style={styles.input} placeholder="John Smith" autoComplete="name" />
        </div>

        <div>
          <label style={styles.label}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            required style={styles.input} placeholder="you@company.com" autoComplete="email" />
        </div>

        <div>
          <label style={styles.label}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            required minLength={8} style={styles.input}
            placeholder="At least 8 characters" autoComplete="new-password" />
        </div>

        <div>
          <label style={styles.label}>Confirm password</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
            required minLength={8} style={styles.input}
            placeholder="Confirm your password" autoComplete="new-password" />
        </div>

        <div>
          <label style={styles.label}>Business type</label>
          <select value={businessType} onChange={(e) => setBusinessType(e.target.value)}
            required style={styles.select}>
            <option value="">Select your industry\u2026</option>
            {businessTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label style={styles.label}>Team size</label>
          <select value={teamSize} onChange={(e) => setTeamSize(e.target.value)}
            required style={styles.select}>
            <option value="">Select team size\u2026</option>
            {teamSizes.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {error && (
          <div style={styles.error}>
            {error}
            {isEmailExistsError && (
              <a href="/login" style={styles.errorLink}>Go to login \u2192</a>
            )}
          </div>
        )}

        <label style={styles.checkboxRow}>
          <input type="checkbox" checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)} required
            style={{ marginTop: 2, accentColor: ACCENT }} />
          <span style={{ fontSize: 13, color: MUTED, lineHeight: 1.5 }}>
            I agree to the{" "}
            <a href="/terms" target="_blank" style={styles.inlineLink}>Terms of Service</a>
            {" "}and{" "}
            <a href="/privacy" target="_blank" style={styles.inlineLink}>Privacy Policy</a>.
          </span>
        </label>

        <button type="submit" disabled={loading || !agreed} style={{
          ...styles.button,
          opacity: agreed && !loading ? 1 : 0.6,
          cursor: agreed && !loading ? "pointer" : "not-allowed",
        }}>
          {loading ? "Creating account\u2026" : "Create account & view dashboard"}
        </button>
      </form>

      <p style={styles.altPrompt}>
        Already have an account?{" "}
        <a href="/login" style={styles.linkStrong}>Log in</a>
      </p>

      <div style={styles.features}>
        <span style={styles.feature}><span style={styles.check}>\u2713</span> 14-day free trial</span>
        <span style={styles.feature}><span style={styles.check}>\u2713</span> No credit card required</span>
        <span style={styles.feature}><span style={styles.check}>\u2713</span> Cancel anytime</span>
      </div>
    </div>
  );
}

export default function CompleteSignupPage() {
  return (
    <main style={styles.page}>
      <div style={styles.glow} />
      <Suspense fallback={<div style={styles.card}>Loading\u2026</div>}>
        <CompleteSignupForm />
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
    width: 900, height: 520, transform: "translateX(-50%)",
    borderRadius: "50%", background: ACCENT_SOFT, opacity: 0.55,
    filter: "blur(80px)", pointerEvents: "none", zIndex: 0,
  },
  card: {
    position: "relative", zIndex: 1,
    width: "100%", maxWidth: 440,
    background: CARD, border: `1px solid ${BORDER}`,
    borderRadius: 16, padding: "36px 32px",
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
  form: { display: "flex", flexDirection: "column", gap: 14 },
  label: { display: "block", fontSize: 13, fontWeight: 500, color: FG, marginBottom: 6 },
  input: {
    width: "100%", padding: "11px 14px", fontSize: 14, borderRadius: 8,
    border: `1px solid ${BORDER}`, background: CARD, color: FG, outline: "none",
    boxSizing: "border-box",
  },
  select: {
    width: "100%", padding: "11px 14px", fontSize: 14, borderRadius: 8,
    border: `1px solid ${BORDER}`, background: CARD, color: FG, outline: "none",
    boxSizing: "border-box", cursor: "pointer",
  },
  button: {
    marginTop: 4, padding: "12px 24px", fontSize: 14, fontWeight: 600,
    borderRadius: 8, border: "none", background: ACCENT, color: "#fff",
    boxShadow: "0 4px 12px rgba(194,65,12,0.2)",
  },
  buttonLink: {
    display: "inline-block", padding: "12px 24px", fontSize: 14, fontWeight: 600,
    borderRadius: 8, background: ACCENT, color: "#fff", textDecoration: "none",
    boxShadow: "0 4px 12px rgba(194,65,12,0.2)",
    marginTop: 4,
  },
  checkboxRow: { display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" },
  inlineLink: { color: ACCENT, textDecoration: "none", fontWeight: 500 },
  error: {
    padding: "10px 14px", borderRadius: 8,
    background: "#fdecec", border: "1px solid #f4c4c4",
    color: "#b91c1c", fontSize: 13,
  },
  errorLink: { display: "block", marginTop: 6, color: "#b91c1c", textDecoration: "underline", fontWeight: 600 },
  altPrompt: { marginTop: 20, fontSize: 13, color: MUTED, textAlign: "center" },
  linkStrong: { color: ACCENT, textDecoration: "none", fontWeight: 600 },
  features: {
    display: "flex", justifyContent: "center", gap: 16, marginTop: 20, flexWrap: "wrap",
  },
  feature: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: MUTED },
  check: { color: SUCCESS, fontWeight: 700 },
};
