"use client";

type ExportCSVProps = {
  data: Record<string, unknown>[];
  filename: string;
  label?: string;
};

export function ExportCSV({ data, filename, label = "Export CSV →" }: ExportCSVProps) {
  function handleExport() {
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
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: "10px 14px",
        borderRadius: 12,
        fontWeight: 1000,
        fontSize: 13,
        textDecoration: "none",
        border: "1px solid rgba(255,255,255,0.16)",
        background: "linear-gradient(135deg, rgba(124,92,255,0.95), rgba(90,166,255,0.95))",
        color: "white",
        boxShadow: "0 18px 48px rgba(90,166,255,0.22)",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}