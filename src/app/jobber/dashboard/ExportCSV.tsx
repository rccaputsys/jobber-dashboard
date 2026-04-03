"use client";
import { useState } from "react";
import { trackEvent } from "./analytics";
import { track } from "@/lib/analytics";

type ExportCSVProps = {
  data: Record<string, unknown>[];
  filename: string;
  label?: string;
};

export function ExportCSV({ data, filename, label = "Download" }: ExportCSVProps) {
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
      className="btn"
      style={{
        padding: "4px 10px",
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
