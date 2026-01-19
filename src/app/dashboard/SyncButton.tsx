"use client";
import { useState } from "react";

export function SyncButton({ connectionId }: { connectionId: string }) {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/sync/run?connection_id=${connectionId}`);
      if (res.ok) {
        window.location.reload();
      } else {
        alert("Sync failed. Please try again.");
      }
    } catch (err) {
      alert("Sync failed. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <button
      onClick={handleSync}
      disabled={syncing}
      style={{
        padding: "10px 18px",
        background: "#5a67d8",
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
        boxShadow: "0 4px 12px rgba(90,103,216,0.3)",
        transition: "all 0.2s ease",
      }}
    >
      <span>{syncing ? "⏳" : "🔄"}</span>
      {syncing ? "Syncing..." : "Sync Now"}
    </button>
  );
}
