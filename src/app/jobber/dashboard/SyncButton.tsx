"use client";
import { useState, useEffect, useRef } from "react";
import { trackEvent } from "./analytics";

type SyncStatus = "idle" | "syncing" | "complete" | "failed";

export function SyncButton({ connectionId }: { connectionId: string }) {
  const [syncing, setSyncing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
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
      } catch {
        // Polling errors are non-critical
      }
    }, 3000);
  };

  const handleSync = async () => {
    trackEvent("sync_click");
    setSyncing(true);
    setStatusText("Starting sync...");

    try {
      // Fire-and-forget the sync call, poll for status
      startPolling();

      const res = await fetch(
        `/api/sync/run?connection_id=${connectionId}&json=true`
      );
      const data = await res.json();

      stopPolling();

      if (data.ok) {
        const counts = `${data.jobs} jobs, ${data.invoices} invoices, ${data.quotes} quotes, ${data.requests} requests`;
        setStatusText(`Synced ${counts}`);
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setSyncing(false);
        setStatusText(data.error || "Sync failed");
        setTimeout(() => setStatusText(""), 8000);
      }
    } catch {
      stopPolling();
      setSyncing(false);
      setStatusText("Sync failed. Please try again.");
      setTimeout(() => setStatusText(""), 8000);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
      <button
        onClick={handleSync}
        disabled={syncing}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="btn-interactive"
        style={{
          padding: "10px 18px",
          background: isHovered && !syncing ? "#6875e0" : "#5a67d8",
          color: "#fff",
          border: "none",
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 700,
          cursor: syncing ? "not-allowed" : "pointer",
          opacity: syncing ? 0.6 : 1,
          display: "flex",
          alignItems: "center",
          gap: 8,
          boxShadow: isHovered && !syncing ? "0 6px 20px rgba(90,103,216,0.4)" : "0 4px 12px rgba(90,103,216,0.3)",
          transition: "all 0.2s ease",
          transform: isHovered && !syncing ? "translateY(-1px)" : "translateY(0)",
        }}
      >
        <span style={{
          display: "inline-block",
          animation: syncing ? "spin 1s linear infinite" : "none",
        }}>{syncing ? "\u23F3" : "\uD83D\uDD04"}</span>
        {syncing ? "Syncing..." : "Sync Now"}
      </button>
      {statusText && (
        <span style={{
          fontSize: 12,
          color: statusText.includes("failed") || statusText.includes("Failed") ? "#e53e3e" : "#718096",
          fontWeight: 500,
          maxWidth: 300,
        }}>
          {statusText}
        </span>
      )}
    </div>
  );
}
