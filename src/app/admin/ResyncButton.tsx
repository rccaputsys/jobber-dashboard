"use client";

import { useState } from "react";

export function ResyncButton({ connectionId }: { connectionId: string }) {
  const [status, setStatus] = useState<"idle" | "syncing" | "done" | "error">("idle");

  const handleResync = async () => {
    setStatus("syncing");
    try {
      const res = await fetch(`/api/sync/run?connection_id=${connectionId}&full=true&json=true`);
      if (res.ok) {
        setStatus("done");
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 3000);
      }
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <button
      onClick={handleResync}
      disabled={status === "syncing"}
      className="btn"
      style={{
        minWidth: 100,
        background: status === "done" ? "rgba(16,185,129,0.15)" : 
                   status === "error" ? "rgba(239,68,68,0.15)" : undefined,
        borderColor: status === "done" ? "rgba(16,185,129,0.4)" : 
                     status === "error" ? "rgba(239,68,68,0.4)" : undefined,
        color: status === "done" ? "#10b981" : 
               status === "error" ? "#ef4444" : undefined,
      }}
    >
      {status === "syncing" && (
        <>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ animation: "spin 1s linear infinite" }}
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Syncing...
        </>
      )}
      {status === "done" && "✓ Complete"}
      {status === "error" && "✗ Failed"}
      {status === "idle" && "🔄 Resync"}
    </button>
  );
}
