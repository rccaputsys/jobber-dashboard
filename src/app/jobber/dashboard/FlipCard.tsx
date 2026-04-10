"use client";

import { useState } from "react";
import { useIsLight } from "@/lib/hooks";

/**
 * FlipCard with optional per-page headers (rendered above the separator line).
 *
 * Layout-shift fix: every page is rendered into the same CSS grid cell so the
 * container is sized by the *tallest* page. Only the active page is visible
 * via opacity/pointer-events. This prevents the parent stretch container from
 * resizing the card (and its siblings) when the user flips between tabs.
 */
export function FlipCard({
  pages,
  labels,
  headers,
}: {
  pages: React.ReactNode[];
  labels: string[];
  headers?: React.ReactNode[];
}) {
  const [idx, setIdx] = useState(0);
  const isLight = useIsLight();
  const total = pages.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", flex: 1, minHeight: 0 }}>
      {/* Per-page header (above the separator) — also stacked so height is stable */}
      {headers && headers.length > 0 && (
        <div style={{ display: "grid", marginBottom: 4, minHeight: 28 }}>
          {headers.map((h, i) => (
            <div
              key={i}
              style={{
                gridArea: "1 / 1",
                visibility: i === idx ? "visible" : "hidden",
                pointerEvents: i === idx ? "auto" : "none",
              }}
            >
              {h}
            </div>
          ))}
        </div>
      )}
      <div style={{
        flex: 1, minHeight: 0, display: "grid",
        padding: "6px 0",
        borderTop: `1px solid ${isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.04)"}`,
        borderBottom: `1px solid ${isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.04)"}`,
        marginBottom: 6,
      }}>
        {pages.map((p, i) => (
          <div
            key={i}
            style={{
              gridArea: "1 / 1",
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              visibility: i === idx ? "visible" : "hidden",
              pointerEvents: i === idx ? "auto" : "none",
            }}
          >
            {p}
          </div>
        ))}
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
                color: idx === i ? (isLight ? "#1e293b" : "#ffffff") : (isLight ? "#6b7280" : "#a8b3c4"),
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
