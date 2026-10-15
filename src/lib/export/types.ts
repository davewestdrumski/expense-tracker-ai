import type { Category, Expense, SortKey } from "@/types/expense";

export type ExportFormat = "csv" | "json" | "pdf";
export type ExportColumnKey = "date" | "category" | "amount" | "description";

export interface ExportOptions {
  format: ExportFormat;
  startDate: string;
  endDate: string;
  categories: Category[];
  search: string;
  columns: ExportColumnKey[];
  sort: SortKey;
  /** Base filename without extension. Empty means "use the suggested name". */
  filename: string;
}

export interface ExportSummary {
  count: number;
  total: number;
  average: number;
  firstDate: string | null;
  lastDate: string | null;
  byCategory: { category: Category; count: number; total: number }[];
}

/** Everything a format needs to render a file. */
export interface ExportContext {
  options: ExportOptions;
  rows: Expense[];
  summary: ExportSummary;
  generatedAt: Date;
}

export interface Exporter {
  format: ExportFormat;
  label: string;
  tagline: string;
  extension: string;
  mimeType: string;
  build: (ctx: ExportContext) => Blob;
  /** Text preview of the first `limit` rows; formats without a text form omit this. */
  preview?: (ctx: ExportContext, limit: number) => string;
}
