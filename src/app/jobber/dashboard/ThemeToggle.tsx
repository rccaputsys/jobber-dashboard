"use client";
import React, { useState, useEffect } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setMounted(true);
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

  const getStyles = (isDark: boolean, hovered: boolean): React.CSSProperties => ({
    padding: "10px 16px",
    background: hovered
      ? isDark ? "#2a2a2a" : "#f1f5f9"
      : isDark ? "#1a1a1a" : "#ffffff",
    color: isDark ? "#EAF1FF" : "#1a202c",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "#e2e8f0"}`,
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 8,
    transition: "all 0.2s ease",
    transform: hovered ? "translateY(-1px)" : "translateY(0)",
    boxShadow: hovered
      ? isDark ? "0 4px 12px rgba(0,0,0,0.3)" : "0 4px 12px rgba(0,0,0,0.1)"
      : "none",
  });

  if (!mounted) {
    return (
      <button style={getStyles(true, false)}>
        <span>☀️</span>
        Light
      </button>
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={getStyles(isDark, isHovered)}
    >
      <span>{isDark ? "☀️" : "🌙"}</span>
      {isDark ? "Light" : "Dark"}
    </button>
  );
}
