# Data Export (One-Click): Implementation

> **Feature type:** Frontend (client-only, no server)
> **User guide:** [How to export all your data](../user/how-to-data-export.md)
> **Index:** [Documentation home](../README.md)
> **Branch:** `feature-data-export-v1`

An **Export Data** button on the Dashboard downloads *all* expenses as a CSV file in one click. This is the deliberately minimal version. It reuses the existing CSV pipeline from the [Expenses-page CSV Export](csv-export-implementation.md) and adds no new modules.

---

## Architecture

```
Dashboard header (src/app/page.tsx)
  <Button onClick={() => downloadCSV(sortExpenses(expenses, "date-desc"))}>
                             │
src/lib/expenses.ts          ▼
  expensesToCSV(rows) ──► "Date,Category,Amount,Description\r\n…"
  downloadCSV(rows)   ──► Blob("﻿" + csv) ──► <a download> click ──► revoke URL
```

## Files

| File | Change | Role |
|---|---|---|
| `src/app/page.tsx` | +15 / −5 | Adds the **Export Data** button to the `PageHeader` actions |
| `src/lib/expenses.ts` | +2 / −2 | Reorders CSV columns to **Date, Category, Amount, Description** |

No new files and no new dependencies.

## API

Reuses the existing helpers unchanged, apart from the column order:

```ts
sortExpenses(expenses: Expense[], sort: "date-desc"): Expense[];   // newest first, ties by createdAt
expensesToCSV(expenses: Expense[]): string;                         // header + escaped rows, CRLF
downloadCSV(expenses: Expense[], filename = `expenses-${YYYY-MM-DD}.csv`): void;
```

## Implementation notes

- **Scope:** always **every** expense. The Dashboard has no filters, so there's nothing to narrow.
- **Order:** newest first.
- **Button state:** `disabled={isLoading || expenses.length === 0}`. The header renders in the loading, empty and populated states, so the button is always visible but only usable when there's data.
- **Placement:** `variant="secondary"` with a `Download` icon, to the left of the mobile-only **Add expense** button. It's visible at all screen sizes.
- **Shared column order:** both exports call `expensesToCSV`, so the reorder **also changes the Expenses-page CSV**. The two exports produce identically structured files.
- **File format:** UTF-8 with a BOM, CRLF line endings, amounts as `0.00` numbers, formula-injection guard. Details in [CSV Export](csv-export-implementation.md#file-format).

## Error handling

| Case | Behavior |
|---|---|
| No expenses or still loading | Button disabled |
| Browser blocks or fails the download | **Not handled.** No `try/catch` and no toast; the failure is silent (it may log to the console). |
| Success | No in-app feedback; the user sees only the browser's download indicator |

> Improvement: wrap the handler like `handleExport` on the Expenses page (try/catch with a success or error toast).

## Security

Same protections as the Expenses-page export: values starting with `= + - @ \t \r` get a `'` prefix, and commas, quotes and newlines are quoted per RFC 4180. Nothing leaves the device.

## Performance

About 2 ms for 1,000 expenses and ~6 ms for 10,000 (~456 KB), synchronous on the main thread. No bundle-size change to the Dashboard route (110 kB first-load).

## Testing

There are no automated tests yet. Manual checklist:

- [ ] Empty app → **Export Data** is disabled
- [ ] With data → downloads `expenses-<today>.csv`
- [ ] File header is `Date,Category,Amount,Description`
- [ ] Rows are newest first and include **every** expense
- [ ] A description with commas or quotes, and one starting with `=`, open correctly in a spreadsheet
- [ ] The Expenses-page **Export CSV** produces the same column order

## Known limitations

- CSV only; no choice of columns, range or filename.
- No feedback or error handling on the Dashboard path.
- Exports everything; to export a subset, use **Export CSV** on the Expenses page after filtering.

## Related documentation

- [CSV Export (Expenses page)](csv-export-implementation.md): the shared CSV pipeline
- [Dashboard Analytics](dashboard-analytics-implementation.md): the page that hosts the button
- [Data Persistence](data-persistence-implementation.md): why exporting is the only backup
