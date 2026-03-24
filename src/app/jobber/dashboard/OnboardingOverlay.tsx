"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useIsLight } from "@/lib/hooks";
import { track } from "@/lib/analytics";

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

// Tour steps: each targets a real element on the page and optionally navigates to a tab
type TourStep = {
  selector: string;        // CSS selector for the element to highlight
  title: string;
  body: string;
  tab?: string;            // URL to navigate to before highlighting
  position?: "top" | "bottom" | "left" | "right";
  interactive?: boolean;   // If true, user can click within the spotlight area
  scrollTo?: "top" | "center" | "bottom"; // Where to scroll the element — default "center"
  onEnter?: () => void;    // Called when step becomes active
  onLeave?: () => void;    // Called when leaving this step
};

const TOUR_STEPS: TourStep[] = [
  {
    selector: "[data-tour='revenue-chart']",
    tab: "/jobber/dashboard",
    title: "Your revenue, month by month",
    body: "This is the last 12 months of completed work pulled straight from Jobber. Toggle weekly if you want a tighter view.",
    position: "bottom",
  },
  {
    selector: "[data-tour='week-glance']",
    tab: "/jobber/dashboard",
    title: "This week at a glance",
    body: "Scheduled, earned, collected, and quotes won. Try clicking the period buttons above the cards to compare different time frames.",
    position: "bottom",
    interactive: true,
  },
  {
    selector: "[data-tour='recommendations']",
    tab: "/jobber/dashboard",
    title: "What needs your attention",
    body: "Overdue invoices, stale quotes, unscheduled work. Sorted by dollar amount so you handle the big stuff first.",
    position: "top",
  },
  {
    selector: "[data-tour='sales-pipeline']",
    tab: "/jobber/sales",
    title: "Your quote pipeline",
    body: "See every quote from lead to won. Find out where deals are stalling and which ones need a follow-up.",
    position: "bottom",
  },
  {
    selector: "[data-tour='sales-actions']",
    tab: "/jobber/sales",
    title: "Action lists keep things moving",
    body: "The colored bar shows where your quotes sit by age. Switch between Awaiting Response, Changes Requested, Follow-Ups, and Requests using the tabs at the top. Click any group header to collapse it. Sort by any column. Hit Export CSV to pull the list into Excel.",
    position: "bottom",
    scrollTo: "top",
    interactive: true,
  },
  {
    selector: "[data-tour='capacity-target']",
    tab: "/jobber/capacity",
    title: "Set your revenue target",
    body: "Click the Weekly Target button highlighted above to edit it. Type how much revenue you want booked each week. Once you save it, the chart will show green when you're on track, amber when you need more work, and flag when you're over capacity.",
    position: "bottom",
    interactive: true,
    onEnter: () => {
      // Pulse the target button to draw attention
      const el = document.querySelector("[data-tour='capacity-target'] button");
      if (el) {
        (el as HTMLElement).style.outline = "2px solid #7c5cff";
        (el as HTMLElement).style.outlineOffset = "2px";
        (el as HTMLElement).style.animation = "tour-pulse 1.5s ease-in-out infinite";
      }
    },
    onLeave: () => {
      const el = document.querySelector("[data-tour='capacity-target'] button");
      if (el) {
        (el as HTMLElement).style.outline = "";
        (el as HTMLElement).style.outlineOffset = "";
        (el as HTMLElement).style.animation = "";
      }
    },
  },
  {
    selector: "[data-tour='capacity-chart']",
    tab: "/jobber/capacity",
    title: "Your schedule at a glance",
    body: "Each bar is a week of scheduled work. Green means you're on track for your target. Amber means you need to book more.",
    position: "bottom",
    interactive: true,
  },
  {
    selector: "[data-tour='invoice-chart']",
    tab: "/jobber/invoices",
    title: "Invoiced vs collected",
    body: "Grey is what you sent out, green is what actually came in. If there's a gap, you know who to follow up with.",
    position: "bottom",
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
  const [ahaShown, dismissAha] = useLocalFlag(`aha_dismissed_${connectionId}`);
  const [tourDone, markTourDone] = useLocalFlag(`tour_done_${connectionId}`);
  const [checklistDismissed, dismissChecklist] = useLocalFlag(`checklist_dismissed_${connectionId}`);
  // Persist tour step so it survives page navigation
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
  const [checklistOpen, setChecklistOpen] = useState(true);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [navigating, setNavigating] = useState(false);
  const stepRef = useRef(tourStep);
  stepRef.current = tourStep;

  // Track revenue viewed (auto after 5s on page)
  const [revenueViewed, setRevenueViewed] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem(`checklist_revenue_${connectionId}`);
    if (stored === "true") { setRevenueViewed(true); return; }
    const timer = setTimeout(() => {
      setRevenueViewed(true);
      try { localStorage.setItem(`checklist_revenue_${connectionId}`, "true"); } catch {}
    }, 5000);
    return () => clearTimeout(timer);
  }, [connectionId]);

  // Track if target was set during this onboarding session
  // Only checks off if user explicitly visits capacity page and sets a target
  const [targetSetDuringOnboarding, setTargetSetDuringOnboarding] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem(`checklist_target_${connectionId}`);
    if (stored === "true") setTargetSetDuringOnboarding(true);
  }, [connectionId]);

  // Listen for custom event from capacity page when target is saved
  useEffect(() => {
    const handler = () => {
      setTargetSetDuringOnboarding(true);
      try { localStorage.setItem(`checklist_target_${connectionId}`, "true"); } catch {}
    };
    window.addEventListener("accuinsight:target-saved", handler);
    return () => window.removeEventListener("accuinsight:target-saved", handler);
  }, [connectionId]);

  // Track if sales target was set
  const [salesTargetSet, setSalesTargetSet] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem(`checklist_sales_target_${connectionId}`);
    if (stored === "true") { setSalesTargetSet(true); return; }
    // Check if any sales target is already set
    const check = () => {
      const weekly = localStorage.getItem("accuinsight_weekly_rev_target");
      const monthly = localStorage.getItem("accuinsight_monthly_rev_target");
      if ((weekly && Number(weekly) > 0) || (monthly && Number(monthly) > 0)) {
        setSalesTargetSet(true);
        try { localStorage.setItem(`checklist_sales_target_${connectionId}`, "true"); } catch {}
      }
    };
    check();
    // Poll every 3s since sales targets are saved to localStorage by another component
    const poll = setInterval(check, 3000);
    return () => clearInterval(poll);
  }, [connectionId]);

  const prevStepRef = useRef<number | null>(null);

  // Position spotlight on current tour element
  useEffect(() => {
    // Fire onLeave for previous step
    if (prevStepRef.current !== null && prevStepRef.current !== tourStep) {
      const prevStep = TOUR_STEPS[prevStepRef.current];
      if (prevStep?.onLeave) prevStep.onLeave();
    }
    prevStepRef.current = tourStep;

    if (tourStep === null) { setSpotlightRect(null); return; }
    const step = TOUR_STEPS[tourStep];
    if (!step) return;
    let cancelled = false;

    const scrollAndSpotlight = () => {
      const el = document.querySelector(step.selector);
      if (!el) {
        // Element not found yet, retry
        if (!cancelled) setTimeout(scrollAndSpotlight, 400);
        return;
      }

      setNavigating(false);
      // Hide spotlight during scroll
      setSpotlightRect(null);

      // Scroll using window.scrollTo for reliability (scrollIntoView can be blocked by overflow:hidden parents)
      const rect = el.getBoundingClientRect();
      const scrollTarget = step.scrollTo || "center";
      let targetY: number;
      if (scrollTarget === "top") {
        targetY = window.scrollY + rect.top - 100; // 100px from top
      } else if (scrollTarget === "bottom") {
        targetY = window.scrollY + rect.bottom - window.innerHeight + 100;
      } else {
        targetY = window.scrollY + rect.top - (window.innerHeight / 2) + (rect.height / 2);
      }
      window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });

      // Poll until scroll settles (rect stops changing), then show spotlight
      let lastTop = -1;
      let settleCount = 0;
      const pollScroll = () => {
        if (cancelled) return;
        const rect = el.getBoundingClientRect();
        if (Math.abs(rect.top - lastTop) < 2) {
          settleCount++;
          if (settleCount >= 3) {
            // Scroll has settled — show spotlight
            setSpotlightRect(rect);
            // Fire onEnter lifecycle
            if (step.onEnter) step.onEnter();
            return;
          }
        } else {
          settleCount = 0;
        }
        lastTop = rect.top;
        requestAnimationFrame(pollScroll);
      };
      // Start polling after a short delay
      setTimeout(pollScroll, 100);
    };

    // Navigate if needed (compare pathname only, ignore query string)
    const currentPath = window.location.pathname;
    if (step.tab && !currentPath.startsWith(step.tab)) {
      setNavigating(true);
      setSpotlightRect(null);
      router.push(step.tab + adminQs);
      // Wait for page to load, then scroll and spotlight
      setTimeout(scrollAndSpotlight, 2500);
    } else {
      // Same page — small delay then scroll
      setTimeout(scrollAndSpotlight, 200);
    }

    return () => { cancelled = true; };
  }, [tourStep, router]);

  // Reposition on scroll/resize/DOM changes (debounced)
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

    // Watch for DOM changes inside the spotlight target (e.g. input expanding)
    const step = TOUR_STEPS[tourStep];
    let observer: MutationObserver | null = null;
    if (step) {
      const el = document.querySelector(step.selector);
      if (el) {
        observer = new MutationObserver(reposition);
        observer.observe(el, { childList: true, subtree: true, attributes: true });
      }
    }

    return () => {
      cancelAnimationFrame(rafId);
      if (observer) observer.disconnect();
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [tourStep]);

  const bg = isLight ? "#ffffff" : "rgba(15,20,35,0.98)";
  const cardBorder = isLight ? "#e2e8f0" : "rgba(255,255,255,0.08)";
  const muted = isLight ? "#64748b" : "rgba(255,255,255,0.5)";
  const primary = isLight ? "#1e293b" : "#EAF1FF";

  const [showTourComplete, setShowTourComplete] = useState(false);
  const [tourMinimized, setTourMinimized] = useState(false);

  const advanceTour = () => {
    if (tourStep !== null && tourStep < TOUR_STEPS.length - 1) {
      track("tour_step_completed", { step: tourStep, title: TOUR_STEPS[tourStep]?.title });
      setTourStep(tourStep + 1);
    } else {
      track("tour_completed", { total_steps: TOUR_STEPS.length });
      setTourStep(null);
      markTourDone();
      setShowTourComplete(true);
    }
  };

  const lastStepRef = useRef<number>(0);
  const endTour = () => {
    track("tour_skipped", { at_step: tourStep, title: TOUR_STEPS[tourStep ?? 0]?.title });
    lastStepRef.current = tourStep ?? 0;
    setTourMinimized(true);
    setTourStep(null);
  };

  const fullyDismissTour = () => {
    setTourMinimized(false);
    markTourDone();
    if (!window.location.pathname.startsWith("/jobber/dashboard")) {
      router.push("/jobber/dashboard" + adminQs);
    }
  };

  const [showWelcome, setShowWelcome] = useState(false);

  // Show welcome screen for first-time users
  useEffect(() => {
    if (state.hasData && !ahaShown && !tourDone && tourStep === null && !showTourComplete && !tourMinimized) {
      dismissAha();
      setShowWelcome(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.hasData, ahaShown]);

  // Welcome screen — lets user start the tour
  if (showWelcome) {
    return (
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.6)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}>
        <div style={{
          background: bg, borderRadius: 20, padding: "36px 32px",
          maxWidth: 420, width: "100%",
          border: `1px solid ${cardBorder}`,
          boxShadow: "0 24px 48px rgba(0,0,0,0.3)",
          textAlign: "center",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, margin: "0 auto 20px",
            background: "linear-gradient(135deg, rgba(124,92,255,0.15), rgba(90,166,255,0.15))",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="28" height="28" viewBox="0 0 50 50">
              <defs><linearGradient id="wg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#7c5cff" /><stop offset="100%" stopColor="#5aa6ff" /></linearGradient></defs>
              <circle cx="25" cy="25" r="22" fill="none" stroke="url(#wg)" strokeWidth="3" />
              <polyline points="8,25 16,25 21,12 29,38 34,20 42,25" fill="none" stroke="url(#wg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: primary, marginBottom: 8 }}>
            Welcome to AccuInsight
          </div>
          <div style={{ fontSize: 14, color: muted, lineHeight: 1.7, marginBottom: 28 }}>
            Your Jobber data is ready. Let's take a quick look at what's here so you know where everything is. Takes about 60 seconds.
          </div>
          <button
            onClick={() => { track("tour_started"); setShowWelcome(false); setTourStep(0); }}
            className="btn"
            style={{
              padding: "14px 36px", fontSize: 15, fontWeight: 700,
              background: "linear-gradient(135deg, #7c5cff, #5aa6ff)",
              color: "#fff", border: "none", borderRadius: 12,
              cursor: "pointer", boxShadow: "0 4px 16px rgba(124,92,255,0.3)",
              width: "100%",
            }}
          >
            Show me around
          </button>
        </div>
      </div>
    );
  }

  // Tour complete screen
  if (showTourComplete) {
    return (
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.6)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}>
        <div style={{
          background: bg, borderRadius: 20, padding: "36px 32px",
          maxWidth: 440, width: "100%",
          border: `1px solid ${cardBorder}`,
          boxShadow: "0 24px 48px rgba(0,0,0,0.3)",
          textAlign: "center",
        }}>
          {/* Completion checkmark */}
          <div style={{
            width: 56, height: 56, borderRadius: "50%", margin: "0 auto 20px",
            background: "linear-gradient(135deg, #10b981, #059669)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, color: "#fff",
            boxShadow: "0 4px 16px rgba(16,185,129,0.3)",
          }}>
            {"\u2713"}
          </div>

          <div style={{ fontSize: 22, fontWeight: 800, color: primary, marginBottom: 8 }}>
            Your dashboard is ready.
          </div>
          <div style={{ fontSize: 14, color: muted, lineHeight: 1.7, marginBottom: 24 }}>
            Everything updates automatically when you sync. Check back weekly to stay on top of your numbers, or whenever you want a quick pulse on the business.
          </div>

          {/* Founder note */}
          <div style={{
            padding: "18px 20px", borderRadius: 12, marginBottom: 24,
            background: isLight ? "rgba(124,92,255,0.04)" : "rgba(124,92,255,0.08)",
            border: `1px solid ${isLight ? "rgba(124,92,255,0.12)" : "rgba(124,92,255,0.15)"}`,
            textAlign: "left",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <img
                src="/ryan-headshot.jpg"
                alt="Ryan"
                style={{
                  width: 40, height: 40, borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: primary }}>Ryan</div>
                <div style={{ fontSize: 11, color: muted }}>Founder, AccuInsight</div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: muted, lineHeight: 1.7 }}>
              I owned a service company for years. I built AccuInsight because I was tired of digging through Jobber reports to figure out how we were doing. If you have questions or feedback, reach out anytime.
            </div>
            <a href="mailto:ryan@ownerview.io" style={{
              display: "inline-block", marginTop: 12,
              fontSize: 14, fontWeight: 700, color: "#7c5cff", textDecoration: "none",
            }}>
              ryan@ownerview.io
            </a>
          </div>

          <button
            onClick={() => {
              setShowTourComplete(false);
              if (!window.location.pathname.startsWith("/jobber/dashboard")) {
                router.push("/jobber/dashboard" + adminQs);
              }
            }}
            className="btn"
            style={{
              padding: "14px 36px", fontSize: 15, fontWeight: 700,
              background: "linear-gradient(135deg, #7c5cff, #5aa6ff)",
              color: "#fff", border: "none", borderRadius: 12,
              cursor: "pointer", boxShadow: "0 4px 16px rgba(124,92,255,0.3)",
              width: "100%",
            }}
          >
            Go to my dashboard
          </button>
        </div>
      </div>
    );
  }

  // Aha modal (only if tour doesn't auto-start — fallback)
  if (state.hasData && !ahaShown) {
    return (
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.6)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
        onClick={dismissAha}
      >
        <div style={{
          background: bg, borderRadius: 16, padding: "32px",
          maxWidth: 400, width: "100%",
          border: `1px solid ${cardBorder}`,
          boxShadow: "0 24px 48px rgba(0,0,0,0.3)",
          textAlign: "center",
        }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{
            width: 48, height: 48, borderRadius: 12, margin: "0 auto 16px",
            background: "linear-gradient(135deg, rgba(124,92,255,0.15), rgba(90,166,255,0.15))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24,
          }}>
            <svg width="24" height="24" viewBox="0 0 50 50">
              <defs><linearGradient id="og" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#7c5cff" /><stop offset="100%" stopColor="#5aa6ff" /></linearGradient></defs>
              <polyline points="8,25 16,25 21,12 29,38 34,20 42,25" fill="none" stroke="url(#og)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: primary, marginBottom: 8 }}>
            Your data is here.
          </div>
          <div style={{ fontSize: 14, color: muted, lineHeight: 1.6, marginBottom: 24 }}>
            That's your last few months of revenue pulled straight from Jobber. Poke around, every tab has something useful.
          </div>
          <button
            onClick={dismissAha}
            className="btn"
            style={{
              padding: "12px 32px", fontSize: 15, fontWeight: 700,
              background: "linear-gradient(135deg, #7c5cff, #5aa6ff)",
              color: "#fff", border: "none", borderRadius: 10,
              cursor: "pointer", boxShadow: "0 4px 12px rgba(124,92,255,0.3)",
            }}
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  // Tour with spotlight
  if (tourStep !== null) {
    const step = TOUR_STEPS[tourStep];
    const pad = 12;
    const hasSpotlight = spotlightRect && !navigating;

    // Tooltip always fixed at bottom-center for consistency
    const tooltipW = Math.min(400, window.innerWidth - 32);
    const tooltipStyle: React.CSSProperties = {
      position: "fixed", zIndex: 1002,
      bottom: 24, left: "50%", transform: "translateX(-50%)",
      background: bg, borderRadius: 16, padding: "20px 24px",
      width: tooltipW,
      border: `1px solid ${cardBorder}`,
      boxShadow: "0 -8px 32px rgba(0,0,0,0.3), 0 16px 48px rgba(0,0,0,0.4)",
    };

    return (
      <>
        {/* Dark overlay with spotlight cutout */}
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 1001, pointerEvents: "none",
        }}>
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
            <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#spotlight-mask)" />
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
              border: "2px solid rgba(124,92,255,0.4)",
              boxShadow: "0 0 16px rgba(124,92,255,0.15)",
              pointerEvents: "none",
              transition: "top 0.3s ease, left 0.3s ease, width 0.3s ease, height 0.3s ease",
              willChange: "top, left, width, height",
            }} />
          )}
        </div>

        {/* Click blocker — on interactive steps, clip-path cuts a hole so real elements are clickable */}
        {step.interactive && hasSpotlight ? (
          <div
            style={{
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1001,
              clipPath: `polygon(0% 0%, 0% 100%, ${spotlightRect.left - pad}px 100%, ${spotlightRect.left - pad}px ${spotlightRect.top - pad}px, ${spotlightRect.right + pad}px ${spotlightRect.top - pad}px, ${spotlightRect.right + pad}px ${spotlightRect.bottom + pad}px, ${spotlightRect.left - pad}px ${spotlightRect.bottom + pad}px, ${spotlightRect.left - pad}px 100%, 100% 100%, 100% 0%)`,
            }}
          />
        ) : (
          <div
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1001 }}
          />
        )}

        {/* Tooltip */}
        <div style={{ ...tooltipStyle, position: "fixed" }} onClick={e => e.stopPropagation()}>
          {/* Subtle X to minimize */}
          <button
            onClick={endTour}
            style={{
              position: "absolute", top: 10, right: 12,
              background: "none", border: "none",
              color: isLight ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.15)",
              fontSize: 16, cursor: "pointer", padding: "2px 4px", lineHeight: 1,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = isLight ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.4)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = isLight ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.15)"; }}
          >
            &times;
          </button>
          {/* Step progress with checkmarks */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
            {TOUR_STEPS.map((s, i) => (
              <div key={i} style={{
                width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 800,
                background: i < tourStep ? "#10b981" : i === tourStep ? "linear-gradient(135deg, #7c5cff, #5aa6ff)" : (isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)"),
                color: i <= tourStep ? "#fff" : muted,
                transition: "all 0.3s ease",
                boxShadow: i === tourStep ? "0 2px 8px rgba(124,92,255,0.3)" : "none",
              }}>
                {i < tourStep ? "\u2713" : i + 1}
              </div>
            ))}
            <span style={{ fontSize: 11, fontWeight: 600, color: muted, marginLeft: 4 }}>
              {tourStep + 1} of {TOUR_STEPS.length}
            </span>
          </div>

          <div style={{ fontSize: 16, fontWeight: 700, color: primary, marginBottom: 6, opacity: navigating ? 0.4 : 1, transition: "opacity 0.3s ease" }}>
            {navigating ? `Going to ${step.tab?.split("/").pop() || "next section"}...` : step.title}
          </div>
          <div style={{ fontSize: 13, color: muted, lineHeight: 1.6, marginBottom: 20, opacity: navigating ? 0.3 : 1, transition: "opacity 0.3s ease" }}>
            {navigating ? "" : step.body}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              {tourStep > 0 && (
                <button
                  onClick={() => setTourStep(tourStep - 1)}
                  style={{
                    background: "none", border: `1px solid ${cardBorder}`, color: primary,
                    fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "8px 14px",
                    borderRadius: 8,
                  }}
                >
                  Back
                </button>
              )}
            </div>
            <button
              onClick={advanceTour}
              className="btn"
              style={{
                padding: "10px 24px", fontSize: 14, fontWeight: 700,
                background: "linear-gradient(135deg, #7c5cff, #5aa6ff)",
                color: "#fff", border: "none", borderRadius: 10,
                cursor: "pointer", boxShadow: "0 4px 12px rgba(124,92,255,0.3)",
              }}
            >
              {tourStep < TOUR_STEPS.length - 1 ? "Next" : "Finish"}
            </button>
          </div>
        </div>
      </>
    );
  }

  // Minimized tour — floating "Resume tour" button
  if (tourMinimized && !tourDone) {
    return (
      <button
        onClick={() => { setTourMinimized(false); setTourStep(lastStepRef.current); }}
        style={{
          position: "fixed", bottom: 20, right: 20, zIndex: 900,
          padding: "12px 20px", borderRadius: 12,
          background: "linear-gradient(135deg, #7c5cff, #5aa6ff)",
          color: "#fff", border: "none", fontSize: 13, fontWeight: 700,
          boxShadow: "0 4px 16px rgba(124,92,255,0.4)",
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

  // Don't show checklist if dismissed, no data, tour active, or completion screen showing
  if (checklistDismissed || !state.hasData || tourStep !== null || showTourComplete || showWelcome) return null;

  const items = [
    { label: "Connect your Jobber account", done: true, sub: "" },
    { label: "Check your revenue on the Overview tab", done: revenueViewed, sub: "" },
    { label: "Set a capacity target", done: targetSetDuringOnboarding, href: "/jobber/capacity", sub: "Go to Capacity and enter your weekly revenue goal" },
    { label: "Set a sales target", done: salesTargetSet, href: "/jobber/sales", sub: "Go to Sales and set a weekly or monthly sales target" },
  ];
  const doneCount = items.filter(i => i.done).length;
  const allDone = doneCount === items.length;

  // Mobile: floating button
  if (!checklistOpen) {
    return (
      <button
        onClick={() => setChecklistOpen(true)}
        style={{
          position: "fixed", bottom: 20, right: 20, zIndex: 900,
          padding: "10px 16px", borderRadius: 12,
          background: "linear-gradient(135deg, #7c5cff, #5aa6ff)",
          color: "#fff", border: "none", fontSize: 12, fontWeight: 700,
          boxShadow: "0 4px 16px rgba(124,92,255,0.4)",
          cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
        }}
      >
        Setup {doneCount}/{items.length}
      </button>
    );
  }

  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20, zIndex: 900,
      width: 320, maxWidth: "calc(100vw - 32px)",
      background: bg, borderRadius: 16,
      border: `1px solid ${cardBorder}`,
      boxShadow: "0 16px 48px rgba(0,0,0,0.3)",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 16px 10px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        borderBottom: `1px solid ${cardBorder}`,
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: primary }}>
            Get started with AccuInsight
          </div>
          <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>
            {doneCount} of {items.length} done
          </div>
        </div>
        <button
          onClick={() => setChecklistOpen(false)}
          style={{
            background: "none", border: "none", color: muted,
            fontSize: 18, cursor: "pointer", padding: "0 4px", lineHeight: 1,
          }}
        >
          &times;
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ padding: "0 16px", marginTop: 12 }}>
        <div style={{
          height: 6, borderRadius: 3,
          background: isLight ? "#e2e8f0" : "rgba(255,255,255,0.08)",
        }}>
          <div style={{
            height: "100%", borderRadius: 3,
            background: "linear-gradient(90deg, #7c5cff, #5aa6ff)",
            width: `${(doneCount / items.length) * 100}%`,
            transition: "width 0.5s ease",
          }} />
        </div>
      </div>

      {/* Items */}
      <div style={{ padding: "12px 16px 8px" }}>
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              padding: "10px 0",
              borderBottom: i < items.length - 1 ? `1px solid ${cardBorder}` : "none",
              opacity: item.done ? 0.5 : 1,
            }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: item.done ? "#10b981" : (isLight ? "#f1f5f9" : "rgba(255,255,255,0.06)"),
              border: item.done ? "none" : `2px solid ${isLight ? "#cbd5e1" : "rgba(255,255,255,0.15)"}`,
              color: "#fff", fontSize: 12, fontWeight: 800,
              transition: "all 0.3s ease",
            }}>
              {item.done && "\u2713"}
            </div>
            <div>
              {item.href && !item.done ? (
                <a href={item.href} style={{
                  fontSize: 13, fontWeight: 600, color: "#5aa6ff",
                  textDecoration: "none", display: "block",
                }}>
                  {item.label}
                </a>
              ) : (
                <span style={{
                  fontSize: 13, fontWeight: 600, color: primary,
                  textDecoration: item.done ? "line-through" : "none",
                }}>
                  {item.label}
                </span>
              )}
              {item.sub && !item.done && (
                <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>
                  {item.sub}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Tour button */}
      {!tourDone && (
        <div style={{ padding: "4px 14px 14px" }}>
          <button
            onClick={() => setTourStep(0)}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 10,
              background: "linear-gradient(135deg, rgba(124,92,255,0.12), rgba(90,166,255,0.12))",
              border: "1px solid rgba(124,92,255,0.25)",
              color: "#7c5cff",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all 0.15s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "linear-gradient(135deg, rgba(124,92,255,0.2), rgba(90,166,255,0.2))"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "linear-gradient(135deg, rgba(124,92,255,0.12), rgba(90,166,255,0.12))"; }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="#7c5cff" strokeWidth="1.5" />
              <polygon points="6.5,5 11,8 6.5,11" fill="#7c5cff" />
            </svg>
            Take a quick tour
          </button>
        </div>
      )}

      {/* All done */}
      {allDone && (
        <div style={{
          padding: "14px 16px", margin: "0 12px 12px",
          background: isLight ? "rgba(16,185,129,0.06)" : "rgba(16,185,129,0.08)",
          borderRadius: 10,
          border: `1px solid ${isLight ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.15)"}`,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#10b981", marginBottom: 4 }}>
            You're good to go.
          </div>
          <div style={{ fontSize: 12, color: muted, marginBottom: 10 }}>
            {state.trialDaysLeft > 0
              ? `Your trial ends in ${state.trialDaysLeft} day${state.trialDaysLeft !== 1 ? "s" : ""}. Upgrade anytime to keep your dashboard.`
              : "Upgrade to keep your dashboard."
            }
          </div>
          <form action="/api/billing/checkout" method="POST" onSubmit={() => track("upgrade_cta_clicked", { location: "onboarding_checklist" })}>
            <button
              type="submit"
              className="btn"
              style={{
                padding: "10px 20px", fontSize: 13, fontWeight: 700,
                background: "linear-gradient(135deg, #7c5cff, #5aa6ff)",
                color: "#fff", border: "none", borderRadius: 8,
                cursor: "pointer", boxShadow: "0 2px 8px rgba(124,92,255,0.3)",
                width: "100%",
              }}
            >
              Upgrade for $29/month
            </button>
          </form>
        </div>
      )}

      {allDone && (
        <div style={{ padding: "0 16px 14px", textAlign: "center" }}>
          <button
            onClick={dismissChecklist}
            style={{ background: "none", border: "none", color: muted, fontSize: 11, cursor: "pointer" }}
          >
            Dismiss
          </button>
        </div>
      )}
      <style>{`
        @keyframes tour-pulse {
          0%, 100% { outline-color: rgba(124,92,255,0.8); }
          50% { outline-color: rgba(124,92,255,0.3); }
        }
      `}</style>
    </div>
  );
}
