import { CATEGORIES, type Expense } from "@/types/expense";
import { formatCurrency, formatDate, formatMonthKey, monthKey, toISODate } from "@/lib/format";
import { sortExpenses, sumAmounts, totalsByCategory } from "@/lib/expenses";
import type { ExportArtifact, TemplateId, TemplateParams } from "./types";

export interface TemplateDefinition {
  id: TemplateId;
  name: string;
  description: string;
  audience: string;
  format: "CSV" | "Markdown" | "JSON";
  /** Which parameter scopes the template. */
  scope: "year" | "month" | "rolling" | "all";
  accent: string;
}

export const TEMPLATES: TemplateDefinition[] = [
  {
    id: "tax-report",
    name: "Tax Report",
    description: "Every expense for a tax year, grouped by category with subtotals.",
    audience: "For your accountant",
    format: "CSV",
    scope: "year",
    accent: "#10b981",
  },
  {
    id: "monthly-summary",
    name: "Monthly Summary",
    description: "Totals, month-over-month change, category split and top purchases.",
    audience: "For you or your partner",
    format: "Markdown",
    scope: "month",
    accent: "#2547eb",
  },
  {
    id: "category-analysis",
    name: "Category Analysis",
    description: "Category × month pivot for the last 6 months with averages and share.",
    audience: "For spreadsheets & budgeting",
    format: "CSV",
    scope: "rolling",
    accent: "#a855f7",
  },
  {
    id: "full-backup",
    name: "Full Backup",
    description: "Complete, lossless JSON snapshot you can restore from at any time.",
    audience: "For safekeeping",
    format: "JSON",
    scope: "all",
    accent: "#f97316",
  },
];

export const TEMPLATE_BY_ID = Object.fromEntries(TEMPLATES.map((t) => [t.id, t])) as Record<TemplateId, TemplateDefinition>;

export const BACKUP_SCHEMA = "spendwise-backup";

function csvCell(value: string | number): string {
  if (typeof value === "number") return value.toFixed(2);
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
const csvRow = (cells: (string | number)[]) => cells.map(csvCell).join(",");

function byteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

export function defaultParams(templateId: TemplateId, now = new Date()): TemplateParams {
  switch (TEMPLATE_BY_ID[templateId].scope) {
    case "year":
      return { year: now.getFullYear() };
    case "month":
      return { month: monthKey(toISODate(now)) };
    default:
      return {};
  }
}

export function describeScope(templateId: TemplateId, params: TemplateParams): string {
  switch (TEMPLATE_BY_ID[templateId].scope) {
    case "year":
      return `Tax year ${params.year}`;
    case "month":
      return formatMonthKey(params.month!, "long");
    case "rolling":
      return "Last 6 months";
    case "all":
      return "All expenses";
  }
}

function lastMonths(count: number, now: Date): string[] {
  return Array.from({ length: count }, (_, i) => monthKey(toISODate(new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1))));
}

/** Selects the rows a template covers. */
export function templateRows(templateId: TemplateId, expenses: Expense[], params: TemplateParams, now = new Date()): Expense[] {
  switch (TEMPLATE_BY_ID[templateId].scope) {
    case "year":
      return expenses.filter((e) => e.date.startsWith(`${params.year}-`));
    case "month":
      return expenses.filter((e) => monthKey(e.date) === params.month);
    case "rolling": {
      const months = new Set(lastMonths(6, now));
      return expenses.filter((e) => months.has(monthKey(e.date)));
    }
    case "all":
      return expenses;
  }
}

