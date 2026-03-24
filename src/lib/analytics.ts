"use client";

/*
 * SQL Migration — run this in Supabase SQL Editor before using analytics:
 *
 * CREATE TABLE IF NOT EXISTS analytics_events (
 *   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   created_at timestamptz DEFAULT now(),
 *   user_id uuid REFERENCES auth.users(id),
 *   connection_id uuid,
 *   event text NOT NULL,
 *   properties jsonb DEFAULT '{}',
 *   user_agent text,
 *   viewport_width int,
 *   session_id text,
 *   page_url text
 * );
 *
 * CREATE INDEX idx_analytics_events_event ON analytics_events(event);
 * CREATE INDEX idx_analytics_events_user ON analytics_events(user_id);
 * CREATE INDEX idx_analytics_events_created ON analytics_events(created_at);
 * CREATE INDEX idx_analytics_events_connection ON analytics_events(connection_id);
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EventPayload = {
  event: string;
  properties?: Record<string, any>;
  timestamp?: number;
};

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let eventQueue: EventPayload[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let connectionId: string | null = null;
let sessionId: string | null = null;

const FLUSH_INTERVAL_MS = 5_000;
const RAGE_CLICK_THRESHOLD = 3;
const RAGE_CLICK_WINDOW_MS = 2_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSessionId(): string {
  if (sessionId) return sessionId;
  try {
    let stored = sessionStorage.getItem("analytics_session_id");
    if (!stored) {
      stored = crypto.randomUUID();
      sessionStorage.setItem("analytics_session_id", stored);
    }
    sessionId = stored;
    return stored;
  } catch {
    // SSR or sessionStorage unavailable
    sessionId = crypto.randomUUID();
    return sessionId;
  }
}

function getUserAgent(): string {
  try {
    return navigator.userAgent;
  } catch {
    return "";
  }
}

function getViewportWidth(): number {
  try {
    return window.innerWidth;
  } catch {
    return 0;
  }
}

function getPageUrl(): string {
  try {
    return window.location.href;
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Connection ID setter
// ---------------------------------------------------------------------------

export function setConnectionId(id: string): void {
  connectionId = id;
}

// ---------------------------------------------------------------------------
// Core track function
// ---------------------------------------------------------------------------

export function track(event: string, properties?: Record<string, any>): void {
  try {
    eventQueue.push({
      event,
      properties: properties ?? {},
      timestamp: Date.now(),
    });

    // Start auto-flush timer on first event
    if (!flushTimer && typeof window !== "undefined") {
      flushTimer = setInterval(() => {
        flush().catch(() => {});
      }, FLUSH_INTERVAL_MS);
    }
  } catch {
    // Never crash the app for analytics
  }
}

// ---------------------------------------------------------------------------
// Flush
// ---------------------------------------------------------------------------

export async function flush(): Promise<void> {
  if (eventQueue.length === 0) return;

  const batch = eventQueue.splice(0, eventQueue.length);
  const payload = {
    connection_id: connectionId,
    session_id: getSessionId(),
    user_agent: getUserAgent(),
    viewport_width: getViewportWidth(),
    page_url: getPageUrl(),
    events: batch,
  };

  try {
    // Prefer sendBeacon when the page is unloading (caller handles that),
    // otherwise use fetch.
    const res = await fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    if (!res.ok) {
      // Re-queue events on failure so they aren't lost
      eventQueue.unshift(...batch);
    }
  } catch {
    // Network error — re-queue for next attempt
    eventQueue.unshift(...batch);
  }
}

function flushViaSendBeacon(): void {
  if (eventQueue.length === 0) return;
  try {
    const batch = eventQueue.splice(0, eventQueue.length);
    const payload = JSON.stringify({
      connection_id: connectionId,
      session_id: getSessionId(),
      user_agent: getUserAgent(),
      viewport_width: getViewportWidth(),
      page_url: getPageUrl(),
      events: batch,
    });
    navigator.sendBeacon("/api/analytics/track", payload);
  } catch {
    // Best-effort
  }
}

// ---------------------------------------------------------------------------
// Session tracking
// ---------------------------------------------------------------------------

export function startSession(): void {
  try {
    sessionStorage.setItem("analytics_session_start", String(Date.now()));
    track("session_start");
  } catch {
    // Ignore
  }
}

export function endSession(): void {
  try {
    const startStr = sessionStorage.getItem("analytics_session_start");
    const duration = startStr ? Date.now() - Number(startStr) : 0;
    track("session_end", { duration_ms: duration });
    flushViaSendBeacon();
  } catch {
    // Ignore
  }
}

// ---------------------------------------------------------------------------
// Page view tracking
// ---------------------------------------------------------------------------

export function trackPageView(
  pageName: string,
  previousPage?: string,
  timeOnPrevious?: number,
): void {
  track("page_view", {
    page_name: pageName,
    previous_page: previousPage ?? null,
    time_on_previous_ms: timeOnPrevious ?? null,
  });
}

// ---------------------------------------------------------------------------
// Chart visibility tracking via IntersectionObserver
// ---------------------------------------------------------------------------

export function observeChart(
  element: HTMLElement,
  chartName: string,
): () => void {
  let enteredAt: number | null = null;

  try {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            enteredAt = Date.now();
            track("chart_visible", { chart_name: chartName });
          } else if (enteredAt !== null) {
            const viewDuration = Date.now() - enteredAt;
            track("chart_hidden", {
              chart_name: chartName,
              view_duration_ms: viewDuration,
            });
            enteredAt = null;
          }
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      // Track final duration if chart was visible when cleaned up
      if (enteredAt !== null) {
        const viewDuration = Date.now() - enteredAt;
        track("chart_hidden", {
          chart_name: chartName,
          view_duration_ms: viewDuration,
        });
      }
    };
  } catch {
    // IntersectionObserver not available (SSR, old browser)
    return () => {};
  }
}

// ---------------------------------------------------------------------------
// Rage click detection
// ---------------------------------------------------------------------------

export function initRageClickDetection(): () => void {
  const clickLog: { target: EventTarget | null; time: number }[] = [];

  function handleClick(e: MouseEvent): void {
    try {
      const now = Date.now();
      clickLog.push({ target: e.target, time: now });

      // Prune old entries
      while (clickLog.length > 0 && now - clickLog[0].time > RAGE_CLICK_WINDOW_MS) {
        clickLog.shift();
      }

      // Check for rage clicks on same element
      const sameElement = clickLog.filter((c) => c.target === e.target);
      if (sameElement.length >= RAGE_CLICK_THRESHOLD) {
        const el = e.target as HTMLElement | null;
        track("rage_click", {
          element_tag: el?.tagName ?? "unknown",
          element_id: el?.id || null,
          element_class: el?.className || null,
          element_text: el?.textContent?.slice(0, 100) || null,
          click_count: sameElement.length,
        });
        // Clear to avoid repeated firing
        clickLog.length = 0;
      }
    } catch {
      // Never crash
    }
  }

  try {
    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  } catch {
    return () => {};
  }
}

// ---------------------------------------------------------------------------
// Error tracking
// ---------------------------------------------------------------------------

export function trackError(
  error: Error,
  componentName?: string,
  context?: Record<string, any>,
): void {
  track("error", {
    error_name: error.name,
    error_message: error.message,
    error_stack: error.stack?.slice(0, 2000) ?? null,
    component_name: componentName ?? null,
    ...context,
  });
}

// ---------------------------------------------------------------------------
// Page unload handling — set up once
// ---------------------------------------------------------------------------

if (typeof window !== "undefined") {
  try {
    window.addEventListener("beforeunload", () => {
      flushViaSendBeacon();
    });

    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        flushViaSendBeacon();
      }
    });
  } catch {
    // Ignore
  }
}
