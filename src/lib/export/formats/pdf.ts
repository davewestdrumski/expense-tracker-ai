import { CATEGORIES } from "@/types/expense";
import { CATEGORY_META } from "@/lib/categories";
import { formatCurrency, formatDate, formatMonthKey } from "@/lib/format";
import { describeRange } from "@/lib/expenses";
import { resolveColumns, type ExportColumn } from "../columns";
import { PdfDocument, fitText, textWidth, type PdfPage } from "../pdf-writer";
import type { ExportContext, Exporter } from "../types";

const INK = "#0f172a";
const MUTED = "#64748b";
const RULE = "#e2e8f0";
const BRAND = "#2547eb";
const MARGIN = 48;
const ROW_H = 20;
const FOOTER_H = 36;

/** Fixed widths for short columns; Description takes the remainder. */
const FIXED_WIDTH: Record<string, number> = { date: 88, category: 104, amount: 84 };

function layoutColumns(columns: ExportColumn[], width: number) {
  const fixed = columns.reduce((s, c) => s + (FIXED_WIDTH[c.key] ?? 0), 0);
  const flexCount = columns.filter((c) => !(c.key in FIXED_WIDTH)).length;
  const flex = flexCount ? (width - fixed) / flexCount : 0;
  // With no flexible column, spread leftover space evenly.
  const extra = flexCount ? 0 : (width - fixed) / columns.length;
  let x = MARGIN;
  return columns.map((c) => {
    const w = (FIXED_WIDTH[c.key] ?? flex) + extra;
    const col = { column: c, x, w };
    x += w;
    return col;
  });
}

/** Short span label; the year moves into the tile label so the value fits. */
function dateSpanTile(first: string | null, last: string | null) {
  if (!first || !last) return { label: "DATE SPAN", value: "—" };
  const short = (iso: string) => formatDate(iso).replace(/, \d{4}$/, "");
  const [fy, ly] = [first.slice(0, 4), last.slice(0, 4)];
  if (fy === ly) {
    return { label: `DATE SPAN · ${fy}`, value: first === last ? short(first) : `${short(first)} – ${short(last)}` };
  }
  const monthYear = (iso: string) => formatMonthKey(iso.slice(0, 7), "short") + " " + iso.slice(2, 4);
  return { label: "DATE SPAN", value: `${monthYear(first)} – ${monthYear(last)}` };
}