export function buildArtifact(templateId: TemplateId, expenses: Expense[], params: TemplateParams, now = new Date()): ExportArtifact {
  const rows = sortExpenses(templateRows(templateId, expenses, params, now), "date-asc");
  const scopeLabel = describeScope(templateId, params);
  const stamp = toISODate(now);
  let content: string;
  let filename: string;
  let mimeType: string;

  switch (templateId) {
    case "tax-report": {
      const lines = [
        csvRow([`Spendwise Tax Report — ${params.year}`]),
        csvRow([`Generated ${now.toLocaleString("en-US")}`]),
        "",
        csvRow(["Date", "Category", "Description", "Amount (USD)"]),
      ];
      for (const category of CATEGORIES) {
        const items = rows.filter((e) => e.category === category);
        if (items.length === 0) continue;
        for (const e of items) lines.push(csvRow([e.date, e.category, e.description, e.amount]));
        lines.push(csvRow(["", "", `Subtotal — ${category} (${items.length})`, sumAmounts(items)]));
        lines.push("");
      }
      lines.push(csvRow(["", "", `TOTAL (${rows.length} expenses)`, sumAmounts(rows)]));
      content = "﻿" + lines.join("\r\n");
      filename = `tax-report-${params.year}.csv`;
      mimeType = "text/csv;charset=utf-8";
      break;
    }

    case "monthly-summary": {
      const month = params.month!;
      const [y, m] = month.split("-").map(Number);
      const prevKey = monthKey(toISODate(new Date(y, m - 2, 1)));
      const prevTotal = sumAmounts(expenses.filter((e) => monthKey(e.date) === prevKey));
      const total = sumAmounts(rows);
      const change = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null;
      const daysInMonth = new Date(y, m, 0).getDate();
      const isCurrent = month === monthKey(toISODate(now));
      const days = isCurrent ? now.getDate() : daysInMonth;
      const top = [...rows].sort((a, b) => b.amount - a.amount).slice(0, 5);
      const cats = totalsByCategory(rows);
      const md = [
        `# Monthly Summary — ${formatMonthKey(month, "long")}`,
        "",
        `*Generated by Spendwise on ${formatDate(stamp)}*`,
        "",
        "## At a glance",
        "",
        `- **Total spent:** ${formatCurrency(total)}`,
        `- **Expenses:** ${rows.length}`,
        `- **Daily average:** ${formatCurrency(days ? total / days : 0)}`,
        change === null
          ? `- **vs. ${formatMonthKey(prevKey, "long")}:** no data`
          : `- **vs. ${formatMonthKey(prevKey, "long")}:** ${change >= 0 ? "▲" : "▼"} ${Math.abs(change).toFixed(1)}% (${formatCurrency(prevTotal)})`,
        "",
        "## By category",
        "",
        "| Category | Expenses | Amount | Share |",
        "| --- | ---: | ---: | ---: |",
        ...cats.map((c) => `| ${c.category} | ${c.count} | ${formatCurrency(c.total)} | ${total ? ((c.total / total) * 100).toFixed(1) : "0.0"}% |`),
        "",
        "## Top purchases",
        "",
        ...(top.length
          ? top.map((e, i) => `${i + 1}. **${formatCurrency(e.amount)}** — ${e.description.replace(/[|*_]/g, " ")} (${e.category}, ${formatDate(e.date)})`)
          : ["_No expenses this month._"]),
        "",
      ];
      content = md.join("\n");
      filename = `monthly-summary-${month}.md`;
      mimeType = "text/markdown;charset=utf-8";
      break;
    }

    case "category-analysis": {
      const months = lastMonths(6, now);
      const header = ["Category", ...months.map((k) => formatMonthKey(k)), "Total", "Avg / month", "Share"];
      const grand = sumAmounts(rows);
      const lines = [csvRow(header)];
      for (const category of CATEGORIES) {
        const perMonth = months.map((k) => sumAmounts(rows.filter((e) => e.category === category && monthKey(e.date) === k)));
        const total = sumAmounts(rows.filter((e) => e.category === category));
        lines.push(
          [csvCell(category), ...perMonth.map((v) => v.toFixed(2)), total.toFixed(2), (total / months.length).toFixed(2), `${grand ? ((total / grand) * 100).toFixed(1) : "0.0"}%`].join(","),
        );
      }
      const monthTotals = months.map((k) => sumAmounts(rows.filter((e) => monthKey(e.date) === k)));
      lines.push(["Total", ...monthTotals.map((v) => v.toFixed(2)), grand.toFixed(2), (grand / months.length).toFixed(2), "100.0%"].join(","));
      content = "﻿" + lines.join("\r\n");
      filename = `category-analysis-${stamp}.csv`;
      mimeType = "text/csv;charset=utf-8";
      break;
    }

    case "full-backup": {
      content = JSON.stringify(
        { schema: BACKUP_SCHEMA, schemaVersion: 1, exportedAt: now.toISOString(), count: rows.length, expenses: rows },
        null,
        2,
      );
      filename = `spendwise-backup-${stamp}.json`;
      mimeType = "application/json";
      break;
    }
  }

  return {
    templateId,
    title: TEMPLATE_BY_ID[templateId].name,
    filename,
    mimeType,
    content,
    bytes: byteLength(content),
    recordCount: rows.length,
    rows,
    scopeLabel,
  };
}

/** Tab-separated values: pastes cleanly into Google Sheets, Excel, Notion, or Airtable. */
export function toTSV(rows: Expense[]): string {
  const clean = (s: string) => s.replace(/[\t\r\n]+/g, " ");
  return [["Date", "Category", "Description", "Amount"].join("\t"), ...rows.map((e) => [e.date, e.category, clean(e.description), e.amount.toFixed(2)].join("\t"))].join("\n");
}

/** Short plain-text digest for email bodies. */
export function plainSummary(artifact: ExportArtifact): string {
  const total = sumAmounts(artifact.rows);
  const cats = totalsByCategory(artifact.rows).slice(0, 4);
  return [
    `${artifact.title} — ${artifact.scopeLabel}`,
    `${artifact.recordCount} expenses · ${formatCurrency(total)} total`,
    ...cats.map((c) => `  • ${c.category}: ${formatCurrency(c.total)}`),
  ].join("\n");
}

/** Markdown table of rows — pastes into Notion, GitHub, Obsidian, etc. */
export function toMarkdownTable(rows: Expense[]): string {
  const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ");
  return [
    "| Date | Category | Description | Amount |",
    "| --- | --- | --- | ---: |",
    ...rows.map((e) => `| ${e.date} | ${e.category} | ${esc(e.description)} | ${formatCurrency(e.amount)} |`),
  ].join("\n");
}
