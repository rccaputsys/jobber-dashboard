"use client";

import { useState } from "react";

export type AttentionAction = {
  text: string;
  why: string;
  color: string;
  priority: number;
};

const TOP_N = 3;

/**
 * Reusable "Here's what needs your attention" panel — used on sales, capacity,
 * and invoices action tabs. Shows the top N actions by default with a
 * "Show more" button to reveal the rest.
 */
export function AttentionList({
  actions,
  emptyMessage = "Nothing urgent right now — you're in good shape.",
  title = "Here's what needs your attention",
}: {
  actions: AttentionAction[];
  emptyMessage?: string;
  title?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? actions : actions.slice(0, TOP_N);
  const hiddenCount = Math.max(0, actions.length - TOP_N);

  return (
    <div data-tour="attention-list" className="panel animate-in delay-1" style={{ padding: "14px 18px", marginBottom: 12 }}>
      <h2 className="text-primary" style={{ fontSize: 16, fontWeight: 800, margin: "0 0 10px" }}>
        {title}
      </h2>
      {actions.length === 0 ? (
        <div className="text-muted" style={{ fontSize: 13, padding: "6px 0" }}>
          {emptyMessage}
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {visible.map((action, i) => (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  padding: "10px 12px", borderRadius: 8,
                  borderLeft: `3px solid ${action.color}`,
                  background: `${action.color}0d`,
                }}
              >
                <span
                  style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: action.color, flexShrink: 0, marginTop: 6,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="text-primary" style={{ fontSize: 14, fontWeight: 700 }}>
                    {action.text}
                  </div>
                  <div className="text-muted" style={{ fontSize: 11, marginTop: 2, lineHeight: 1.4 }}>
                    {action.why}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              style={{
                display: "block",
                marginTop: 10,
                marginInline: "auto",
                padding: "6px 14px",
                borderRadius: 6,
                border: "none",
                background: "transparent",
                color: "#5aa6ff",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {expanded ? "Show less" : `Show ${hiddenCount} more`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
