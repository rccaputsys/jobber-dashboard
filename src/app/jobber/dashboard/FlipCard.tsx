"use client";

import { useState } from "react";
import { useIsLight } from "@/lib/hooks";

export function FlipCard({ pages, labels }: { pages: React.ReactNode[]; labels: string[] }) {
  const [idx, setIdx] = useState(0);
  const isLight = useIsLight();
  const total = pages.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", flex: 1 }}>
      <div style={{
        flex: 1, minHeight: 0, display: "flex", flexDirection: "column",
        padding: "6px 0",
        borderTop: `1px solid ${isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.04)"}`,
        borderBottom: `1px solid ${isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.04)"}`,
        marginBottom: 6,
      }}>
        {pages[idx]}
      </div>
      {total > 1 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          paddingTop: 6, marginTop: "auto",
          borderTop: `1px solid ${isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.04)"}`,
        }}>
          {labels.map((label, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className="toggle-btn"
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "5px 8px", fontSize: 12, fontWeight: idx === i ? 700 : 500,
                color: idx === i ? (isLight ? "#1e293b" : "#ffffff") : (isLight ? "#6b7280" : "#8590a2"),
                borderBottom: idx === i ? `2px solid ${isLight ? "#1e293b" : "#ffffff"}` : "2px solid transparent",
                transition: "all 0.15s ease",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
