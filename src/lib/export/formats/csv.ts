import { resolveColumns } from "../columns";
import type { ExportContext, Exporter } from "../types";

function escapeCell(value: string | number): string {
  if (typeof value === "number") return value.toFixed(2);
  // Neutralise spreadsheet formula injection (=, +, -, @ prefixes).
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function toCSV(ctx: ExportContext, limit = Infinity): string {
  const columns = resolveColumns(ctx.options.columns);
  const lines = [columns.map((c) => c.label).join(",")];
  for (const row of ctx.rows.slice(0, limit)) {
    lines.push(columns.map((c) => escapeCell(c.raw(row))).join(","));
  }
  return lines.join("\r\n");
}

export const csvExporter: Exporter = {
  format: "csv",
  label: "CSV",
  tagline: "Opens in Excel, Numbers, or Google Sheets",
  extension: "csv",
  mimeType: "text/csv;charset=utf-8",
  // BOM so Excel detects UTF-8.
  build: (ctx) => new Blob(["﻿" + toCSV(ctx)], { type: "text/csv;charset=utf-8" }),
  preview: (ctx, limit) => toCSV(ctx, limit),
};
