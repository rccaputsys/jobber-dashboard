"use client";

import { useEffect, useState } from "react";

/** Detects light/dark theme from data-theme attribute on <html>. Reacts to changes. */
export function useIsLight(): boolean {
  const [isLight, setIsLight] = useState(false);
  useEffect(() => {
    const check = () => setIsLight(document.documentElement.getAttribute("data-theme") === "light");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return isLight;
}

/** Returns true when viewport is below 640px. Reacts to resize. */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}
