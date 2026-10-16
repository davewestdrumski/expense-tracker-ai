# How to export your expenses

> **For developers:** [Data Export implementation](../dev/data-export-implementation.md) · **All guides:** [Documentation home](../README.md)

Download your expenses as a **spreadsheet (CSV)**, **data file (JSON)** or **PDF report**. Choose exactly which expenses and columns to include, and preview the result before you download.

---

## Open the export window

You can start from two places:

| Where | Click | What's pre-selected |
|---|---|---|
| **Dashboard** | **Export…** (top right) | Everything: all dates, all categories |
| **Expenses** page | **Export…** (top right) | Whatever you're currently viewing: your search, category, dates and sort order |

![The Export… button on the Dashboard](../images/data-export/export-button.png)

The window has your **options on the left** and a **live preview on the right**.

![The export window with options and preview](../images/data-export/export-dialog.png)

## Step 1: Choose a format

| Format | Best for |
|---|---|
| **CSV** | Opening in Excel, Numbers or Google Sheets |
| **JSON** | Developers, other apps, or a complete data copy with totals |
| **PDF** | A ready-to-share report with totals, a category breakdown and a table |

## Step 2: Pick a date range

- Click a quick range: **All time**, **This month**, **Last month**, **Last 30 days**, **Last 90 days** or **This year**.
- Or set your own **From** and **To** dates. Both days are included.

## Step 3: Choose categories

Tick the categories to include. The number next to each one shows how many expenses it has in your chosen dates.
Use **All** or **None** (top right of the section) to select or clear them quickly.

![Category selection with counts](../images/data-export/categories.png)

## Step 4: Narrow it down further (optional)

- **Keyword:** only include expenses whose description (or category, or amount) matches.
- **Columns & order:** click a column chip to include or leave out Date, Category, Amount or Description. Columns always appear in that order in the file. Use the menu underneath to sort by date or amount.
- **Filename:** a name is suggested for you, e.g. `expenses-food-2026-10-01_to_2026-10-15`. Type your own if you like; the extension (`.csv`, `.json`, `.pdf`) is added automatically. Click **Reset to suggested name** to undo.

## Step 5: Check the preview

At the top of the preview you'll see how many **records**, the **total**, the **average**, and how many days they **span**, plus a colored bar showing the category split.

Switch between the two tabs:

- **Data:** a table of the expenses that will be exported (first 50 shown).
- **CSV preview / JSON preview / PDF preview:** what the file itself will look like.

![The PDF preview tab](../images/data-export/pdf-preview.png)

The bottom bar repeats the essentials, e.g. *142 records · $4,213.20 · expenses-2026-10-16.pdf*.

## Step 6: Export

1. Click **Export CSV** (or **Export JSON** / **Export PDF**).
2. The button shows *Generating…* while the file is created. Large PDFs can take a moment.
3. When it's done, you'll see **Export complete** with the filename, number of records and file size. The file is in your browser's downloads.

   ![The Export complete screen](../images/data-export/export-complete.png)

4. Click **Export another** to change options and export again, or **Done** to close.

## Troubleshooting

| You see | What to do |
|---|---|
| *Start date is after the end date.* | Swap the From and To dates |
| *Select at least one category.* | Tick a category or click **All** |
| *Select at least one column.* | Click at least one column chip |
| *No records match — adjust your filters.* | Widen the dates, add categories or clear the keyword |
| *Filename has no valid characters.* | Use letters or numbers in the filename, or clear it to use the suggestion |
| **Export…** is greyed out | You don't have any expenses yet |
| Some characters show as `?` in the PDF | PDF reports only support Western (Latin) characters. Use CSV or JSON for other languages. |
| A description in the CSV starts with `'` | That's a safety measure for descriptions starting with `=`, `+`, `-` or `@`, so spreadsheets don't run them as formulas |

## FAQ

**Will it remember my choices next time?**
No. The Dashboard always starts from the defaults, and the Expenses page starts from what you're viewing.

**Is my data sent anywhere?**
No. Files are created in your browser and saved straight to your device.

## Related guides

- [How to search and filter expenses](how-to-expense-search-filtering.md)
- [How to keep your data safe](how-to-data-persistence.md)

---

### Screenshots needed

| File | What to capture |
|---|---|
| `images/data-export/export-button.png` | Dashboard header with **Export…** highlighted |
| `images/data-export/export-dialog.png` | Full export window: options on the left, Data tab preview on the right, with sample data |
| `images/data-export/categories.png` | Category section with two categories unticked and counts visible |
| `images/data-export/pdf-preview.png` | PDF format selected, **PDF preview** tab showing the page mock-up |
| `images/data-export/export-complete.png` | **Export complete** screen with filename and file size |
