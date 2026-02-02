// src/app/jobber/page.tsx
import React from "react";

export default function JobberLanding() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #060811 0%, #0A1222 50%, #0d1a2d 100%)",
        color: "#EAF1FF",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Hero Section */}
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "60px 24px",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              background: "rgba(90,103,216,0.15)",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              color: "#a5b4fc",
              marginBottom: 24,
            }}
          >
            <span>⚡</span> Built for Jobber Users
          </div>
          
          <h1
            style={{
              fontSize: "clamp(32px, 5vw, 56px)",
              fontWeight: 800,
              lineHeight: 1.3,
              marginBottom: 20,
              background: "linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            AccuInsight by OwnerView
          </h1>
          
          <p
            style={{
              fontSize: 18,
              color: "rgba(234,241,255,0.7)",
              maxWidth: 600,
              margin: "0 auto 32px",
              lineHeight: 1.6,
            }}
          >
            Stop digging through reports. Get instant visibility into AR aging, 
            sales leaks, and scheduling gaps — all in one dashboard.
          </p>

          <a
            href="/api/jobber/connect"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "16px 32px",
              background: "linear-gradient(135deg, #5a67d8 0%, #667eea 100%)",
              color: "#ffffff",
              fontSize: 17,
              fontWeight: 700,
              borderRadius: 12,
              textDecoration: "none",
              boxShadow: "0 4px 24px rgba(90,103,216,0.4)",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3" />
            </svg>
            See Your Numbers Now
          </a>
          
          <p style={{ fontSize: 13, color: "rgba(234,241,255,0.5)", marginTop: 16 }}>
            Free 14-day trial • No credit card required • 2-minute setup
          </p>
        </div>

        {/* Dashboard Preview */}
        <div
          style={{
            marginBottom: 80,
            borderRadius: 16,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
          }}
        >
          <img
            src="/dashboard-preview.png"
            alt="AccuInsight Dashboard Preview"
            style={{
              width: "100%",
              height: "auto",
              display: "block",
            }}
          />
        </div>

        {/* Features Section */}
        <div style={{ marginBottom: 80 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, textAlign: "center", marginBottom: 48 }}>
            Everything You Need to Run Smarter
          </h2>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 28, border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(239,68,68,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 16 }}>💰</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>AR Aging Alerts</h3>
              <p style={{ fontSize: 14, color: "rgba(234,241,255,0.6)", lineHeight: 1.6 }}>See exactly which invoices are 15+ days overdue. One-click to open in Jobber and collect.</p>
            </div>
            
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 28, border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(124,92,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 16 }}>📊</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Quote Leak Detection</h3>
              <p style={{ fontSize: 14, color: "rgba(234,241,255,0.6)", lineHeight: 1.6 }}>Track sent quotes that haven&apos;t converted. Follow up before they go cold.</p>
            </div>
            
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 28, border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(90,166,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 16 }}>📅</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Scheduling Gaps</h3>
              <p style={{ fontSize: 14, color: "rgba(234,241,255,0.6)", lineHeight: 1.6 }}>Find unscheduled jobs that are slipping through the cracks. Stay on top of your backlog.</p>
            </div>
            
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 28, border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 16 }}>⏱️</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Save Hours Weekly</h3>
              <p style={{ fontSize: 14, color: "rgba(234,241,255,0.6)", lineHeight: 1.6 }}>No more digging through reports. See everything that needs attention in one glance.</p>
            </div>
            
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 28, border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(245,158,11,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 16 }}>⚡</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>One-Click Actions</h3>
              <p style={{ fontSize: 14, color: "rgba(234,241,255,0.6)", lineHeight: 1.6 }}>Every item links directly to Jobber. Export to CSV for your weekly team meeting.</p>
            </div>
            
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 28, border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 16 }}>🌓</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Dark &amp; Light Mode</h3>
              <p style={{ fontSize: 14, color: "rgba(234,241,255,0.6)", lineHeight: 1.6 }}>Easy on the eyes in the office or out in the field. Your choice.</p>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div style={{ marginBottom: 80 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, textAlign: "center", marginBottom: 48 }}>Up and Running in 2 Minutes</h2>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 32, maxWidth: 800, margin: "0 auto" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #5a67d8 0%, #667eea 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, margin: "0 auto 16px" }}>1</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Connect Jobber</h3>
              <p style={{ fontSize: 14, color: "rgba(234,241,255,0.6)" }}>Click the button and authorize with your Jobber account</p>
            </div>
            
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #5a67d8 0%, #667eea 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, margin: "0 auto 16px" }}>2</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Auto-Sync Data</h3>
              <p style={{ fontSize: 14, color: "rgba(234,241,255,0.6)" }}>We pull your invoices, jobs, and quotes automatically</p>
            </div>
            
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #5a67d8 0%, #667eea 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, margin: "0 auto 16px" }}>3</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Take Action</h3>
              <p style={{ fontSize: 14, color: "rgba(234,241,255,0.6)" }}>See your dashboard and start collecting, scheduling, and closing</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div style={{ background: "linear-gradient(135deg, rgba(90,103,216,0.2) 0%, rgba(102,126,234,0.1) 100%)", borderRadius: 20, padding: "48px 32px", textAlign: "center", border: "1px solid rgba(90,103,216,0.3)" }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>Ready to See Your Numbers?</h2>
          <p style={{ fontSize: 16, color: "rgba(234,241,255,0.7)", marginBottom: 24, maxWidth: 500, margin: "0 auto 24px" }}>Join other service businesses who stopped guessing and started knowing.</p>
          <a href="/api/jobber/connect" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "16px 32px", background: "linear-gradient(135deg, #5a67d8 0%, #667eea 100%)", color: "#ffffff", fontSize: 17, fontWeight: 700, borderRadius: 12, textDecoration: "none", boxShadow: "0 4px 24px rgba(90,103,216,0.4)" }}>
            Start Free Trial →
          </a>
        </div>

        {/* Footer */}
        <footer style={{ marginTop: 80, paddingTop: 32, borderTop: "1px solid rgba(255,255,255,0.08)", textAlign: "center", color: "rgba(234,241,255,0.4)", fontSize: 13 }}>
          <p>© 2025 OwnerView. All rights reserved.</p>
          <p style={{ marginTop: 8 }}>
            <a href="/privacy" style={{ color: "rgba(234,241,255,0.5)", textDecoration: "none", marginRight: 16 }}>Privacy Policy</a>
            <a href="/terms" style={{ color: "rgba(234,241,255,0.5)", textDecoration: "none" }}>Terms of Service</a>
          </p>
        </footer>
      </div>
    </main>
  );
}
