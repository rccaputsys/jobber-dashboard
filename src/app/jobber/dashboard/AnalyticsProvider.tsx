"use client";

import { useEffect, useRef } from "react";
import { initAnalytics, trackEvent } from "./analytics";

export function AnalyticsProvider({ connectionId }: { connectionId: string }) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    initAnalytics(connectionId);
    trackEvent("page_view");

    // Session heartbeat every 30s
    const interval = setInterval(() => {
      trackEvent("heartbeat");
    }, 30000);

    return () => clearInterval(interval);
  }, [connectionId]);

  return null;
}
