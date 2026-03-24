"use client";

import { useState, useEffect, useCallback } from "react";
import { useIsLight } from "@/lib/hooks";

type OnboardingState = {
  hasData: boolean;
  ahaShown: boolean;
  tourCompleted: boolean;
  checklistRevenue: boolean;
  checklistTarget: boolean;
  weeklyTargetSet: boolean;
  trialDaysLeft: number;
};

type Props = {
  state: OnboardingState;
  connectionId: string;
};

function useLocalFlag(key: string): [boolean, () => void] {
  const [done, setDone] = useState(true); // default true to avoid flash
  useEffect(() => {
    setDone(localStorage.getItem(key) === "true");
  }, [key]);
  const mark = useCallback(() => {
    setDone(true);
    try { localStorage.setItem(key, "true"); } catch {}
  }, [key]);
  return [done, mark];
}

export function OnboardingOverlay({ state, connectionId }: Props) {
  const isLight = useIsLight();
  const [ahaShown, dismissAha] = useLocalFlag(`aha_dismissed_${connectionId}`);
  const [tourDone, markTourDone] = useLocalFlag(`tour_done_${connectionId}`);
  const [checklistDismissed, dismissChecklist] = useLocalFlag(`checklist_dismissed_${connectionId}`);
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [checklistOpen, setChecklistOpen] = useState(true);
  const [confetti, setConfetti] = useState(false);

  // Track if user has viewed revenue (scrolled past hero section)
  const [revenueViewed, setRevenueViewed] = useState(false);
  useEffect(() => {
    if (state.checklistRevenue) { setRevenueViewed(true); return; }
    const timer = setTimeout(() => {
      setRevenueViewed(true);
      try { localStorage.setItem(`checklist_revenue_${connectionId}`, "true"); } catch {}
    }, 5000); // Mark as viewed after 5s on the page
    return () => clearTimeout(timer);
  }, [state.checklistRevenue, connectionId]);

  // Check if all items complete
  const allDone = state.hasData && revenueViewed && state.weeklyTargetSet;
  useEffect(() => {
    if (allDone && !confetti) {
      setConfetti(true);
      setTimeout(() => setConfetti(false), 3000);
    }
  }, [allDone, confetti]);

  const bg = isLight ? "#ffffff" : "rgba(15,20,35,0.98)";
  const cardBg = isLight ? "#f8fafc" : "rgba(255,255,255,0.04)";
  const cardBorder = isLight ? "#e2e8f0" : "rgba(255,255,255,0.08)";
  const muted = isLight ? "#64748b" : "rgba(255,255,255,0.5)";
  const primary = isLight ? "#1e293b" : "#EAF1FF";

  // Aha tooltip — shows once on first data load
  if (state.hasData && !ahaShown) {
    return (
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.5)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
        onClick={dismissAha}
      >
        <div style={{
          background: bg, borderRadius: 16, padding: "28px 32px",
          maxWidth: 420, width: "100%",
          border: `1px solid ${cardBorder}`,
          boxShadow: "0 24px 48px rgba(0,0,0,0.3)",
          textAlign: "center",
        }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: primary, marginBottom: 8 }}>
            Your data is here.
          </div>
          <div style={{ fontSize: 13, color: muted, lineHeight: 1.6, marginBottom: 20 }}>
            That's your last few months of revenue. This updates every time you sync with Jobber. Poke around — every tab has something useful.
          </div>
          <button
            onClick={dismissAha}
            className="btn"
            style={{
              padding: "10px 28px", fontSize: 14, fontWeight: 700,
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

  // Tour tooltips
  const tourSteps = [
    {
      title: "Revenue at a glance",
      body: "See exactly what came in, broken down by month. Toggle weekly if you want a tighter view.",
    },
    {
      title: "What needs attention",
      body: "Overdue invoices, stale quotes, unscheduled work — sorted by dollar amount so you fix the big stuff first.",
    },
    {
      title: "Every tab tells a story",
      body: "Sales tracks your quotes. Capacity shows if you're booked enough. Invoices shows who hasn't paid. All from Jobber, zero manual entry.",
    },
  ];

  if (tourStep !== null) {
    const step = tourSteps[tourStep];
    return (
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.5)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}>
        <div style={{
          background: bg, borderRadius: 16, padding: "28px 32px",
          maxWidth: 420, width: "100%",
          border: `1px solid ${cardBorder}`,
          boxShadow: "0 24px 48px rgba(0,0,0,0.3)",
        }}>
          {/* Progress dots */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {tourSteps.map((_, i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: "50%",
                background: i === tourStep ? "#7c5cff" : (isLight ? "#e2e8f0" : "rgba(255,255,255,0.15)"),
                transition: "background 0.2s ease",
              }} />
            ))}
          </div>

          <div style={{ fontSize: 16, fontWeight: 700, color: primary, marginBottom: 8 }}>
            {step.title}
          </div>
          <div style={{ fontSize: 13, color: muted, lineHeight: 1.6, marginBottom: 24 }}>
            {step.body}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              onClick={() => { setTourStep(null); markTourDone(); }}
              style={{
                background: "none", border: "none", color: muted,
                fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "6px 0",
              }}
            >
              Skip
            </button>
            <button
              onClick={() => {
                if (tourStep < tourSteps.length - 1) {
                  setTourStep(tourStep + 1);
                } else {
                  setTourStep(null);
                  markTourDone();
                }
              }}
              className="btn"
              style={{
                padding: "10px 24px", fontSize: 14, fontWeight: 700,
                background: "linear-gradient(135deg, #7c5cff, #5aa6ff)",
                color: "#fff", border: "none", borderRadius: 10,
                cursor: "pointer", boxShadow: "0 4px 12px rgba(124,92,255,0.3)",
              }}
            >
              {tourStep < tourSteps.length - 1 ? "Next" : "Done"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Don't show checklist if dismissed or no data yet
  if (checklistDismissed || !state.hasData) return null;

  const items = [
    { label: "Connect your Jobber account", done: true }, // always done if we're here
    { label: "Check your revenue on the Overview tab", done: revenueViewed },
    { label: "Set your weekly capacity target", done: state.weeklyTargetSet, href: "/jobber/capacity" },
  ];

  const doneCount = items.filter(i => i.done).length;

  // Mobile: floating button when collapsed
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
          cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
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
      {/* Confetti bar */}
      {confetti && (
        <div style={{
          height: 4,
          background: "linear-gradient(90deg, #7c5cff, #5aa6ff, #10b981, #f59e0b, #ef4444)",
          animation: "confetti-slide 1s linear infinite",
        }} />
      )}

      {/* Header */}
      <div style={{
        padding: "14px 16px 10px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        borderBottom: `1px solid ${cardBorder}`,
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: primary }}>
            Get the most out of AccuInsight
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
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 0",
              borderBottom: i < items.length - 1 ? `1px solid ${cardBorder}` : "none",
              opacity: item.done ? 0.6 : 1,
            }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: item.done ? "#10b981" : (isLight ? "#f1f5f9" : "rgba(255,255,255,0.06)"),
              border: item.done ? "none" : `2px solid ${isLight ? "#cbd5e1" : "rgba(255,255,255,0.15)"}`,
              color: "#fff", fontSize: 12, fontWeight: 800,
              transition: "all 0.3s ease",
            }}>
              {item.done && "\u2713"}
            </div>
            {item.href && !item.done ? (
              <a href={item.href} style={{
                fontSize: 13, fontWeight: 600, color: "#5aa6ff",
                textDecoration: item.done ? "line-through" : "none",
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
          </div>
        ))}
      </div>

      {/* Tour link */}
      {!tourDone && (
        <div style={{ padding: "0 16px 12px" }}>
          <button
            onClick={() => setTourStep(0)}
            style={{
              background: "none", border: "none", color: "#5aa6ff",
              fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0,
            }}
          >
            Take a quick tour
          </button>
        </div>
      )}

      {/* All done message */}
      {allDone && (
        <div style={{
          padding: "12px 16px", margin: "0 12px 12px",
          background: isLight ? "rgba(16,185,129,0.06)" : "rgba(16,185,129,0.08)",
          borderRadius: 10,
          border: `1px solid ${isLight ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.15)"}`,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#10b981", marginBottom: 4 }}>
            You're all set.
          </div>
          <div style={{ fontSize: 12, color: muted, marginBottom: 10 }}>
            {state.trialDaysLeft > 0
              ? `Your trial ends in ${state.trialDaysLeft} day${state.trialDaysLeft !== 1 ? "s" : ""}. Upgrade to keep your dashboard.`
              : "Upgrade to keep your dashboard."
            }
          </div>
          <form action="/api/billing/checkout" method="POST">
            <button
              type="submit"
              className="btn"
              style={{
                padding: "8px 20px", fontSize: 12, fontWeight: 700,
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

      {/* Dismiss */}
      {allDone && (
        <div style={{ padding: "0 16px 14px", textAlign: "center" }}>
          <button
            onClick={dismissChecklist}
            style={{
              background: "none", border: "none", color: muted,
              fontSize: 11, cursor: "pointer",
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      <style>{`
        @keyframes confetti-slide {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
      `}</style>
    </div>
  );
}
