"use client";

import { useEffect, useState, useCallback } from "react";

export type CapacityMeasure = "jobs";

const JOBS_TARGET_KEY = "accuinsight_capacity_weekly_jobs_target";
const CHANGE_EVENT = "accuinsight:capacity-measure-changed";

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

export function useCapacityMeasure() {
  const measure: CapacityMeasure = "jobs";
  const [weeklyJobsTarget, setWeeklyJobsTargetState] = useState<number>(0);

  useEffect(() => {
    setWeeklyJobsTargetState(readJobsTarget());
  }, []);

  useEffect(() => {
    const refresh = () => setWeeklyJobsTargetState(readJobsTarget());
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const setMeasure = useCallback((_next: CapacityMeasure) => {}, []);

  const setWeeklyJobsTarget = useCallback((next: number) => {
    const clean = Number.isFinite(next) && next > 0 ? Math.round(next) : 0;
    try { localStorage.setItem(JOBS_TARGET_KEY, String(clean)); } catch {}
    setWeeklyJobsTargetState(clean);
    try { window.dispatchEvent(new CustomEvent(CHANGE_EVENT)); } catch {}
  }, []);

  return { measure, setMeasure, weeklyJobsTarget, setWeeklyJobsTarget };
}
