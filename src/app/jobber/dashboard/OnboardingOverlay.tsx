"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useIsLight } from "@/lib/hooks";
import { track } from "@/lib/analytics";

// ---------------------------------------------------------------------------
// Onboarding flow — rebuilt 2026-04-09 to match the new "Here's what needs
// your attention" UI pattern across all four tabs.
//
// Flow:  Welcome → 5-step spotlight tour → Completion screen → optional
//        floating "Resume tour" button if minimized.
//
// The previous version had 8 steps targeting elements that no longer exist
// (revenue chart, week-glance, invoice trends chart, etc.) and a separate
// persistent setup checklist. Both have been removed in favor of a single
// focused tour that hits the actual current UI.
// ---------------------------------------------------------------------------

type OnboardingState = {
  hasData: boolean;
  weeklyTargetSet: boolean;
  trialDaysLeft: number;
};

type Props = {
  state: OnboardingState;
  connectionId: string;
  adminConnectionId?: string;
};

function useLocalFlag(key: string): [boolean, () => void] {
  const [done, setDone] = useState(true);
  useEffect(() => {
    setDone(localStorage.getItem(key) === "true");
  }, [key]);
  const mark = useCallback(() => {
    setDone(true);
    try { localStorage.setItem(key, "true"); } catch {};
  }, [key]);
  return [done, mark];
}

type TourStep = {
  selector: string;            // CSS selector to spotlight
  tab: string;                 // Path to navigate to before spotlighting
  title: string;
  body: string;
  scrollTo?: "top" | "center" | "bottom";
};

const TOUR_STEPS: TourStep[] = [
  {
    selector: "[data-tour='overview-actions']",
    tab: "/jobber/dashboard",
    title: "Start with what to do today",
    body: "Every screen leads with the most important actions. This top panel shows your top three priorities right now — overdue collections, cooling quotes, and open capacity.",
    scrollTo: "top",
  },
  {
    selector: "[data-tour='overview-cards']",
    tab: "/jobber/dashboard",
    title: "Three cards. Three numbers that matter.",
    body: "Cash to collect, this week's schedule, and your sales pipeline. Each card shows the headline number on top and a detail view you can flip between. Click any card to dig deeper.",
    scrollTo: "center",
  },
  {
    selector: "[data-tour='attention-list']",
    tab: "/jobber/sales",
    title: "Sell — your prioritized quote actions",
    body: "Cooling quotes, customers waiting on changes, drafts to send, and approved quotes to book. Sorted by urgency. The pipeline below lets you drill into any stage.",
    scrollTo: "top",
  },
  {
    selector: "[data-tour='sales-actions']",
    tab: "/jobber/sales",
    title: "Drill in, sort, and export",
    body: "Every action list works the same way. Click a bucket to expand it. Click column headers to sort by amount, age, or date. And the Download button gives you a CSV you can work off of in Excel or send straight to your admin.",
    scrollTo: "center",
  },
  {
    selector: "[data-tour='attention-list']",
    tab: "/jobber/capacity",
    title: "Book — what's stopping you from filling the schedule",
    body: "Late visits, unscheduled jobs, approved quotes ready to book. Click the gear on the Weekly Capacity card on your overview to set your target — that's how the dashboard knows when you're booked enough.",
    scrollTo: "top",
  },
  {
    selector: "[data-tour='attention-list']",
    tab: "/jobber/invoices",
    title: "Collect — get paid for the work you've done",
    body: "Invoices to chase, work that's done but not yet billed, drafts ready to send. The buckets below show exactly which clients to call and which can probably be written off.",
    scrollTo: "top",
  },
];

function getElementRect(selector: string): DOMRect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  return el.getBoundingClientRect();
}

