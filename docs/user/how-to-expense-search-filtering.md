# How to search and filter expenses

> **For developers:** [Expense Search & Filtering implementation](../dev/expense-search-filtering-implementation.md) · **All guides:** [Documentation home](../README.md)

Find any expense in seconds, or narrow your list to a category or time period and see the total.

---

## Open the Expenses page

Click **Expenses** in the top navigation (on a phone, use the bottom bar).

![The Expenses page with the filter bar and list](../images/expense-search-filtering/expenses-page.png)

## Search

Type in the **Search descriptions…** box. The list updates as you type and matches:

- words in the description, e.g. `coffee`
- the category name, e.g. `bills`
- the amount, e.g. `12.50`

## Filter by category

Choose a category from the **All categories** menu. Choose **All categories** again to see everything.

## Filter by date

**Quick ranges:** click a chip under the filters. Click the same chip again to remove it.

| Chip | Shows |
|---|---|
| This month | From the 1st of this month to today |
| Last month | The whole of last month |
| Last 30 days | The past 30 days, including today |
| This year | January 1 to today |

**Custom range:** pick a start and end date in the two date boxes. Both days are included.

![Date preset chips and custom date fields](../images/expense-search-filtering/date-filters.png)

> If you see *"Start date is after the end date"*, swap the two dates.

## Sort

Use the sort menu to show **Newest first**, **Oldest first**, **Highest amount** or **Lowest amount**.

## Read the results

The bar above the list shows how many expenses match, the period, and their **total**. The total always includes every match, even ones further down the list.

![Results bar showing count, period and total](../images/expense-search-filtering/results-bar.png)

If more than 50 expenses match, click **Show more** at the bottom to load the next 50.

## Clear everything

Click **Clear filters** (next to the date chips) to reset search, category and dates.

## FAQ

**My filters disappeared when I came back to the page.**
That's expected: filters reset each time you open the page.

**Can I export just what I'm looking at?**
Yes. Click **Export CSV** to download exactly the filtered list. See [How to export to CSV](how-to-csv-export.md).

**Nothing shows up.**
You'll see *"No matching expenses"*. Click **Clear filters** and try a broader search.

## Related guides

- [How to add, edit and delete expenses](how-to-expense-management.md)
- [How to export to CSV](how-to-csv-export.md)

---

### Screenshots needed

| File | What to capture |
|---|---|
| `images/expense-search-filtering/expenses-page.png` | Full Expenses page with sample data loaded |
| `images/expense-search-filtering/date-filters.png` | Filter bar with the **This month** chip active and the date fields filled |
| `images/expense-search-filtering/results-bar.png` | Results bar with a category filter applied (count, period, total) |
