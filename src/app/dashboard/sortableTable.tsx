"use client";
import React, { useState } from "react";

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface SortConfig {
  key: string;
  direction: "asc" | "desc";
}

type SortState = SortConfig;

interface SortableTableProps {
  data: any[];
  columns: Column[];
  defaultSort: SortConfig;
  exportFilename: string;
  theme: any;
  money: (cents: number) => string;
  ui: any;
}

export function SortableTable({
  data,
  columns,
  defaultSort,
  exportFilename,
  theme,
  money,
  ui,
}: SortableTableProps) {
  const [sortConfig, setSortConfig] = useState<SortState>(defaultSort);

  const sortedData = React.useMemo(() => {
    const sorted = [...data];
    
    sorted.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      const comparison = aVal < bVal ? -1 : 1;
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [data, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key, direction: "desc" };
    });
  };

  const handleExport = () => {
    const csvData = sortedData.map((row) => {
      const csvRow: any = {};
      columns.forEach((col) => {
        let value = row[col.key];
        
        // Convert cents to dollars for export
        if (col.key.includes("cents") || col.key.includes("amount")) {
          value = (Number(value) || 0) / 100;
        }
        
        csvRow[col.label] = value ?? "";
      });
      return csvRow;
    });

    downloadCSV(csvData, exportFilename);
  };

  return (
    <div>
      <div style={{ marginBottom: 12, textAlign: "right" }}>
        <button
          onClick={handleExport}
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            fontWeight: 950,
            fontSize: 12,
            border: "1px solid rgba(255,255,255,0.16)",
            background:
              "linear-gradient(135deg, rgba(124,92,255,0.95), rgba(90,166,255,0.95))",
            color: "white",
            cursor: "pointer",
            boxShadow: "0 18px 48px rgba(90,166,255,0.22)",
          }}
        >
          Export CSV →
        </button>
      </div>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
          tableLayout: "fixed",
        }}
      >
        <colgroup>
          <col style={{ width: "96px" }} />
          <col style={{ width: "auto" }} />
          <col style={{ width: "140px" }} />
          <col style={{ width: "140px" }} />
          <col style={{ width: "190px" }} />
        </colgroup>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                style={{
                  textAlign: "left",
                  padding: "12px 10px",
                  color: theme.mut,
                  fontWeight: 1000,
                  borderBottom: "1px solid rgba(255,255,255,0.10)",
                  fontSize: 12,
                  cursor: "pointer",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {col.label}{" "}
                {sortConfig.key === col.key && (
                  <span>{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, idx) => (
            <tr
              key={idx}
              style={{
                background:
                  idx % 2 === 1 ? "rgba(255,255,255,0.012)" : "transparent",
              }}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  style={{
                    padding: "12px 10px",
                    borderBottom: "1px solid rgba(255,255,255,0.07)",
                    verticalAlign: "top",
                  }}
                >
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function downloadCSV(data: any[], filename: string) {
  if (!data.length) return;

  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((header) => {
        const value = row[header] ?? "";
        const str = String(value);
        const escaped = str.replace(/"/g, '""');
        return escaped.includes(",") ? `"${escaped}"` : escaped;
      })
      .join(",")
  );

  const csvContent = [headers.join(","), ...rows].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