function buildReport(ctx: ExportContext): PdfDocument {
  const { rows, summary, options, generatedAt } = ctx;
  const doc = new PdfDocument({ title: "Expense Report" });
  const contentW = doc.pageWidth - MARGIN * 2;
  const bottom = doc.pageHeight - MARGIN - FOOTER_H;
  const columns = layoutColumns(resolveColumns(options.columns), contentW);

  let page = doc.addPage();
  let y = MARGIN;

  // ── Header ────────────────────────────────────────────────
  page.rect(0, 0, doc.pageWidth, 6, { fill: BRAND });
  page.text(MARGIN, y, "SPENDWISE", { font: "bold", size: 9, color: BRAND });
  page.text(doc.pageWidth - MARGIN, y, `Generated ${generatedAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`, {
    size: 9,
    color: MUTED,
    align: "right",
  });
  y += 20;
  page.text(MARGIN, y, "Expense Report", { font: "bold", size: 24 });
  y += 34;

  const categoriesLabel =
    options.categories.length === CATEGORIES.length ? "All categories" : options.categories.join(", ");
  const filterLine = [
    `Period: ${describeRange(options.startDate, options.endDate)}`,
    categoriesLabel,
    options.search.trim() ? `Keyword: "${options.search.trim()}"` : null,
  ]
    .filter(Boolean)
    .join("  •  ");
  page.text(MARGIN, y, fitText(filterLine, "regular", 10, contentW), { size: 10, color: MUTED });
  y += 28;

  // ── Summary tiles ─────────────────────────────────────────
  const tiles = [
    { label: "TOTAL SPENT", value: formatCurrency(summary.total) },
    { label: "EXPENSES", value: summary.count.toLocaleString("en-US") },
    { label: "AVERAGE", value: formatCurrency(summary.average) },
    dateSpanTile(summary.firstDate, summary.lastDate),
  ];
  const gap = 10;
  const tileW = (contentW - gap * (tiles.length - 1)) / tiles.length;
  tiles.forEach((t, i) => {
    const x = MARGIN + i * (tileW + gap);
    page.rect(x, y, tileW, 54, { fill: "#f8fafc", stroke: RULE });
    page.text(x + 12, y + 12, t.label, { font: "bold", size: 7.5, color: MUTED });
    // Shrink long values to fit rather than truncating them.
    let size = 15;
    while (size > 10 && textWidth(t.value, "bold", size) > tileW - 24) size -= 0.5;
    page.text(x + 12, y + 27 + (15 - size) / 2, fitText(t.value, "bold", size, tileW - 24), { font: "bold", size });
  });
  y += 54 + 30;

  // ── Category breakdown ────────────────────────────────────
  if (summary.byCategory.length > 0) {
    page.text(MARGIN, y, "Spending by category", { font: "bold", size: 12 });
    y += 22;
    const max = summary.byCategory[0].total;
    const barX = MARGIN + 150;
    const barW = contentW - 150 - 150;
    for (const c of summary.byCategory) {
      const share = summary.total > 0 ? (c.total / summary.total) * 100 : 0;
      page.rect(MARGIN, y + 2, 8, 8, { fill: CATEGORY_META[c.category].color });
      page.text(MARGIN + 16, y, c.category, { size: 10 });
      page.text(MARGIN + 140, y + 1, `${c.count} ${c.count === 1 ? "item" : "items"}`, { size: 8.5, color: MUTED, align: "right" });
      page.rect(barX, y + 3, barW, 6, { fill: "#f1f5f9" });
      page.rect(barX, y + 3, Math.max(2, (c.total / max) * barW), 6, { fill: CATEGORY_META[c.category].color });
      page.text(doc.pageWidth - MARGIN - 50, y, formatCurrency(c.total), { font: "bold", size: 10, align: "right" });
      page.text(doc.pageWidth - MARGIN, y, `${share.toFixed(1)}%`, { size: 9, color: MUTED, align: "right" });
      y += 18;
    }
    y += 22;
  }

  // ── Expense table ─────────────────────────────────────────
  const drawTableHeader = (p: PdfPage, top: number) => {
    p.rect(MARGIN, top, contentW, ROW_H, { fill: "#f1f5f9" });
    for (const { column, x, w } of columns) {
      const tx = column.align === "right" ? x + w - 8 : x + 8;
      p.text(tx, top + 6.5, column.label.toUpperCase(), { font: "bold", size: 7.5, color: MUTED, align: column.align });
    }
    return top + ROW_H;
  };

  page.text(MARGIN, y, "Expenses", { font: "bold", size: 12 });
  y += 22;
  y = drawTableHeader(page, y);

  rows.forEach((row, i) => {
    if (y + ROW_H > bottom) {
      page = doc.addPage();
      page.rect(0, 0, doc.pageWidth, 6, { fill: BRAND });
      page.text(MARGIN, MARGIN, "Expenses (continued)", { font: "bold", size: 12 });
      y = drawTableHeader(page, MARGIN + 22);
    }
    if (i % 2 === 1) page.rect(MARGIN, y, contentW, ROW_H, { fill: "#fafbfc" });
    for (const { column, x, w } of columns) {
      const value = fitText(column.display(row), "regular", 9, w - 16);
      const tx = column.align === "right" ? x + w - 8 : x + 8;
      page.text(tx, y + 6, value, { size: 9, align: column.align, color: column.key === "date" ? MUTED : INK });
    }
    page.line(MARGIN, y + ROW_H, MARGIN + contentW, y + ROW_H, { color: "#f1f5f9" });
    y += ROW_H;
  });

  // Totals row
  if (y + ROW_H + 4 > bottom) {
    page = doc.addPage();
    y = MARGIN;
  }
  page.line(MARGIN, y, MARGIN + contentW, y, { color: INK, width: 1 });
  const amountCol = columns.find((c) => c.column.key === "amount");
  page.text(MARGIN + 8, y + 7, `Total (${summary.count} ${summary.count === 1 ? "expense" : "expenses"})`, { font: "bold", size: 9.5 });
  if (amountCol) {
    page.text(amountCol.x + amountCol.w - 8, y + 7, formatCurrency(summary.total), { font: "bold", size: 9.5, align: "right" });
  }

  // ── Footers (need the final page count) ───────────────────
  doc.pages.forEach((p, i) => {
    const fy = doc.pageHeight - MARGIN - 10;
    p.line(MARGIN, fy - 10, doc.pageWidth - MARGIN, fy - 10, { color: RULE });
    p.text(MARGIN, fy, "Spendwise • Expense Report", { size: 8, color: MUTED });
    p.text(doc.pageWidth - MARGIN, fy, `Page ${i + 1} of ${doc.pages.length}`, { size: 8, color: MUTED, align: "right" });
  });

  return doc;
}

export const pdfExporter: Exporter = {
  format: "pdf",
  label: "PDF",
  tagline: "Formatted report with summary and breakdown",
  extension: "pdf",
  mimeType: "application/pdf",
  build: (ctx) => new Blob([buildReport(ctx).toBytes()], { type: "application/pdf" }),
};
