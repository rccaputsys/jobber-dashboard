"use client";

let _connectionId: string | null = null;

export function initAnalytics(connectionId: string) {
  _connectionId = connectionId;
}

export function trackEvent(eventName: string, metadata?: Record<string, any>) {
  if (!_connectionId) return;
  // Fire-and-forget — never blocks UI
  fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      connection_id: _connectionId,
      event_name: eventName,
      metadata,
    }),
  }).catch(() => {});
}
