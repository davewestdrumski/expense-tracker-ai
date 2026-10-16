# Data Export (Advanced Dialog): Implementation

> **Feature type:** Frontend (client-only, no server)
> **User guide:** [How to export your expenses](../user/how-to-data-export.md)
> **Index:** [Documentation home](../README.md)
> **Branch:** `feature-data-export-v2`. This feature replaces `main`'s one-button CSV export on the Expenses page.

A modal export dialog with three formats (**CSV, JSON, PDF**), date-range, category, keyword and column filters, sort order, a custom filename, and a live preview built from the same code that writes the file. The PDF is produced by a small dependency-free PDF 1.4 writer.

---

## Overview

| Entry point | Opens the dialog with |
|---|---|
| Dashboard header **Export…** | Default options: CSV, all time, all categories, all columns, newest first |
| Expenses page header **Export…** | The page's current **date range, category, search text and sort** |

Both buttons are disabled while data loads and when there are no expenses.

## Architecture

```
┌─────────────── UI (src/components/export) ────────────────┐
│ ExportDialog ── owns ExportOptions, validation, footer    │
│  ├─ ExportOptionsPanel  (controlled form)                 │
│  └─ ExportPreview       (stats + "Data" / "<fmt> preview")│
└──────────────┬────────────────────────────────────────────┘
               │ ExportContext { options, rows, summary, generatedAt }
┌──────────────▼──── Orchestration (src/hooks/useExport.ts) ┐
│ idle → working → success | error                         │
│ EXPORTERS[format].build(ctx) → Blob → saveBlob()          │
└──────────────┬────────────────────────────────────────────┘
┌──────────────▼──────── Engine (src/lib/export) ───────────┐
│ select.ts    selectExpenses · summarize · categoryCounts  │
│ columns.ts   EXPORT_COLUMNS (raw vs display values)       │
│ registry.ts  EXPORTERS: Record<ExportFormat, Exporter>    │
│   formats/csv.ts · formats/json.ts · formats/pdf.ts       │
│ pdf-writer.ts  PdfDocument / PdfPage (PDF 1.4)            │
│ filename.ts  sanitize · suggest · validate                │
│ download.ts  saveBlob · formatBytes                       │
└───────────────────────────────────────────────────────────┘
```

Dependencies point **downward only**. Everything in `src/lib/export` is pure TypeScript with no React, so it can be unit-tested or run in a worker.

**Opening the dialog:** `useExpenseActions().openExport(preset?)` in `src/components/Providers.tsx` stores `{ open, preset, key }`. The dialog is mounted only while open, and gets a new `key` each time, so its state never carries over between sessions.

## Files

| File | Role |
|---|---|
| `src/lib/export/types.ts` | `ExportFormat`, `ExportColumnKey`, `ExportOptions`, `ExportSummary`, `ExportContext`, `Exporter` |
| `src/lib/export/columns.ts` | Column definitions; `resolveColumns()` returns them in fixed order |
| `src/lib/export/select.ts` | Filtering and sorting for the export, summary stats, per-category counts |
| `src/lib/export/registry.ts` | `EXPORTERS` map and `EXPORT_FORMATS` list |
| `src/lib/export/formats/csv.ts` | CSV exporter (`build` + `preview`) |
| `src/lib/export/formats/json.ts` | JSON exporter (`build` + `preview`) |
| `src/lib/export/formats/pdf.ts` | PDF report layout (`build` only) |
| `src/lib/export/pdf-writer.ts` | Minimal PDF writer: fonts, text measuring and fitting, drawing commands, file assembly |
| `src/lib/export/filename.ts` | `sanitizeFilename`, `suggestFilename`, `validateFilename` |
| `src/lib/export/download.ts` | `saveBlob`, `formatBytes` |
| `src/hooks/useExport.ts` | Export lifecycle state machine |
| `src/components/export/ExportDialog.tsx` | Options state, derived data, validation, footer, success screen; `DEFAULT_EXPORT_OPTIONS` |
| `src/components/export/ExportOptionsPanel.tsx` | Format cards, date presets and inputs, category grid, keyword, column chips, sort, filename |
| `src/components/export/ExportPreview.tsx` | Summary stats, category share bar, data table, raw text preview, PDF page mock-up |
| `src/lib/date-ranges.ts` | `DATE_PRESETS`, `presetRange`, `matchPreset` (shared with `ExpenseFiltersBar`) |
| `src/components/Modal.tsx` | Gained `size="xl"` (`sm:max-w-5xl`) and a pinned `footer` slot; the body scrolls independently |
| `src/components/Providers.tsx` | `openExport(preset?)` and the dialog host |
| `src/app/page.tsx`, `src/app/expenses/page.tsx` | **Export…** buttons |
| `src/lib/expenses.ts` | Old `csvEscape`, `expensesToCSV` and `downloadCSV` **removed** |

