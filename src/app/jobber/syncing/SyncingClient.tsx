"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Entity = { key: string; label: string; status: string; count: number };
type StatusResp = {
  status: string;
  started_at: string | null;
  error: string | null;
  last_sync_at: string | null;
  entities: Entity[];
};

const BG = "#fbfaf7";
const FG = "#1a1a1a";
const MUTED = "#6b6b6b";
const BORDER = "#e8e5df";
const CARD = "#ffffff";
const ACCENT = "#c2410c";
const ACCENT_SOFT = "#fff1e6";
const SUCCESS = "#15803d";

const FEATURES = [
  {
    title: "Today — your top three",
    body: "Every morning, AccuInsight surfaces the three things that move money or fill the schedule. No digging required.",
  },
  {
    title: "Sell — close more quotes",
    body: "Cooling quotes that need a follow-up, drafts to send, and approved quotes ready to book. Sorted by urgency.",
  },
  {
    title: "Book — fill the schedule",
    body: "Late visits, unscheduled jobs, and weekly capacity vs. target so you know exactly when you need more work.",
  },
  {
    title: "Collect — get paid faster",
    body: "Past-due invoices to chase, completed work that hasn't been billed, and drafts ready to send.",
  },
];

function LogoMark() {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 28, height: 28, borderRadius: 6, background: ACCENT, color: "#fff",
    }}>
      <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
        <path d="M4 14l4-4 4 4 8-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; fg: string; border: string }> = {
    pending: { label: "Waiting",  bg: "#f5f3ef",     fg: MUTED,   border: BORDER },
    syncing: { label: "Syncing",  bg: ACCENT_SOFT,   fg: ACCENT,  border: "#fcd6b4" },
    done:    { label: "Done",     bg: "#e8f5ec",     fg: SUCCESS, border: "#c7e2cf" },
    error:   { label: "Error",    bg: "#fdecec",     fg: "#b91c1c", border: "#f4c4c4" },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999,
      background: s.bg, color: s.fg, border: `1px solid ${s.border}`,
      letterSpacing: 0.2,
    }}>{s.label}</span>
  );
}

