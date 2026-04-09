"use client";

import { useEffect, useState, useCallback } from "react";

export type CapacityMeasure = "dollars" | "jobs";

const MEASURE_KEY = "accuinsight_capacity_measure";
const JOBS_TARGET_KEY = "accuinsight_capacity_weekly_jobs_target";
const CHANGE_EVENT = "accuinsight:capacity-measure-changed";

function readMeasure(): CapacityMeasure {
  if (typeof window === "undefined") return "dollars";
  try {
    const v = localStorage.getItem(MEASURE_KEY);
    return v === "jobs" ? "jobs" : "dollars";
  } catch {
    return "dollars";
  }
}

function readJobsTarget(): number {
  if (typeof window === "undefined") return 0;
  try {
    const v = localStorage.getItem(JOBS_TARGET_KEY);
    if (!v) return 0;
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

/**
 * Capacity measure preference (dollars vs job count) plus the weekly job
 * target, persisted to localStorage. When either changes, fires a custom
 * window event so any other component using this hook re-reads in sync.
 *
 * Why localStorage instead of a DB column: zero migration risk and the
 * setting is naturally per-device. Easy to promote to a Supabase column
 * later if cross-device sync becomes a need.
 */
export function useCapacityMeasure() {
  const [measure, setMeasureState] = useState<CapacityMeasure>("dollars");
  const [weeklyJobsTarget, setWeeklyJobsTargetState] = useState<number>(0);

  // Initial read on mount
  useEffect(() => {
    setMeasureState(readMeasure());
    setWeeklyJobsTargetState(readJobsTarget());
  }, []);

  // Subscribe to cross-component changes
  useEffect(() => {
    const refresh = () => {
      setMeasureState(readMeasure());
      setWeeklyJobsTargetState(readJobsTarget());
    };
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const setMeasure = useCallback((next: CapacityMeasure) => {
    try { localStorage.setItem(MEASURE_KEY, next); } catch {}
    setMeasureState(next);
    try { window.dispatchEvent(new CustomEvent(CHANGE_EVENT)); } catch {}
  }, []);

  const setWeeklyJobsTarget = useCallback((next: number) => {
    const clean = Number.isFinite(next) && next > 0 ? Math.round(next) : 0;
    try { localStorage.setItem(JOBS_TARGET_KEY, String(clean)); } catch {}
    setWeeklyJobsTargetState(clean);
    try { window.dispatchEvent(new CustomEvent(CHANGE_EVENT)); } catch {}
  }, []);

  return { measure, setMeasure, weeklyJobsTarget, setWeeklyJobsTarget };
}