## API

### Core types (`src/lib/export/types.ts`)

```ts
type ExportFormat = "csv" | "json" | "pdf";
type ExportColumnKey = "date" | "category" | "amount" | "description";

interface ExportOptions {
  format: ExportFormat;
  startDate: string;          // "" = open-ended
  endDate: string;
  categories: Category[];     // [] is invalid
  search: string;             // same matching as the Expenses page
  columns: ExportColumnKey[]; // [] is invalid
  sort: SortKey;
  filename: string;           // base name; "" = use the suggestion
}

interface ExportContext {
  options: ExportOptions;
  rows: Expense[];            // already filtered + sorted
  summary: ExportSummary;     // count, total, average, firstDate, lastDate, byCategory
  generatedAt: Date;
}

interface Exporter {
  format: ExportFormat;
  label: string;              // "CSV"
  tagline: string;            // shown under the format cards
  extension: string;          // "csv"
  mimeType: string;
  build: (ctx: ExportContext) => Blob;
  preview?: (ctx: ExportContext, limit: number) => string;   // omitted for binary formats
}
```

### Opening the dialog

```ts
const { openExport } = useExpenseActions();
openExport();                                         // defaults
openExport({ categories: ["Food"], format: "pdf" });  // any Partial<ExportOptions>
```

### `useExport()`

```ts
const { status, run, reset } = useExport();
type ExportStatus =
  | { state: "idle" }
  | { state: "working"; format }
  | { state: "success"; format; filename; bytes; count }
  | { state: "error"; message };

run(ctx, baseFilename): Promise<success-status | null>;
```

## Implementation notes

### Selection (`select.ts`)

- `selectExpenses` reuses `filterExpenses` (date range and keyword) with `category: "All"`, then applies the **multi-category** set, then `sortExpenses`.
- `summarize` returns count, total (rounded to cents), average, first and last date, and `totalsByCategory`.
- `categoryCounts` counts each category **within the current date range and keyword, ignoring the category selection**, so unchecked categories still show how many rows they'd add.

### Columns (`columns.ts`)

Each column has two values:

| Column | `raw` (CSV/JSON) | `display` (preview/PDF) | Align |
|---|---|---|---|
| Date | `2026-10-15` | `Oct 15, 2026` | left |
| Category | `Food` | `Food` | left |
| Amount | `12.5` (number) | `$12.50` | right |
| Description | text | text | left |

`resolveColumns(keys)` always returns columns in the order Date, Category, Amount, Description, regardless of the order the user ticked them.

### Formats

| Format | Output |
|---|---|
| **CSV** | Header of column labels; numbers written with 2 decimals; RFC 4180 quoting; cells starting with `= + - @ \t \r` get a `'` prefix (formula-injection guard); CRLF line endings; UTF-8 **BOM** |
| **JSON** | Pretty-printed `{ meta, summary, expenses }`. `meta` holds `app`, `schemaVersion: 1`, `exportedAt`, `currency: "USD"`, `filters` (`startDate`/`endDate`/`keyword` or `null`; `categories` is `"all"` or an array), `sort` and `fields`. `summary.byCategory` is keyed by category. Each expense contains only the selected fields, using raw values. |
| **PDF** | US Letter report (see below) |

