"use client";
import React, { useState, useEffect } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load theme from localStorage on mount
    const saved = localStorage.getItem("dashboard-theme") as "dark" | "light" | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("dashboard-theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  // Don't render interactive button until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <button
        style={{
          padding: "10px 16px",
          background: "#1a1a1a",
          color: "#EAF1FF",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span>☀️</span>
        Light
      </button>
    );
  }

  const currentColors = theme === "dark" ? {
    bg: "#1a1a1a",
    text: "#EAF1FF",
    border: "rgba(255,255,255,0.10)",
  } : {
    bg: "#ffffff",
    text: "#1a202c",
    border: "rgba(0,0,0,0.08)",
  };

  return (
    <button
      onClick={toggleTheme}
      style={{
        padding: "10px 16px",
        background: currentColors.bg,
        color: currentColors.text,
        border: `1px solid ${currentColors.border}`,
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 8,
        transition: "all 0.2s ease",
      }}
    >
      <span>{theme === "dark" ? "☀️" : "🌙"}</span>
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
