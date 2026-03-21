"use client";
import { useState, useEffect, useRef } from "react";
import { trackEvent } from "./analytics";

type SyncStatus = "idle" | "syncing" | "complete" | "failed";

export function SyncButton({ connectionId }: { connectionId: string }) {
  const [syncing, setSyncing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const startPolling = () => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/sync/status?connection_id=${connectionId}`);
        if (!res.ok) return;
        const data = await res.json();
        const status: SyncStatus = data.status;
        if (status === "complete") {
          stopPolling();
          setStatusText("Sync complete! Reloading...");
          setTimeout(() => window.location.reload(), 1500);
        } else if (status === "failed") {
          stopPolling();
          setSyncing(false);
          setStatusText(data.error || "Sync failed");
          setTimeout(() => setStatusText(""), 8000);
        }
      } catch { /* polling errors are non-critical */ }
    }, 3000);
  };

  const handleSync = async () => {
    trackEvent("sync_click");
    setSyncing(true);
    setStatusText("Syncing jobs...");
    startPolling();

    try {
      const jobsRes = await fetch(`/api/sync/run?connection_id=${connectionId}&json=true&step=jobs`);
      const jobsData = await jobsRes.json();
      if (!jobsData.ok) throw new Error(jobsData.error || "Jobs sync failed");

      const jobCount = jobsData.jobs || 0;
      const visitCount = jobsData.visits || 0;
      setStatusText(`Synced ${jobCount.toLocaleString()} jobs, ${visitCount} visits. Syncing invoices & quotes...`);

      const otherRes = await fetch(`/api/sync/run?connection_id=${connectionId}&json=true&step=other`);
      const otherData = await otherRes.json();
      if (!otherData.ok) throw new Error(otherData.error || "Invoice/quote sync failed");

      const invoiceCount = otherData.invoices || 0;
      const quoteCount = otherData.quotes || 0;
      const requestCount = otherData.requests || 0;
      setStatusText("Computing metrics...");

      const metricsRes = await fetch(`/api/sync/run?connection_id=${connectionId}&json=true&step=metrics&jobs=${jobCount}&invoices=${invoiceCount}&quotes=${quoteCount}&requests=${requestCount}`);
      const metricsData = await metricsRes.json();
      if (!metricsData.ok) throw new Error(metricsData.error || "Metrics computation failed");

      stopPolling();
      setStatusText(`Synced ${jobCount.toLocaleString()} jobs, ${invoiceCount} invoices, ${quoteCount} quotes`);
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      stopPolling();
      setSyncing(false);
      const msg = err instanceof Error ? err.message : "Sync failed. Please try again.";
      setStatusText(msg);
      setTimeout(() => setStatusText(""), 8000);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <button
        onClick={handleSync}
        disabled={syncing}
        className="btn"
        style={{
          padding: "5px 12px",
          fontSize: 11,
          fontWeight: 600,
          cursor: syncing ? "not-allowed" : "pointer",
          opacity: syncing ? 0.6 : 1,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <svg
          width="12" height="12" viewBox="0 0 16 16" fill="none"
          style={{ animation: syncing ? "spin 1s linear infinite" : "none" }}
        >
          <path d="M14 8A6 6 0 1 1 8 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M8 0 L10 2 L8 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {syncing ? "Syncing..." : "Sync"}
      </button>
      {statusText && (
        <span style={{
          fontSize: 10,
          color: statusText.includes("failed") || statusText.includes("Failed") ? "#ef4444" : undefined,
          fontWeight: 500,
          maxWidth: 200,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }} className="text-muted">
          {statusText}
        </span>
      )}
    </div>
  );
}