function EntityRow({ entity }: { entity: Entity }) {
  const isDone = entity.status === "done";
  const isSyncing = entity.status === "syncing";
  const isError = entity.status === "error";

  const barColor = isError ? "#b91c1c" : isDone ? SUCCESS : ACCENT;
  const widthPct = isDone ? 100 : isSyncing ? 70 : isError ? 100 : 0;

  return (
    <div style={{
      padding: "14px 16px", borderRadius: 10,
      background: CARD, border: `1px solid ${BORDER}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: FG }}>{entity.label}</span>
          {(isDone || isSyncing) && entity.count > 0 && (
            <span style={{ fontSize: 12, color: MUTED }}>
              {entity.count.toLocaleString()} {isSyncing ? "so far" : "synced"}
            </span>
          )}
        </div>
        <StatusPill status={entity.status} />
      </div>
      <div style={{
        height: 5, borderRadius: 999, overflow: "hidden",
        background: "#f0ece5",
      }}>
        <div style={{
          height: "100%",
          width: `${widthPct}%`,
          background: barColor,
          transition: "width 0.6s ease",
          opacity: isSyncing ? 0.85 : 1,
          animation: isSyncing ? "ai-pulse 1.6s ease-in-out infinite" : "none",
        }} />
      </div>
    </div>
  );
}

export function SyncingClient({ connectionId }: { connectionId: string }) {
  const router = useRouter();
  const [data, setData] = useState<StatusResp | null>(null);
  const triggered = useRef(false);

  useEffect(() => {
    if (triggered.current) return;
    triggered.current = true;
    fetch(`/api/sync/onboarding?connection_id=${connectionId}`, { method: "POST" })
      .catch(() => {});
  }, [connectionId]);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/sync/status?connection_id=${connectionId}`, { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as StatusResp;
        if (!cancelled) setData(json);
      } catch {}
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => { cancelled = true; clearInterval(id); };
  }, [connectionId]);

  const entities: Entity[] = data?.entities || [
    { key: "jobs", label: "Jobs", status: "pending", count: 0 },
    { key: "visits", label: "Visits", status: "pending", count: 0 },
    { key: "quotes", label: "Quotes", status: "pending", count: 0 },
    { key: "invoices", label: "Invoices", status: "pending", count: 0 },
    { key: "requests", label: "Requests", status: "pending", count: 0 },
  ];

  const doneCount = entities.filter((e) => e.status === "done").length;
  const totalProgress = Math.round((doneCount / entities.length) * 100);
  const isComplete = data?.status === "complete" && !!data?.last_sync_at;
  const errorMsg = data?.error || (entities.some((e) => e.status === "error") ? "One or more entities failed to sync." : null);

  return (
    <div style={{
      minHeight: "100vh", background: BG, color: FG,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <style>{`
        @keyframes ai-pulse { 0%, 100% { opacity: 0.85; } 50% { opacity: 0.55; } }
        @keyframes ai-fade  { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
      `}</style>

      {/* Nav */}
      <header style={{
        borderBottom: `1px solid ${BORDER}`, background: `${BG}cc`, backdropFilter: "blur(8px)",
      }}>
        <div style={{
          maxWidth: 1100, margin: "0 auto", padding: "16px 24px",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <LogoMark />
          <span style={{ fontWeight: 600 }}>AccuInsight</span>
        </div>
      </header>

      {/* Subtle hero glow */}
      <div style={{ position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", left: "50%", top: "-10%",
          width: 900, height: 420, transform: "translateX(-50%)",
          borderRadius: "50%", background: ACCENT_SOFT, opacity: 0.5,
          filter: "blur(80px)", pointerEvents: "none", zIndex: 0,
        }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "56px 24px 80px" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h1 style={{
              fontSize: "clamp(30px, 5vw, 44px)",
              fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 12px",
            }}>
              {isComplete ? "Your dashboard is ready." : "Connecting to Jobber"}
            </h1>
            <p style={{
              fontSize: 16, color: MUTED, maxWidth: 640, margin: "0 auto 24px", lineHeight: 1.6,
            }}>
              {isComplete
                ? "We've pulled in your Jobber data. Jump in when you're ready."
                : "Most businesses take a couple of minutes. For larger businesses with years of Jobber history, pulling all your data can take a while. The good news: you only do this once."}
            </p>

            {isComplete && (
              <button
                onClick={() => router.push("/jobber/dashboard")}
                style={{
                  padding: "14px 32px", fontSize: 15, fontWeight: 600, color: "#fff",
                  background: ACCENT, border: "none", borderRadius: 8, cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(194,65,12,0.25)",
                }}
              >
                See my dashboard
              </button>
            )}
          </div>

          {/* Two-column grid */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24,
          }}>
            {/* Left: progress */}
            <div>
              <div style={{
                padding: 24, borderRadius: 14,
                background: CARD, border: `1px solid ${BORDER}`,
                boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
              }}>
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "baseline",
                  marginBottom: 18,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: MUTED, letterSpacing: 0.4 }}>
                    SYNC PROGRESS
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: ACCENT }}>
                    {totalProgress}%
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {entities.map((e) => <EntityRow key={e.key} entity={e} />)}
                </div>

                {errorMsg && (
                  <div style={{
                    marginTop: 16, padding: "12px 14px", borderRadius: 10,
                    background: "#fdecec", border: "1px solid #f4c4c4",
                    fontSize: 13, color: "#b91c1c",
                  }}>
                    {errorMsg}{" "}
                    <a href="/jobber/dashboard" style={{ color: "#b91c1c", textDecoration: "underline", fontWeight: 600 }}>
                      Continue to dashboard
                    </a>
                  </div>
                )}
              </div>

              <p style={{
                marginTop: 14, fontSize: 12, color: MUTED, textAlign: "center", lineHeight: 1.5,
              }}>
                Leave this page open or come back later. The sync runs on our servers and
                won&apos;t stop if you close the tab.
              </p>
            </div>

            {/* Right: features */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: MUTED, letterSpacing: 0.4, marginBottom: 18 }}>
                WHAT YOU&apos;LL SEE WHEN IT&apos;S DONE
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {FEATURES.map((f) => (
                  <div key={f.title} style={{
                    padding: "16px 18px", borderRadius: 12,
                    background: CARD, border: `1px solid ${BORDER}`,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                    animation: "ai-fade 0.4s ease",
                  }}>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: FG }}>
                      {f.title}
                    </div>
                    <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.55 }}>
                      {f.body}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
