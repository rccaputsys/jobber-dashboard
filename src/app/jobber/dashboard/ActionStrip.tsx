"use client";

import { useIsLight } from "@/lib/hooks";

export type ActionItem = {
  text: string;
  href?: string;
  color: string;
};

type Props = {
  headline: string;
  subline?: string;
  actions: ActionItem[];
  borderColor?: string;
};

export function ActionStrip({ headline, subline, actions }: Props) {
  const isLight = useIsLight();
  if (actions.length === 0) return null;

  const primary = actions[0];
  const secondary = actions.slice(1);
  const textColor = isLight ? "#1e293b" : "#EAF1FF";

  return (
    <div style={{
      borderRadius: 14, overflow: "hidden",
      border: `1px solid ${isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"}`,
    }}>
      {/* Primary action */}
      {(() => {
        const inner = (
          <div style={{
            padding: "14px 20px",
            background: `${primary.color}06`,
            borderLeft: `4px solid ${primary.color}`,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            transition: "background 0.15s ease",
          }}>
            <div>
              <div className="text-muted" style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>
                {headline}
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: textColor, lineHeight: 1.3 }}>
                {primary.text}
              </div>
              {subline && (
                <div className="text-muted" style={{ fontSize: 11, marginTop: 3 }}>{subline}</div>
              )}
            </div>
            {primary.href && (
              <div style={{
                padding: "8px 16px", borderRadius: 8, flexShrink: 0,
                background: primary.color, color: "#fff",
                fontSize: 12, fontWeight: 700,
                boxShadow: `0 2px 8px ${primary.color}40`,
              }}>
                Go
              </div>
            )}
          </div>
        );

        return primary.href ? (
          <a href={primary.href} style={{ textDecoration: "none", display: "block" }} className="hover-lift">{inner}</a>
        ) : inner;
      })()}

      {/* Secondary actions */}
      {secondary.length > 0 && (
        <div style={{
          padding: "6px 20px 8px",
          background: isLight ? "rgba(0,0,0,0.01)" : "rgba(255,255,255,0.01)",
          borderTop: `1px solid ${isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)"}`,
          display: "flex", flexDirection: "column", gap: 1,
        }}>
          {secondary.map((item, i) => {
            const inner = (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "5px 0",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: textColor }}>{item.text}</span>
                {item.href && (
                  <span className="text-muted" style={{ fontSize: 10, marginLeft: "auto" }}>&#8594;</span>
                )}
              </div>
            );

            return item.href ? (
              <a key={i} href={item.href} style={{ textDecoration: "none" }}>{inner}</a>
            ) : (
              <div key={i}>{inner}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
