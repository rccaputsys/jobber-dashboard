// src/app/page.tsx - OwnerView Brand Homepage
import React from "react";
import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #060811 0%, #0A1222 50%, #0d1a2d 100%)",
        color: "#EAF1FF",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
      }}
    >
      {/* Logo / Brand */}
      <div
        style={{
          fontSize: "clamp(40px, 8vw, 64px)",
          fontWeight: 800,
          background: "linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          marginBottom: 16,
        }}
      >
        OwnerView
      </div>

      <p
        style={{
          fontSize: 20,
          color: "rgba(234,241,255,0.7)",
          textAlign: "center",
          maxWidth: 500,
          marginBottom: 48,
          lineHeight: 1.6,
        }}
      >
        Simple tools that help small business owners see what matters.
      </p>

      {/* Products */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          width: "100%",
          maxWidth: 400,
        }}
      >
        <Link
          href="/jobber"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12,
            textDecoration: "none",
            color: "#EAF1FF",
            transition: "background 0.2s, border-color 0.2s",
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>
              OwnerView for Jobber
            </div>
            <div style={{ fontSize: 14, color: "rgba(234,241,255,0.6)" }}>
              AR aging, quote leaks, scheduling gaps — one dashboard
            </div>
          </div>
          <div style={{ fontSize: 24, color: "rgba(234,241,255,0.4)" }}>→</div>
        </Link>

        {/* Placeholder for future products */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px",
            background: "rgba(255,255,255,0.02)",
            border: "1px dashed rgba(255,255,255,0.1)",
            borderRadius: 12,
            color: "rgba(234,241,255,0.3)",
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>
              More tools coming soon
            </div>
            <div style={{ fontSize: 14 }}>
              We're building more ways to help you run your business
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer
        style={{
          marginTop: 80,
          textAlign: "center",
          color: "rgba(234,241,255,0.4)",
          fontSize: 13,
        }}
      >
        <p>© 2025 OwnerView. All rights reserved.</p>
        <p style={{ marginTop: 8 }}>
          <Link href="/privacy" style={{ color: "rgba(234,241,255,0.5)", textDecoration: "none", marginRight: 16 }}>
            Privacy Policy
          </Link>
          <Link href="/terms" style={{ color: "rgba(234,241,255,0.5)", textDecoration: "none" }}>
            Terms of Service
          </Link>
        </p>
      </footer>
    </main>
  );
}
