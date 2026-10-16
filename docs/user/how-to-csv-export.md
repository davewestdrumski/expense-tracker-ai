# How to export to CSV

> **For developers:** [CSV Export implementation](../dev/csv-export-implementation.md) · **All guides:** [Documentation home](../README.md)

Download your expenses as a CSV file you can open in Excel, Google Sheets or Numbers, or keep as a backup.

---

## Export everything

1. Open the **Expenses** page.
2. Make sure no filters are applied. If you see **Clear filters**, click it.
3. Click **Export CSV** in the top-right corner.

   ![The Export CSV button on the Expenses page](../images/csv-export/export-button.png)

4. Your browser downloads a file named like `expenses-2026-10-16.csv`, and a confirmation appears.

## Export only some expenses

The export contains **exactly what the list shows**, so filter first:

1. Search, pick a category or set a date range. See [How to search and filter expenses](how-to-expense-search-filtering.md).
2. Choose the sort order you want in the file.
3. Click **Export CSV**.

> All matching expenses are included, even ones you haven't loaded with **Show more**.

![Filtered list ready to export](../images/csv-export/filtered-export.png)

## What's in the file

| Date | Category | Amount | Description |
|---|---|---|---|
| 2026-10-15 | Food | 84.20 | Weekly groceries |
| 2026-10-14 | Bills | 65.00 | Internet |

Amounts are plain numbers, so you can total them with `=SUM()` straight away.

## Troubleshooting

**"Nothing to export with the current filters".**
Your filters match no expenses. Clear or widen them.

**The Export CSV button is greyed out.**
You don't have any expenses yet.

**Special characters look wrong in Excel.**
Open the file with **File → Open** rather than double-clicking it. The file is UTF-8 and Excel usually detects this automatically.

**A description starts with an apostrophe (`'`).**
That's intentional. Descriptions beginning with `=`, `+`, `-` or `@` get an apostrophe so the spreadsheet doesn't treat them as formulas.

> **Just want everything?** Click **Export Data** on the Dashboard. See [How to export all your data](how-to-data-export.md).

## Related guides

- [How to export all your data](how-to-data-export.md)
- [How to search and filter expenses](how-to-expense-search-filtering.md)
- [How to keep your data safe](how-to-data-persistence.md)

---

### Screenshots needed

| File | What to capture |
|---|---|
| `images/csv-export/export-button.png` | Expenses page header with **Export CSV** highlighted |
| `images/csv-export/filtered-export.png` | Expenses page with a category and date filter applied, results bar visible |
