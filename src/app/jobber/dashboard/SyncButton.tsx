"use client";
import { useState } from "react";
import { trackEvent } from "./analytics";

export function SyncButton({ connectionId }: { connectionId: string }) {
  const [syncing, setSyncing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleSync = async () => {
    trackEvent("sync_click");
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
      }}>{syncing ? "⏳" : "🔄"}</span>
      {syncing ? "Syncing..." : "Sync Now"}
    </button>
  );
}
