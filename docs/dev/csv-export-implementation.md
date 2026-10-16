# CSV Export (Expenses page): Implementation

> **Feature type:** Frontend (client-only, no server)
> **User guide:** [How to export to CSV](../user/how-to-csv-export.md)
> **Index:** [Documentation home](../README.md)

The **Export CSV** button on the Expenses page downloads exactly what the page currently shows (filters and sort applied, every page included) as a spreadsheet-safe CSV file.

---

## Architecture

```
/expenses  handleExport()
   │ results (filtered + sorted, ALL rows, not just the visible 50)
   ▼
downloadCSV(results)                     src/lib/expenses.ts
   ├─ expensesToCSV(rows) → string       header + escaped rows, CRLF
   ├─ new Blob(["﻿" + csv], text/csv;charset=utf-8)
   └─ URL.createObjectURL → temporary <a download> → click → revoke
   ▼
toast: "Exported N expenses to CSV"  |  error toast
```

## Files

| File | Role |
|---|---|
| `src/app/expenses/page.tsx` | `handleExport()`: guards, try/catch, toasts; renders the button |
| `src/lib/expenses.ts` | `csvEscape`, `expensesToCSV`, `downloadCSV` |

## API

```ts
expensesToCSV(expenses: Expense[]): string;
downloadCSV(expenses: Expense[], filename = `expenses-${YYYY-MM-DD}.csv`): void;
```

## File format

| Property | Value |
|---|---|
| Columns | `Date, Description, Category, Amount` |
| Date | `YYYY-MM-DD` (sortable, locale-neutral) |
| Amount | Plain number with 2 decimals, no currency symbol (`12.50`), so spreadsheets treat it as numeric |
| Line endings | `\r\n` (RFC 4180) |
| Encoding | UTF-8 with a BOM (`﻿`) so Excel shows accented and non-Latin text correctly |
| Filename | `expenses-<today>.csv` |

## Security: spreadsheet formula injection

A description such as `=HYPERLINK("http://evil","click")` would run as a formula when the CSV is opened in Excel or Sheets. `csvEscape` neutralizes this:

1. If a value starts with `=`, `+`, `-`, `@`, tab or carriage return, it gets a `'` prefix, which spreadsheets treat as "literal text".
2. Values containing `"`, `,` or a newline are wrapped in quotes, with internal quotes doubled.

## Error handling

| Case | Behavior |
|---|---|
| No expenses at all | The button is disabled |
| Filters match nothing | Error toast: "Nothing to export with the current filters" |
| Browser throws during Blob creation or download | Logged with `console.error`; error toast: "Export failed. Please try again." |
| Success | Toast: "Exported N expenses to CSV" |

The object URL is revoked in `setTimeout(…, 0)`. That's reliable in current Chromium and Firefox; if a browser ever cancels downloads, increase the delay.

## Performance

Synchronous string building on the main thread: about 2 ms for 1,000 rows and about 6 ms for 10,000 (≈ 45 bytes per row).

## Testing

There are no automated tests yet. Manual checklist:

- [ ] With a category filter applied, the export contains only that category
- [ ] With more than 50 matches, the file contains **all** of them, not just the visible page
- [ ] A description with a comma and quotes opens correctly in Excel or Sheets
- [ ] A description starting with `=` shows as text, not a formula
- [ ] Accented text (`Café`) displays correctly in Excel

## Known limitations

- CSV only; columns are fixed.
- The filename can't be customized.

> **Branch note:** the three `feature-data-export-*` branches change or replace this feature. See each branch's `docs/dev/data-export-implementation.md`.

## Related documentation

- [Expense Search & Filtering](expense-search-filtering-implementation.md): defines what gets exported
- [Data Persistence](data-persistence-implementation.md): CSV is the only way to get a copy of your data out