### PDF writer (`pdf-writer.ts`)

- PDF 1.4 using the two **standard fonts** (Helvetica and Helvetica-Bold) with `WinAnsiEncoding`, so no fonts are embedded.
- `textWidth()` uses the standard Helvetica character widths for ASCII 32–126, plus a table for the typographic characters the report uses (`– — ' ' " " • … €`).
- `fitText()` binary-searches the longest prefix that fits a width with a trailing `…`.
- The API uses **top-left coordinates**; the writer flips them to PDF's bottom-left origin.
- `toBytes()` assembles the catalog, page tree, two fonts, document info, then a content stream and page object per page, and the cross-reference index. Every character is one byte (WinAnsi), so string length equals byte offset.
- Text is escaped (`\`, `(`, `)`) and converted to WinAnsi before writing, so user text can't inject PDF commands.

### PDF report layout (`formats/pdf.ts`)

US Letter (612 × 792 pt), 48 pt margins, 20 pt rows, a 36 pt footer band.

1. **Header:** a blue bar across the top, **SPENDWISE**, "Generated <date, time>" on the right, the **Expense Report** title, and a filter line ("Period: … • categories • Keyword: "…"").
2. **Summary tiles:** TOTAL SPENT, EXPENSES, AVERAGE, DATE SPAN. When the span falls within one year, the year moves into the label (`DATE SPAN · 2026`). Values shrink from 15 pt to 10 pt to fit before falling back to an ellipsis.
3. **Spending by category:** a color square, the name, "N items", a bar scaled to the largest category, the amount, and the share %.
4. **Expenses table:** column widths are fixed for Date (88), Category (104) and Amount (84), and Description takes the rest; with no Description column, the leftover width is shared evenly. Rows are striped, cells are truncated to fit, and the header row repeats under **"Expenses (continued)"** on each new page.
5. **Totals row:** "Total (N expenses)" plus the amount (when the Amount column is included). It moves to a new page if it doesn't fit.
6. **Footers:** drawn after layout, once the page count is known: "Spendwise • Expense Report" and "Page X of Y".

### Filenames (`filename.ts`)

| Rule | Example |
|---|---|
| Strip a trailing `.csv`/`.json`/`.pdf` | `report.csv` → `report` |
| Replace `\ / : * ? " < > \|` and control characters with `-` | `my:report/"Q3"` → `my-report-Q3` |
| Collapse whitespace; trim leading/trailing dots, spaces and dashes; cap at **80** characters | |
| Suggested name | `expenses[-<cats>]-<start>_to_<end>` or `expenses-<today>`. `<cats>` lists 1–2 categories in lowercase, or `N-categories` when 3–5 are selected. |

An empty filename field means "use the suggestion" and is valid. The extension comes from the format and is shown next to the input.

### Lifecycle (`useExport.run`)

1. Ignore the call if an export is already running (`running` ref).
2. `status = working`; wait one animation frame so the spinner can paint before the synchronous build starts.
3. `build(ctx)` → Blob.
4. Keep the spinner up for at least **450 ms** (`MIN_WORKING_MS`) so it doesn't just flash.
5. `saveBlob()`: temporary `<a download>`, then revoke the object URL after 1 s.
6. `status = success` (filename, bytes, count) → success screen and a toast: "Exported N expenses as CSV".

The dialog **can't be closed** (Escape, backdrop or Cancel) while working.

## Validation and error handling

| Condition | Message / behavior |
|---|---|
| Start date after end date | "Start date is after the end date." (date inputs outlined red) |
| No categories selected | "Select at least one category." |
| No columns selected | "Select at least one column." |
| Filename has only invalid characters | "Filename has no valid characters." |
| Filename longer than 80 characters | "Keep the filename under 80 characters." |
| Zero matching rows | Preview shows "Nothing to export"; footer: "No records match — adjust your filters." |
| Any of the above | **Export** button disabled |
| `build` or `saveBlob` throws | Footer error: "Couldn't generate the <FORMAT> file. Please try again." It clears on the next option change. |

## Preview (`ExportPreview.tsx`)

- **Stats:** Records, Total, Average, and Span in days (hover for the exact dates), plus a category share bar with a legend.
- **Data tab:** the first **50** rows using the selected columns, with "Showing first 50 of N".
- **`<Format> preview` tab:**
  - CSV and JSON: the real `preview()` output for the first **8** rows. JSON adds "// … N more expenses in the full file".
  - PDF: an HTML mock-up of the first page (header, tiles, category bars, first 14 rows).

## Performance

Measured with synthetic data on Node 24:

| Rows | Preview recompute | CSV | JSON | PDF |
|---|---|---|---|---|
| 1,000 | 2 ms | 1.8 ms / 45 KB | 1.0 ms / 133 KB | **57 ms** / 358 KB / 34 pages |
| 10,000 | 4 ms | 8.8 ms / 446 KB | 6.7 ms / 1.3 MB | **472 ms** / 3.5 MB / 334 pages |

- Everything runs on the **main thread**. A 10k-row PDF freezes the UI for about half a second (the spinner is painted first).
- PDF content isn't compressed (no `/FlateDecode`), so files are about 3–5× bigger than necessary.
- The preview recomputes on every keystroke in the keyword box (no debounce). That's fine up to around 10k rows.
- Bundle cost: about +10 kB first-load JS on the dashboard; no runtime dependencies.

## Extending: adding a format

1. Create `src/lib/export/formats/<name>.ts` that exports an `Exporter`. Use `resolveColumns(ctx.options.columns)` and `col.raw` or `col.display`.
2. Add `"<name>"` to `ExportFormat` in `types.ts`.
3. Register it in `EXPORTERS` (`registry.ts`).
4. Add an icon to `FORMAT_ICONS` in `ExportOptionsPanel.tsx`.

If you provide `preview`, the "<Format> preview" tab uses it automatically; otherwise add a mock-up like `PdfMock`. No other UI changes are needed.

## Testing

There are no automated tests in this branch. The engine is pure and well suited to them. Manual checklist:

- [ ] Dashboard **Export…** opens with defaults; Expenses **Export…** carries over category, dates, search and sort
- [ ] Each date preset sets the right range; **All time** clears it
- [ ] **None** for categories → error and disabled button; per-category counts follow the date range
- [ ] Ticking columns out of order still outputs Date, Category, Amount, Description
- [ ] Filename `my:report/"Q3".csv` downloads as `my-report-Q3.<ext>`
- [ ] CSV: a description starting with `=` is prefixed with `'`; commas and quotes survive Excel
- [ ] JSON: `meta.filters.categories` is `"all"` when every category is selected
- [ ] PDF: more than 30 rows paginate with repeated headers, a totals row and "Page X of Y"
- [ ] Spinner shows "Generating PDF…"; Escape is ignored while working; the success screen shows file size

## Known limitations

- **PDF text is WinAnsi-only:** characters outside Latin-1 (e.g. Japanese, emoji) are replaced with `?` **without a warning**. Accented Latin letters work. CSV and JSON keep everything.
- PDF generation is synchronous on the main thread and uncompressed (see Performance).
- `Modal` has **no focus trap**, so Tab can reach the page behind the dialog.
- Export options aren't remembered between sessions.
- No amount-range filter; no grouping or subtotals in CSV.

## Related documentation

- [Expense Search & Filtering](expense-search-filtering-implementation.md): the filters the Expenses page passes into the dialog
- [Data Persistence](data-persistence-implementation.md): exports are the only way to get data out of the browser
- [Dashboard Analytics](dashboard-analytics-implementation.md): the PDF uses the same category palette
