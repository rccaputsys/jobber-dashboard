"use client";
import { useState } from "react";
import { trackEvent } from "./analytics";
import { track } from "@/lib/analytics";

type ExportCSVProps = {
  data: Record<string, unknown>[];
  filename: string;
  label?: string;
};

export function ExportCSV({ data, filename, label = "Export CSV ↗" }: ExportCSVProps) {
  const [isHovered, setIsHovered] = useState(false);

  function handleExport() {
    track("export_clicked", { format: "csv" });
    trackEvent("csv_export", { filename, row_count: data.length });
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header] ?? "";
            const escaped = String(value).replace(/"/g, '""');
            return escaped.includes(",") || escaped.includes("\n") ? `"${escaped}"` : escaped;
          })
          .join(",")
      ),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: "10px 14px",
        borderRadius: 12,
        fontWeight: 700,
        fontSize: 13,
        textDecoration: "none",
        border: "1px solid rgba(255,255,255,0.2)",
        background: isHovered
          ? "linear-gradient(135deg, rgba(140,108,255,1), rgba(106,182,255,1))"
          : "linear-gradient(135deg, rgba(124,92,255,0.95), rgba(90,166,255,0.95))",
        color: "white",
        boxShadow: isHovered
          ? "0 12px 32px rgba(90,166,255,0.35)"
          : "0 8px 24px rgba(90,166,255,0.22)",
        cursor: "pointer",
        transition: "all 0.2s ease",
        transform: isHovered ? "translateY(-2px)" : "translateY(0)",
      }}
    >
      {label}
    </button>
  );
}
