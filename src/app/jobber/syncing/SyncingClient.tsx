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

const FEATURES = [
  {
    title: "Sell — close more quotes",
    body: "See cooling quotes that need a follow-up, drafts to send, and approved quotes ready to book. Sorted by urgency.",
  },
  {
    title: "Book — fill the schedule",
    body: "Late visits, unscheduled jobs, and weekly capacity vs. target so you know exactly when you need more work.",
  },
  {
    title: "Collect — get paid faster",
    body: "Past-due invoices to chase, completed work that hasn't been billed, and drafts ready to send.",
  },
  {
    title: "Today — your top three priorities",
    body: "Every morning, AccuInsight surfaces the three things that move money or fill the schedule. No digging required.",
  },
];

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; fg: string }> = {
    pending: { label: "Waiting", bg: "rgba(255,255,255,0.06)", fg: "rgba(255,255,255,0.5)" },
    syncing: { label: "Syncing\u2026", bg: "rgba(90,166,255,0.18)", fg: "#5aa6ff" },
    done:    { label: "Done", bg: "rgba(16,185,129,0.18)", fg: "#10b981" },
    error:   { label: "Error", bg: "rgba(239,68,68,0.18)", fg: "#ef4444" },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999,
      background: s.bg, color: s.fg, letterSpacing: 0.3,
    }}>{s.label}</span>
  );
}

function EntityRow({ entity }: { entity: Entity }) {
  const isDone = entity.status === "done";
  const isSyncing = entity.status === "syncing";
  const isError = entity.status === "error";

  const barColor = isError
    ? "linear-gradient(90deg, #ef4444, #f87171)"
    : isDone
      ? "linear-gradient(90deg, #10b981, #34d399)"
      : "linear-gradient(90deg, #5aa6ff, #38bdf8)";

  const widthPct = isDone ? 100 : isSyncing ? 70 : isError ? 100 : 0;

  return (
    <div style={{
      padding: "16px 18px", borderRadius: 12,
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#EAF1FF" }}>{entity.label}</span>
          {(isDone || isSyncing) && entity.count > 0 && (
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
              {entity.count.toLocaleString()} {isSyncing ? "so far" : "synced"}
            </span>
          )}
        </div>
        <StatusPill status={entity.status} />
      </div>
      <div style={{
        height: 6, borderRadius: 999, overflow: "hidden",
        background: "rgba(255,255,255,0.05)",
      }}>
        <div style={{
          height: "100%",
          width: `${widthPct}%`,
          background: barColor,
          transition: "width 0.6s ease",
          animation: isSyncing ? "pulse 1.6s ease-in-out infinite" : "none",
        }} />
      </div>
    </div>
  );
}

export function SyncingClient({ connectionId }: { connectionId: string }) {
  const router = useRouter();
  const [data, setData] = useState<StatusResp | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const triggered = useRef(false);

  // Kick off the sync once on mount (fire-and-forget). The function runs on the
  // server until completion; we don't await the response on the client.
  useEffect(() => {
    if (triggered.current) return;
    triggered.current = true;
    fetch(`/api/sync/onboarding?connection_id=${connectionId}`, { method: "POST" })
      .catch(() => { /* surfaced via /api/sync/status */ });
  }, [connectionId]);

  // Poll status every 2s
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/sync/status?connection_id=${connectionId}`, { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as StatusResp;
        if (!cancelled) setData(json);
      } catch { /* keep polling */ }
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => { cancelled = true; clearInterval(id); };
  }, [connectionId]);

  // When sync completes, redirect to dashboard after a short pause
  useEffect(() => {
    if (!data || redirecting) return;
    const allDone = data.entities.every((e) => e.status === "done");
    const isComplete = data.status === "complete" || allDone;
    if (isComplete) {
      setRedirecting(true);
      const t = setTimeout(() => router.push("/jobber/dashboard"), 1200);
      return () => clearTimeout(t);
    }
  }, [data, redirecting, router]);

  const entities: Entity[] = data?.entities || [
    { key: "jobs", label: "Jobs", status: "pending", count: 0 },
    { key: "visits", label: "Visits", status: "pending", count: 0 },
    { key: "quotes", label: "Quotes", status: "pending", count: 0 },
    { key: "invoices", label: "Invoices", status: "pending", count: 0 },
    { key: "requests", label: "Requests", status: "pending", count: 0 },
  ];

  const doneCount = entities.filter((e) => e.status === "done").length;
  const totalProgress = Math.round((doneCount / entities.length) * 100);
  const errorMsg = data?.error || (entities.some((e) => e.status === "error") ? "One or more entities failed to sync." : null);

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(circle at 20% 10%, rgba(90,166,255,0.08), transparent 60%), #060811",
      color: "#EAF1FF",
      padding: "48px 24px",
    }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.65; }
        }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 10, padding: "6px 14px",
            borderRadius: 999, background: "rgba(90,166,255,0.12)",
            border: "1px solid rgba(90,166,255,0.25)", marginBottom: 18,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#5aa6ff", animation: "pulse 1.5s infinite" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#5aa6ff", letterSpacing: 0.4 }}>
              {redirecting ? "ALL DONE" : "PULLING IN YOUR DATA"}
            </span>
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 12px" }}>
            {redirecting ? "Welcome to AccuInsight." : "Connecting to Jobber\u2026"}
          </h1>
          <p style={{ fontSize: 15, color: "rgba(234,241,255,0.6)", maxWidth: 600, margin: "0 auto" }}>
            {redirecting
              ? "Your dashboard is ready. Redirecting now\u2026"
              : "We're pulling your jobs, visits, quotes, invoices, and requests. This usually takes 1\u20132 minutes. Feel free to read up while you wait."}
          </p>
        </div>

        {/* Two-column layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
          {/* Left: progress */}
          <div>
            <div style={{
              padding: 24, borderRadius: 16,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(234,241,255,0.7)", letterSpacing: 0.4 }}>
                  SYNC PROGRESS
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#5aa6ff" }}>
                  {totalProgress}%
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {entities.map((e) => <EntityRow key={e.key} entity={e} />)}
              </div>

              {errorMsg && (
                <div style={{
                  marginTop: 16, padding: "12px 14px", borderRadius: 10,
                  background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                  fontSize: 13, color: "#ef4444",
                }}>
                  {errorMsg}{" "}
                  <a
                    href="/jobber/dashboard"
                    style={{ color: "#ef4444", textDecoration: "underline", fontWeight: 700 }}
                  >
                    Continue to dashboard
                  </a>
                </div>
              )}
            </div>

            <div style={{
              marginTop: 16, fontSize: 12, color: "rgba(234,241,255,0.4)", textAlign: "center",
            }}>
              You can leave this page open or come back later \u2014 the sync runs on our servers.
            </div>
          </div>

          {/* Right: features */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(234,241,255,0.7)", letterSpacing: 0.4, marginBottom: 18 }}>
              WHAT YOU&apos;LL SEE WHEN IT&apos;S DONE
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {FEATURES.map((f) => (
                <div key={f.title} style={{
                  padding: "18px 20px", borderRadius: 14,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6, color: "#EAF1FF" }}>
                    {f.title}
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(234,241,255,0.6)", lineHeight: 1.6 }}>
                    {f.body}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
