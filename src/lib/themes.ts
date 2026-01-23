export const themes = {
  dark: {
    bg: "#0a0a0a",
    panel: "#111111",
    card: "#1a1a1a",
    cardHover: "#222222",
    border: "rgba(255,255,255,0.08)",
    text: "#ffffff",
    sub: "#a0a0a0",
    mut: "#666666",
    primary: "#5a67d8",
    primaryHover: "#6b77e8",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
  },
  light: {
    bg: "#f8f9fa",
    panel: "#ffffff",
    card: "#ffffff",
    cardHover: "#f0f4f8",
    border: "rgba(0,0,0,0.08)",
    text: "#1a202c",
    sub: "#4a5568",
    mut: "#a0aec0",
    primary: "#4c51bf",
    primaryHover: "#5a67d8",
    success: "#059669",
    warning: "#d97706",
    danger: "#dc2626",
  },
};

export type Theme = keyof typeof themes;
export type ThemeColors = typeof themes.dark;
