"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { initAnalytics, trackEvent } from "./analytics";
import {
  setConnectionId,
  startSession,
  endSession,
  trackPageView,
  initRageClickDetection,
  track,
} from "@/lib/analytics";

export function AnalyticsProvider({ connectionId }: { connectionId: string }) {
  const initialized = useRef(false);
  const pathname = usePathname();
  const prevPath = useRef<string | null>(null);
  const pageLoadTime = useRef(Date.now());

  // Initialize both old and new analytics
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Old system (backward compat)
    initAnalytics(connectionId);
    trackEvent("page_view");

    // New system
    setConnectionId(connectionId);
    startSession();

    // Rage click detection
    const cleanupRage = initRageClickDetection();

    // Session heartbeat every 60s
    const interval = setInterval(() => {
      track("heartbeat");
    }, 60000);

    return () => {
      clearInterval(interval);
      cleanupRage();
      endSession();
    };
  }, [connectionId]);

  // Track page views on route changes
  useEffect(() => {
    if (!initialized.current) return;
    const prev = prevPath.current;
    const timeOnPrev = prev ? Math.round((Date.now() - pageLoadTime.current) / 1000) : undefined;

    const pageName = pathname.split("/").pop() || "dashboard";
    trackPageView(pageName, prev || undefined, timeOnPrev);

    prevPath.current = pathname;
    pageLoadTime.current = Date.now();
  }, [pathname]);

  return null;
}