export function OnboardingOverlay({ state, connectionId, adminConnectionId }: Props) {
  const adminQs = adminConnectionId ? `?admin_connection_id=${adminConnectionId}` : "";
  const isLight = useIsLight();
  const router = useRouter();

  const [tourDone, markTourDone] = useLocalFlag(`tour_done_${connectionId}`);
  const [welcomeShown, markWelcomeShown] = useLocalFlag(`welcome_shown_${connectionId}`);

  // Persisted current step (so navigation between tabs doesn't lose progress)
  const [tourStep, _setTourStep] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem(`tour_step_${connectionId}`);
    return stored !== null ? parseInt(stored) : null;
  });
  const setTourStep = useCallback((step: number | null) => {
    _setTourStep(step);
    try {
      if (step !== null) localStorage.setItem(`tour_step_${connectionId}`, String(step));
      else localStorage.removeItem(`tour_step_${connectionId}`);
    } catch {}
  }, [connectionId]);

  const [showWelcome, setShowWelcome] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [tourMinimized, setTourMinimized] = useState(false);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [navigating, setNavigating] = useState(false);

  // Show welcome modal once for first-time users with data
  useEffect(() => {
    if (state.hasData && !welcomeShown && !tourDone && tourStep === null && !showComplete && !tourMinimized) {
      markWelcomeShown();
      setShowWelcome(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.hasData, welcomeShown]);

  // Spotlight positioning
  useEffect(() => {
    if (tourStep === null) { setSpotlightRect(null); return; }
    const step = TOUR_STEPS[tourStep];
    if (!step) return;
    let cancelled = false;

    const scrollAndSpotlight = () => {
      const el = document.querySelector(step.selector);
      if (!el) {
        if (!cancelled) setTimeout(scrollAndSpotlight, 300);
        return;
      }

      setNavigating(false);
      setSpotlightRect(null);

      const rect = el.getBoundingClientRect();
      const scrollTarget = step.scrollTo || "center";
      let targetY: number;
      if (scrollTarget === "top") {
        targetY = window.scrollY + rect.top - 100;
      } else if (scrollTarget === "bottom") {
        targetY = window.scrollY + rect.bottom - window.innerHeight + 100;
      } else {
        targetY = window.scrollY + rect.top - (window.innerHeight / 2) + (rect.height / 2);
      }
      window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });

      // Wait for scroll to settle, then show spotlight
      let lastTop = -1;
      let settleCount = 0;
      const pollScroll = () => {
        if (cancelled) return;
        const r = el.getBoundingClientRect();
        if (Math.abs(r.top - lastTop) < 2) {
          settleCount++;
          if (settleCount >= 3) {
            setSpotlightRect(r);
            return;
          }
        } else {
          settleCount = 0;
        }
        lastTop = r.top;
        requestAnimationFrame(pollScroll);
      };
      setTimeout(pollScroll, 100);
    };

    const currentPath = window.location.pathname;
    if (!currentPath.startsWith(step.tab)) {
      setNavigating(true);
      setSpotlightRect(null);
      router.push(step.tab + adminQs);
      setTimeout(scrollAndSpotlight, 1500);
    } else {
      setTimeout(scrollAndSpotlight, 200);
    }

    return () => { cancelled = true; };
  }, [tourStep, router, adminQs]);

  // Reposition spotlight on scroll/resize
  useEffect(() => {
    if (tourStep === null) return;
    let rafId: number;
    const reposition = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const step = TOUR_STEPS[tourStep];
        if (step) {
          const rect = getElementRect(step.selector);
          if (rect) setSpotlightRect(rect);
        }
      });
    };
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [tourStep]);

  const bg = isLight ? "#ffffff" : "rgba(15,20,35,0.98)";
  const cardBorder = isLight ? "#e2e8f0" : "rgba(255,255,255,0.08)";
  const muted = isLight ? "#64748b" : "rgba(255,255,255,0.5)";
  const primary = isLight ? "#1e293b" : "#EAF1FF";

  const advanceTour = () => {
    if (tourStep !== null && tourStep < TOUR_STEPS.length - 1) {
      track("tour_step_completed", { step: tourStep, title: TOUR_STEPS[tourStep]?.title });
      setTourStep(tourStep + 1);
    } else {
      track("tour_completed", { total_steps: TOUR_STEPS.length });
      setTourStep(null);
      markTourDone();
      setShowComplete(true);
    }
  };

  const lastStepRef = useRef<number>(0);
  const minimizeTour = () => {
    track("tour_minimized", { at_step: tourStep });
    lastStepRef.current = tourStep ?? 0;
    setTourMinimized(true);
    setTourStep(null);
  };

  const startTour = () => {
    track("tour_started");
    setShowWelcome(false);
    setTourStep(0);
  };

  // ---- Welcome modal ----
  if (showWelcome) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}>
        <div style={{
          background: bg, borderRadius: 20, padding: "36px 32px",
          maxWidth: 440, width: "100%",
          border: `1px solid ${cardBorder}`,
          boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
          textAlign: "center",
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, margin: "0 auto 22px",
            background: "linear-gradient(135deg, rgba(90,166,255,0.18), rgba(56,189,248,0.18))",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "1px solid rgba(90,166,255,0.25)",
          }}>
            <svg width="32" height="32" viewBox="0 0 50 50">
              <defs>
                <linearGradient id="welcomeLg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#5aa6ff" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>
              </defs>
              <circle cx="25" cy="25" r="22" fill="none" stroke="url(#welcomeLg)" strokeWidth="3" />
              <polyline points="8,25 16,25 21,12 29,38 34,20 42,25" fill="none" stroke="url(#welcomeLg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: primary, marginBottom: 10 }}>
            Welcome to AccuInsight
          </div>
          <div style={{ fontSize: 14, color: muted, lineHeight: 1.7, marginBottom: 28 }}>
            Your Jobber data is in. Take a 60-second tour so you know exactly where to look when you need to chase money, fill the schedule, or close a deal.
          </div>
          <button
            onClick={startTour}
            style={{
              padding: "14px 36px", fontSize: 15, fontWeight: 700,
              background: "linear-gradient(135deg, #5aa6ff, #38bdf8)",
              color: "#fff", border: "none", borderRadius: 12,
              cursor: "pointer", boxShadow: "0 4px 16px rgba(90,166,255,0.35)",
              width: "100%", marginBottom: 10,
            }}
          >
            Show me around
          </button>
          <button
            onClick={() => { setShowWelcome(false); markTourDone(); }}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: 600, color: muted, padding: "6px 12px",
            }}
          >
            Skip the tour
          </button>
        </div>
      </div>
    );
  }

  // ---- Tour complete screen ----
  if (showComplete) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}>
        <div style={{
          background: bg, borderRadius: 20, padding: "36px 32px",
          maxWidth: 460, width: "100%",
          border: `1px solid ${cardBorder}`,
          boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
          textAlign: "center",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%", margin: "0 auto 20px",
            background: "linear-gradient(135deg, #10b981, #059669)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, color: "#fff",
            boxShadow: "0 4px 16px rgba(16,185,129,0.3)",
          }}>
            ✓
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: primary, marginBottom: 8 }}>
            You&apos;re all set.
          </div>
          <div style={{ fontSize: 14, color: muted, lineHeight: 1.7, marginBottom: 20 }}>
            One last thing: set your <strong style={{ color: primary }}>weekly capacity target</strong> by clicking the gear icon on the Weekly Capacity card. That tells AccuInsight when you&apos;re fully booked vs. need more work.
          </div>

          {/* Founder note */}
          <div style={{
            padding: "16px 18px", borderRadius: 12, marginBottom: 20,
            background: isLight ? "rgba(90,166,255,0.05)" : "rgba(90,166,255,0.08)",
            border: `1px solid ${isLight ? "rgba(90,166,255,0.12)" : "rgba(90,166,255,0.18)"}`,
            textAlign: "left",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <Image
                src="/ryan-headshot.jpg"
                alt="Ryan"
                width={40}
                height={40}
                style={{ borderRadius: "50%", objectFit: "cover" }}
              />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: primary }}>Ryan</div>
                <div style={{ fontSize: 11, color: muted }}>Founder, AccuInsight</div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: muted, lineHeight: 1.7 }}>
              I owned a service company for years and got tired of digging through Jobber reports just to know how we were doing. The bigger problem was knowing what to prioritize, and what to put in front of my staff every morning. AccuInsight uses your own data to surface the priorities so you spend less time telling people what to go do, and more time running the business. Reach out anytime.
            </div>
            <a href="mailto:ryan@ownerview.io" style={{
              display: "inline-block", marginTop: 12,
              fontSize: 14, fontWeight: 700, color: "#5aa6ff", textDecoration: "none",
            }}>
              ryan@ownerview.io
            </a>
          </div>

          <button
            onClick={() => {
              setShowComplete(false);
              if (!window.location.pathname.startsWith("/jobber/dashboard")) {
                router.push("/jobber/dashboard" + adminQs);
              }
            }}
            style={{
              padding: "14px 36px", fontSize: 15, fontWeight: 700,
              background: "linear-gradient(135deg, #5aa6ff, #38bdf8)",
              color: "#fff", border: "none", borderRadius: 12,
              cursor: "pointer", boxShadow: "0 4px 16px rgba(90,166,255,0.35)",
              width: "100%",
            }}
          >
            Go to my dashboard
          </button>
        </div>
      </div>
    );
  }

  // ---- Active tour with spotlight ----
  if (tourStep !== null) {
    const step = TOUR_STEPS[tourStep];
    const pad = 12;
    const hasSpotlight = spotlightRect && !navigating;
    const tooltipW = typeof window !== "undefined" ? Math.min(440, window.innerWidth - 32) : 440;

    return (
      <>
        {/* Dark overlay with spotlight cutout */}
        <div style={{ position: "fixed", inset: 0, zIndex: 1001, pointerEvents: "none" }}>
          <svg width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0 }}>
            <defs>
              <mask id="spotlight-mask">
                <rect width="100%" height="100%" fill="white" />
                {hasSpotlight && (
                  <rect
                    x={spotlightRect.left - pad}
                    y={spotlightRect.top - pad}
                    width={spotlightRect.width + pad * 2}
                    height={spotlightRect.height + pad * 2}
                    rx="12"
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask="url(#spotlight-mask)" />
          </svg>

          {/* Spotlight border glow */}
          {hasSpotlight && (
            <div style={{
              position: "absolute",
              top: spotlightRect.top - pad,
              left: spotlightRect.left - pad,
              width: spotlightRect.width + pad * 2,
              height: spotlightRect.height + pad * 2,
              borderRadius: 12,
              border: "2px solid rgba(90,166,255,0.5)",
              boxShadow: "0 0 24px rgba(90,166,255,0.25), 0 0 0 3px rgba(90,166,255,0.08)",
              pointerEvents: "none",
              transition: "top 0.3s ease, left 0.3s ease, width 0.3s ease, height 0.3s ease",
            }} />
          )}
        </div>

        {/* Click blocker (full overlay over screen, blocks interaction during tour) */}
        <div style={{ position: "fixed", inset: 0, zIndex: 1001 }} />

        {/* Tooltip — fixed at bottom-center */}
        <div
          style={{
            position: "fixed", zIndex: 1002,
            bottom: 24, left: "50%", transform: "translateX(-50%)",
            background: bg, borderRadius: 16, padding: "20px 24px",
            width: tooltipW,
            border: `1px solid ${cardBorder}`,
            boxShadow: "0 -8px 32px rgba(0,0,0,0.3), 0 16px 48px rgba(0,0,0,0.4)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Minimize X */}
          <button
            onClick={minimizeTour}
            aria-label="Minimize tour"
            style={{
              position: "absolute", top: 10, right: 12,
              background: "none", border: "none",
              color: isLight ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.2)",
              fontSize: 18, cursor: "pointer", padding: "2px 6px", lineHeight: 1,
            }}
          >
            &times;
          </button>

          {/* Step progress dots */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
            {TOUR_STEPS.map((_, i) => (
              <div key={i} style={{
                width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 800,
                background: i < tourStep
                  ? "#10b981"
                  : i === tourStep
                    ? "linear-gradient(135deg, #5aa6ff, #38bdf8)"
                    : (isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)"),
                color: i <= tourStep ? "#fff" : muted,
                transition: "all 0.3s ease",
                boxShadow: i === tourStep ? "0 2px 8px rgba(90,166,255,0.35)" : "none",
              }}>
                {i < tourStep ? "✓" : i + 1}
              </div>
            ))}
            <span style={{ fontSize: 11, fontWeight: 600, color: muted, marginLeft: 6 }}>
              {tourStep + 1} of {TOUR_STEPS.length}
            </span>
          </div>

          <div style={{
            fontSize: 17, fontWeight: 800, color: primary, marginBottom: 6,
            opacity: navigating ? 0.4 : 1, transition: "opacity 0.3s ease",
          }}>
            {navigating ? "Loading next section..." : step.title}
          </div>
          <div style={{
            fontSize: 13, color: muted, lineHeight: 1.6, marginBottom: 20,
            opacity: navigating ? 0.3 : 1, transition: "opacity 0.3s ease",
          }}>
            {navigating ? "" : step.body}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              {tourStep > 0 && (
                <button
                  onClick={() => setTourStep(tourStep - 1)}
                  style={{
                    background: "none",
                    border: `1px solid ${cardBorder}`,
                    color: primary,
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                    padding: "8px 14px", borderRadius: 8,
                  }}
                >
                  Back
                </button>
              )}
            </div>
            <button
              onClick={advanceTour}
              style={{
                padding: "10px 26px", fontSize: 14, fontWeight: 700,
                background: "linear-gradient(135deg, #5aa6ff, #38bdf8)",
                color: "#fff", border: "none", borderRadius: 10,
                cursor: "pointer", boxShadow: "0 4px 12px rgba(90,166,255,0.35)",
              }}
            >
              {tourStep < TOUR_STEPS.length - 1 ? "Next" : "Finish"}
            </button>
          </div>
        </div>
      </>
    );
  }

  // ---- Minimized tour — floating "Resume tour" button ----
  if (tourMinimized && !tourDone) {
    return (
      <button
        onClick={() => { setTourMinimized(false); setTourStep(lastStepRef.current); }}
        style={{
          position: "fixed", bottom: 20, right: 20, zIndex: 900,
          padding: "12px 20px", borderRadius: 12,
          background: "linear-gradient(135deg, #5aa6ff, #38bdf8)",
          color: "#fff", border: "none", fontSize: 13, fontWeight: 700,
          boxShadow: "0 4px 16px rgba(90,166,255,0.4)",
          cursor: "pointer",
          display: "flex", alignItems: "center", gap: 8,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" stroke="#fff" strokeWidth="1.5" />
          <polygon points="6.5,5 11,8 6.5,11" fill="#fff" />
        </svg>
        Resume tour
      </button>
    );
  }

  return null;
}
