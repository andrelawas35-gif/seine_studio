function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCsvRow(values: string[]): string {
  return values
    .map((v) => {
      const s = String(v ?? "");
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    })
    .join(",");
}

export function exportCsv<T extends object>(
  data: T[],
  columns: Array<{ key: keyof T; label: string }>,
  filename: string,
) {
  const header = toCsvRow(columns.map((c) => c.label));
  const rows = data.map((row) =>
    toCsvRow(columns.map((c) => String(row[c.key] ?? ""))),
  );
  downloadFile([header, ...rows].join("\n"), filename, "text/csv;charset=utf-8");
}

export function exportJson<T>(data: T[], filename: string) {
  downloadFile(JSON.stringify(data, null, 2), filename, "application/json;charset=utf-8");
}

export const timestamp = () => new Date().toISOString().slice(0, 10);
