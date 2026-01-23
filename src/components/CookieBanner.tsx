"use client";

import { useState, useEffect } from "react";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      // Small delay so it doesn't flash on page load
      setTimeout(() => setVisible(true), 1000);
    }
  }, []);

  function handleAccept() {
    localStorage.setItem("cookie-consent", "accepted");
    setVisible(false);
  }

  function handleDecline() {
    localStorage.setItem("cookie-consent", "declined");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      padding: "16px 20px",
      background: "rgba(10, 16, 32, 0.95)",
      backdropFilter: "blur(10px)",
      borderTop: "1px solid rgba(255,255,255,0.1)",
      boxShadow: "0 -4px 24px rgba(0,0,0,0.3)",
    }}>
      <div style={{
        maxWidth: 1200,
        margin: "0 auto",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}>
        <p style={{
          margin: 0,
          fontSize: 14,
          color: "rgba(234,241,255,0.8)",
          lineHeight: 1.5,
          flex: "1 1 300px",
        }}>
          We use cookies to improve your experience and analyze site usage.
          By continuing, you agree to our{" "}
          <a 
            href="/privacy" 
            style={{ color: "#a5b4fc", textDecoration: "none" }}
          >
            Privacy Policy
          </a>.
        </p>
        
        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          <button
            onClick={handleDecline}
            style={{
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "transparent",
              color: "rgba(234,241,255,0.7)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            style={{
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 8,
              border: "none",
              background: "linear-gradient(135deg, #7c5cff, #5aa6ff)",
              color: "white",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(90,166,255,0.3)",
              transition: "all 0.15s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 6px 16px rgba(90,166,255,0.4)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(90,166,255,0.3)";
            }}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
