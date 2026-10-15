import type { Expense } from "@/types/expense";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ExportColumnKey } from "./types";

export interface ExportColumn {
  key: ExportColumnKey;
  label: string;
  align: "left" | "right";
  /** Machine-readable value (CSV / JSON). */
  raw: (e: Expense) => string | number;
  /** Human-readable value (preview / PDF). */
  display: (e: Expense) => string;
}

export const EXPORT_COLUMNS: ExportColumn[] = [
  { key: "date", label: "Date", align: "left", raw: (e) => e.date, display: (e) => formatDate(e.date) },
  { key: "category", label: "Category", align: "left", raw: (e) => e.category, display: (e) => e.category },
  { key: "amount", label: "Amount", align: "right", raw: (e) => e.amount, display: (e) => formatCurrency(e.amount) },
  { key: "description", label: "Description", align: "left", raw: (e) => e.description, display: (e) => e.description },
];

export const ALL_COLUMN_KEYS = EXPORT_COLUMNS.map((c) => c.key);

/** Selected columns in canonical order. */
export function resolveColumns(keys: ExportColumnKey[]): ExportColumn[] {
  return EXPORT_COLUMNS.filter((c) => keys.includes(c.key));
}
