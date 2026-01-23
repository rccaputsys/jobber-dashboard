"use client";

import { useState } from "react";

export function DisconnectJobberButton() {
  const [loading, setLoading] = useState(false);
  
  async function handleDisconnect() {
    if (!confirm("Are you sure you want to disconnect Jobber? This will delete all your synced data.")) {
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch("/api/jobber/disconnect", { method: "POST" });
      if (res.ok) {
        window.location.href = "/jobber";
      } else {
        alert("Failed to disconnect. Please try again.");
      }
    } catch {
      alert("Failed to disconnect. Please try again.");
    }
    setLoading(false);
  }
  
  return (
    <button 
      onClick={handleDisconnect}
      disabled={loading}
      className="btn btn-muted" 
      style={{ color: "#ef4444" }}
    >
      {loading ? "Disconnecting..." : "Disconnect Jobber"}
    </button>
  );
}