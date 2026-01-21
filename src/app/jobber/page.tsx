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
              lineHeight: 1.1,
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
            Stop digging through Jobber reports. Get instant visibility into AR aging, 
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
            Connect Your Jobber Account
          </a>
          
          <p style={{ fontSize: 13, color: "rgba(234,241,255,0.5)", marginTop: 16 }}>
            Free 14-day trial • No credit card required • 2-minute setup
          </p>
        </div>

        {/* Dashboard Preview */}
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.08)",
            padding: 24,
            marginBottom: 80,
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <span style={{ fontSize: 13, color: "rgba(234,241,255,0.5)", textTransform: "uppercase", letterSpacing: 1 }}>
              Dashboard Preview
            </span>
          </div>
          
          {/* Mock Header with Pills */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 24,
              padding: "16px 20px",
              background: "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>AccuInsight Dashboard</div>
              <div style={{ fontSize: 12, color: "rgba(234,241,255,0.5)" }}>Last sync: 2 hours ago • USD</div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(245,158,11,0.25)",
                  border: "2px solid #f59e0b",
                  color: "#fff",
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
                AR Risk <strong>12.4%</strong>
              </span>
              <span
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(16,185,129,0.25)",
                  border: "2px solid #10b981",
                  color: "#fff",
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
                Capacity <strong>Balanced</strong>
              </span>
            </div>
          </div>
          
          {/* Mock KPI Cards - Financial Metrics */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "rgba(234,241,255,0.7)" }}>
              💰 Financial Metrics
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: 11, color: "rgba(234,241,255,0.5)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Total AR</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>$12,450</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: 11, color: "rgba(234,241,255,0.5)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>AR 15+ Days</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#f59e0b" }}>$3,200</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: 11, color: "rgba(234,241,255,0.5)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Quote Leakage</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#ef4444" }}>$8,500</div>
              </div>
            </div>
          </div>
          
          {/* Mock KPI Cards - Operations */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "rgba(234,241,255,0.7)" }}>
              📊 Operations Metrics
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: 11, color: "rgba(234,241,255,0.5)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Days Booked</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#10b981" }}>12 days</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: 11, color: "rgba(234,241,255,0.5)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Unscheduled</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#f59e0b" }}>6 jobs</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: 11, color: "rgba(234,241,255,0.5)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Changes Requested</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>2 quotes</div>
              </div>
            </div>
          </div>
          
          {/* Mock Line Charts */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "rgba(234,241,255,0.7)" }}>
              📈 Trends
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: "rgba(234,241,255,0.5)", textTransform: "uppercase", letterSpacing: 0.5 }}>Quote Leak</div>
                  <div style={{ fontSize: 12, color: "rgba(234,241,255,0.4)", marginTop: 2 }}>Cumulative leaked quotes</div>
                </div>
                <svg viewBox="0 0 200 50" style={{ width: "100%", height: 50 }}>
                  <line x1="0" y1="12" x2="200" y2="12" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                  <line x1="0" y1="25" x2="200" y2="25" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                  <line x1="0" y1="38" x2="200" y2="38" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                  <path d="M0,40 L33,38 L66,35 L100,30 L133,25 L166,20 L200,15 L200,50 L0,50 Z" fill="rgba(239,68,68,0.12)" />
                  <polyline points="0,40 33,38 66,35 100,30 133,25 166,20 200,15" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="200" cy="15" r="3" fill="#ef4444" stroke="#fff" strokeWidth="1.5" />
                </svg>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "rgba(234,241,255,0.35)", marginTop: 6 }}>
                  <span>6 wks ago</span>
                  <span>Today</span>
                </div>
              </div>
              
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: "rgba(234,241,255,0.5)", textTransform: "uppercase", letterSpacing: 0.5 }}>AR 15+</div>
                  <div style={{ fontSize: 12, color: "rgba(234,241,255,0.4)", marginTop: 2 }}>AR overdue 15+ days</div>
                </div>
                <svg viewBox="0 0 200 50" style={{ width: "100%", height: 50 }}>
                  <line x1="0" y1="12" x2="200" y2="12" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                  <line x1="0" y1="25" x2="200" y2="25" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                  <line x1="0" y1="38" x2="200" y2="38" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                  <path d="M0,35 L33,30 L66,32 L100,25 L133,28 L166,22 L200,20 L200,50 L0,50 Z" fill="rgba(245,158,11,0.12)" />
                  <polyline points="0,35 33,30 66,32 100,25 133,28 166,22 200,20" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="200" cy="20" r="3" fill="#f59e0b" stroke="#fff" strokeWidth="1.5" />
                </svg>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "rgba(234,241,255,0.35)", marginTop: 6 }}>
                  <span>6 wks ago</span>
                  <span>Today</span>
                </div>
              </div>
              
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: "rgba(234,241,255,0.5)", textTransform: "uppercase", letterSpacing: 0.5 }}>Unscheduled Jobs</div>
                  <div style={{ fontSize: 12, color: "rgba(234,241,255,0.4)", marginTop: 2 }}>Backlog count</div>
                </div>
                <svg viewBox="0 0 200 50" style={{ width: "100%", height: 50 }}>
                  <line x1="0" y1="12" x2="200" y2="12" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                  <line x1="0" y1="25" x2="200" y2="25" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                  <line x1="0" y1="38" x2="200" y2="38" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                  <path d="M0,30 L33,35 L66,28 L100,32 L133,25 L166,30 L200,28 L200,50 L0,50 Z" fill="rgba(90,166,255,0.12)" />
                  <polyline points="0,30 33,35 66,28 100,32 133,25 166,30 200,28" fill="none" stroke="#5aa6ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="200" cy="28" r="3" fill="#5aa6ff" stroke="#fff" strokeWidth="1.5" />
                </svg>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "rgba(234,241,255,0.35)", marginTop: 6 }}>
                  <span>6 wks ago</span>
                  <span>Today</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Action Lists Preview */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
            <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Aged AR (15+ Days)</div>
                  <div style={{ fontSize: 11, color: "rgba(234,241,255,0.5)" }}>Invoices overdue 15+ days - oldest first</div>
                </div>
                <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: "rgba(239,68,68,0.16)", color: "#fca5a5" }}>Collections</span>
              </div>
              <div style={{ fontSize: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "45px 1fr 70px 70px", gap: 8, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", color: "rgba(234,241,255,0.5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3, fontSize: 10 }}>
                  <div>Age</div>
                  <div>Invoice # + Client</div>
                  <div>Amount</div>
                  <div>Open</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "45px 1fr 70px 70px", gap: 8, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ color: "rgba(234,241,255,0.7)" }}>32d</div>
                  <div><span style={{ color: "rgba(234,241,255,0.5)" }}>#1042</span> <span style={{ color: "#fff" }}>• Smith Residence</span></div>
                  <div style={{ fontWeight: 600 }}>$1,250</div>
                  <div><span style={{ color: "#a5b4fc", fontSize: 11 }}>Open →</span></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "45px 1fr 70px 70px", gap: 8, padding: "8px 0" }}>
                  <div style={{ color: "rgba(234,241,255,0.7)" }}>19d</div>
                  <div><span style={{ color: "rgba(234,241,255,0.5)" }}>#1035</span> <span style={{ color: "#fff" }}>• Oak Properties</span></div>
                  <div style={{ fontWeight: 600 }}>$2,100</div>
                  <div><span style={{ color: "#a5b4fc", fontSize: 11 }}>Open →</span></div>
                </div>
              </div>
            </div>
            
            <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Top Unscheduled Jobs</div>
                  <div style={{ fontSize: 11, color: "rgba(234,241,255,0.5)" }}>Oldest first. Shows Job # and Title.</div>
                </div>
                <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: "rgba(90,166,255,0.16)", color: "#93c5fd" }}>Scheduling</span>
              </div>
              <div style={{ fontSize: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "45px 1fr 70px 70px", gap: 8, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", color: "rgba(234,241,255,0.5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3, fontSize: 10 }}>
                  <div>Age</div>
                  <div>Job # + Title</div>
                  <div>Amount</div>
                  <div>Open</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "45px 1fr 70px 70px", gap: 8, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ color: "rgba(234,241,255,0.7)" }}>14d</div>
                  <div><span style={{ color: "rgba(234,241,255,0.5)" }}>#2051</span> <span style={{ color: "#fff" }}>• Spring cleanup</span></div>
                  <div style={{ fontWeight: 600 }}>$450</div>
                  <div><span style={{ color: "#a5b4fc", fontSize: 11 }}>Open →</span></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "45px 1fr 70px 70px", gap: 8, padding: "8px 0" }}>
                  <div style={{ color: "rgba(234,241,255,0.7)" }}>9d</div>
                  <div><span style={{ color: "rgba(234,241,255,0.5)" }}>#2048</span> <span style={{ color: "#fff" }}>• Fence repair</span></div>
                  <div style={{ fontWeight: 600 }}>$1,200</div>
                  <div><span style={{ color: "#a5b4fc", fontSize: 11 }}>Open →</span></div>
                </div>
              </div>
            </div>
            
            <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Top Leaking Quotes</div>
                  <div style={{ fontSize: 11, color: "rgba(234,241,255,0.5)" }}>Sent quotes awaiting decision - follow up to close</div>
                </div>
                <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: "rgba(124,92,255,0.16)", color: "#c4b5fd" }}>Sales</span>
              </div>
              <div style={{ fontSize: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "45px 1fr 70px 70px", gap: 8, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", color: "rgba(234,241,255,0.5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3, fontSize: 10 }}>
                  <div>Age</div>
                  <div>Quote # + Title</div>
                  <div>Amount</div>
                  <div>Open</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "45px 1fr 70px 70px", gap: 8, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ color: "rgba(234,241,255,0.7)" }}>21d</div>
                  <div><span style={{ color: "rgba(234,241,255,0.5)" }}>#Q-892</span> <span style={{ color: "#fff" }}>• Patio installation</span></div>
                  <div style={{ fontWeight: 600 }}>$4,500</div>
                  <div><span style={{ color: "#a5b4fc", fontSize: 11 }}>Open →</span></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "45px 1fr 70px 70px", gap: 8, padding: "8px 0" }}>
                  <div style={{ color: "rgba(234,241,255,0.7)" }}>12d</div>
                  <div><span style={{ color: "rgba(234,241,255,0.5)" }}>#Q-887</span> <span style={{ color: "#fff" }}>• Deck refinish</span></div>
                  <div style={{ fontWeight: 600 }}>$2,800</div>
                  <div><span style={{ color: "#a5b4fc", fontSize: 11 }}>Open →</span></div>
                </div>
              </div>
            </div>
          </div>
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
              <p style={{ fontSize: 14, color: "rgba(234,241,255,0.6)", lineHeight: 1.6 }}>No more digging through Jobber reports. See everything that needs attention in one glance.</p>
            </div>
            
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 28, border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(245,158,11,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 16 }}>⚡</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>One-Click Actions</h3>
              <p style={{ fontSize: 14, color: "rgba(234,241,255,0.6)", lineHeight: 1.6 }}>Every item links directly to Jobber. Export to CSV for your weekly team meeting.</p>
            </div>
            
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 28, border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 16 }}>🌓</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Dark & Light Mode</h3>
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
