# How to export all your data

> **For developers:** [Data Export implementation](../dev/data-export-implementation.md) · **All guides:** [Documentation home](../README.md)

Download every expense you've recorded as a single CSV file in one click. Use it for backups, spreadsheets, or sharing with an accountant.

---

## Export everything

1. Open the **Dashboard**.
2. Click **Export Data** in the top-right corner.

   ![The Export Data button on the Dashboard](../images/data-export/export-data-button.png)

3. Your browser downloads a file named like `expenses-2026-10-16.csv`. Look for it in your **Downloads** folder.

That's it: no options to choose.

## What's in the file

All your expenses, **newest first**, in four columns:

| Date | Category | Amount | Description |
|---|---|---|---|
| 2026-10-15 | Food | 84.20 | Weekly groceries |
| 2026-10-14 | Bills | 65.00 | Internet |

- Amounts are plain numbers, ready for `=SUM()`.
- The file opens in Excel, Google Sheets, Numbers or any text editor.

![The exported file opened in a spreadsheet](../images/data-export/csv-in-spreadsheet.png)

## Export only some expenses

**Export Data** always exports everything. For a filtered export (a single category or a date range), use **Export CSV** on the Expenses page instead. See [How to export to CSV](how-to-csv-export.md).

## Troubleshooting

**The Export Data button is greyed out.**
You don't have any expenses yet, or the page is still loading.

**I clicked it but nothing seems to happen.**
Check your browser's downloads list (usually an icon near the address bar). The app doesn't show a confirmation for this button. If there's no download at all, your browser may be blocking downloads from this site; allow them and try again.

**A description starts with an apostrophe (`'`).**
That's intentional. Descriptions beginning with `=`, `+`, `-` or `@` get an apostrophe so the spreadsheet doesn't treat them as formulas.

## Related guides

- [How to export to CSV](how-to-csv-export.md): filtered exports from the Expenses page
- [How to keep your data safe](how-to-data-persistence.md)
- [How to read your dashboard](how-to-dashboard-analytics.md)

---

### Screenshots needed

| File | What to capture |
|---|---|
| `images/data-export/export-data-button.png` | Dashboard header with **Export Data** highlighted |
| `images/data-export/csv-in-spreadsheet.png` | The exported CSV opened in Excel or Google Sheets |
