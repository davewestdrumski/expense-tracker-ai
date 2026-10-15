import { CATEGORIES, type Expense } from "@/types/expense";
import { filterExpenses, sortExpenses, sumAmounts, totalsByCategory } from "@/lib/expenses";
import type { ExportOptions, ExportSummary } from "./types";

/** Applies the export's date, category, and keyword filters, then sorts. */
export function selectExpenses(expenses: Expense[], options: ExportOptions): Expense[] {
  const allowed = new Set(options.categories);
  const filtered = filterExpenses(expenses, {
    search: options.search,
    category: "All",
    startDate: options.startDate,
    endDate: options.endDate,
  }).filter((e) => allowed.has(e.category));
  return sortExpenses(filtered, options.sort);
}

export function summarize(rows: Expense[]): ExportSummary {
  const total = sumAmounts(rows);
  let first: string | null = null;
  let last: string | null = null;
  for (const e of rows) {
    if (first === null || e.date < first) first = e.date;
    if (last === null || e.date > last) last = e.date;
  }
  return {
    count: rows.length,
    total,
    average: rows.length ? Math.round((total / rows.length) * 100) / 100 : 0,
    firstDate: first,
    lastDate: last,
    byCategory: totalsByCategory(rows),
  };
}

/** Per-category counts within the date range and keyword, ignoring the category selection. */
export function categoryCounts(expenses: Expense[], options: ExportOptions): Record<string, number> {
  const inRange = selectExpenses(expenses, { ...options, categories: [...CATEGORIES] });
  const counts: Record<string, number> = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
  for (const e of inRange) counts[e.category]++;
  return counts;
}
