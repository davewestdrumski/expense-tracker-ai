import { CATEGORIES } from "@/types/expense";
import { resolveColumns } from "../columns";
import type { ExportContext, Exporter } from "../types";

function toDocument(ctx: ExportContext, limit = Infinity) {
  const { options, summary, rows, generatedAt } = ctx;
  const columns = resolveColumns(options.columns);
  const allCategories = options.categories.length === CATEGORIES.length;
  return {
    meta: {
      app: "Spendwise",
      schemaVersion: 1,
      exportedAt: generatedAt.toISOString(),
      currency: "USD",
      filters: {
        startDate: options.startDate || null,
        endDate: options.endDate || null,
        categories: allCategories ? "all" : options.categories,
        keyword: options.search.trim() || null,
      },
      sort: options.sort,
      fields: columns.map((c) => c.key),
    },
    summary: {
      count: summary.count,
      total: summary.total,
      average: summary.average,
      firstDate: summary.firstDate,
      lastDate: summary.lastDate,
      byCategory: Object.fromEntries(summary.byCategory.map((c) => [c.category, { count: c.count, total: c.total }])),
    },
    expenses: rows.slice(0, limit).map((row) => Object.fromEntries(columns.map((c) => [c.key, c.raw(row)]))),
  };
}

export const jsonExporter: Exporter = {
  format: "json",
  label: "JSON",
  tagline: "Structured data with metadata and totals",
  extension: "json",
  mimeType: "application/json",
  build: (ctx) => new Blob([JSON.stringify(toDocument(ctx), null, 2)], { type: "application/json" }),
  preview: (ctx, limit) => {
    const text = JSON.stringify(toDocument(ctx, limit), null, 2);
    return ctx.rows.length > limit ? `${text}\n\n// … ${ctx.rows.length - limit} more expenses in the full file` : text;
  },
};
