"use client";

import { useIsLight } from "@/lib/hooks";

type Props = {
  text: string;
  color?: string;
};

export function InsightTip({ text, color }: Props) {
  const isLight = useIsLight();
  const c = color || (isLight ? "#94a3b8" : "rgba(255,255,255,0.3)");

  return (
    <div style={{
      marginTop: 4, fontSize: 10, fontWeight: 500, fontStyle: "italic",
      color: c, lineHeight: 1.4, opacity: 0.8,
    }}>
      {text}
    </div>
  );
}
