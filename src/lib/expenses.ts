import { CATEGORIES, type Category, type Expense, type ExpenseFilters, type SortKey } from "@/types/expense";
import { formatDate, monthKey, toISODate } from "./format";

export const DEFAULT_FILTERS: ExpenseFilters = {
  search: "",
  category: "All",
  startDate: "",
  endDate: "",
};

export function filterExpenses(expenses: Expense[], filters: ExpenseFilters): Expense[] {
  const query = filters.search.trim().toLowerCase();
  return expenses.filter((e) => {
    if (filters.category !== "All" && e.category !== filters.category) return false;
    if (filters.startDate && e.date < filters.startDate) return false;
    if (filters.endDate && e.date > filters.endDate) return false;
    if (query) {
      const haystack = `${e.description} ${e.category} ${e.amount.toFixed(2)}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export function sortExpenses(expenses: Expense[], sort: SortKey): Expense[] {
  const sorted = [...expenses];
  sorted.sort((a, b) => {
    switch (sort) {
      case "date-asc":
        return a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);
      case "amount-desc":
        return b.amount - a.amount;
      case "amount-asc":
        return a.amount - b.amount;
      case "date-desc":
      default:
        return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
    }
  });
  return sorted;
}

export function sumAmounts(expenses: Expense[]): number {
  return Math.round(expenses.reduce((sum, e) => sum + e.amount, 0) * 100) / 100;
}

export function totalsByCategory(expenses: Expense[]): { category: Category; total: number; count: number }[] {
  return CATEGORIES.map((category) => {
    const items = expenses.filter((e) => e.category === category);
    return { category, total: sumAmounts(items), count: items.length };
  })
    .filter((c) => c.count > 0)
    .sort((a, b) => b.total - a.total);
}

/** Totals for the last `months` calendar months, oldest first, including empty months. */
export function monthlyTotals(expenses: Expense[], months = 6, now = new Date()): { key: string; total: number }[] {
  const result: { key: string; total: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = toISODate(d).slice(0, 7);
    result.push({ key, total: sumAmounts(expenses.filter((e) => monthKey(e.date) === key)) });
  }
  return result;
}

function csvEscape(value: string): string {
  // Guard against CSV/formula injection when opened in spreadsheet apps.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function expensesToCSV(expenses: Expense[]): string {
  const header = ["Date", "Category", "Amount", "Description"];
  const rows = expenses.map((e) =>
    [e.date, e.category, e.amount.toFixed(2), csvEscape(e.description)].join(","),
  );
  return [header.join(","), ...rows].join("\r\n");
}

export function downloadCSV(expenses: Expense[], filename = `expenses-${toISODate(new Date())}.csv`): void {
  // Prepend BOM so Excel detects UTF-8 correctly.
  const blob = new Blob(["﻿" + expensesToCSV(expenses)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function describeRange(start: string, end: string): string {
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`;
  if (start) return `From ${formatDate(start)}`;
  if (end) return `Until ${formatDate(end)}`;
  return "All time";
}
