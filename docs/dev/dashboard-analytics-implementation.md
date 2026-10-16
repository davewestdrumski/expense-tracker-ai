# Dashboard Analytics: Implementation

> **Feature type:** Frontend (client-only, no server)
> **User guide:** [How to read your dashboard](../user/how-to-dashboard-analytics.md)
> **Index:** [Documentation home](../README.md)

The home route (`/`) summarizes spending with four stat cards, a 6-month bar chart, a category breakdown with a period toggle, and the six most recent expenses.

---

## Architecture

```
/ (src/app/page.tsx)
  stats = useMemo(() => { …all aggregates… }, [expenses])
  │
  ├─ <SummaryCards total thisMonth lastMonth thisMonthCount dailyAverage topCategory />
  ├─ <MonthlyChart data={stats.monthly} />                  (client, hover state)
  ├─ <CategoryBreakdown data={period === "month" ? monthCategories : allCategories} />
  └─ Recent expenses: stats.recent.map(<ExpenseRow compact />)
```

All aggregates are computed in **one `useMemo`** keyed on `expenses`, so they recompute only when data changes and never on hover or toggle. The chart components are presentational.

## Files

| File | Role |
|---|---|
| `src/app/page.tsx` | Aggregation, loading and empty states, layout, Month/All-time toggle |
| `src/components/SummaryCards.tsx` | Four stat cards, including the month-over-month change badge |
| `src/components/MonthlyChart.tsx` | Accessible HTML/CSS bar chart with "nice" axis ticks and tooltips |
| `src/components/CategoryBreakdown.tsx` | Part-to-whole strip plus a ranked bar list |
| `src/lib/expenses.ts` | `sumAmounts`, `totalsByCategory`, `monthlyTotals` |
| `src/lib/format.ts` | `formatCurrency`, `formatCompactCurrency`, `monthKey`, `formatMonthKey` |
| `src/lib/categories.ts` | `CATEGORY_META[category].color` (chart palette) |

## Metric definitions

| Card | Formula | Footer |
|---|---|---|
| **Total spending** | `sumAmounts(all expenses)` | "N expenses recorded" |
| **This month** | Sum where `monthKey(date) === current YYYY-MM` | `±X% vs. last month ($Y)` when last month > 0; otherwise "N expenses this month" |
| **Daily average** | `thisMonth / today.getDate()` (days elapsed this month, including today) | Fixed caption |
| **Top category** | Highest `totalsByCategory(thisMonth)` | Its amount, or "No spending this month yet" |

The change badge is **red with an up arrow** when spending rose and **green with a down arrow** when it fell: for spending, up is bad.

## API

```ts
totalsByCategory(expenses): { category: Category; total: number; count: number }[]  // non-empty, desc by total
monthlyTotals(expenses, months = 6, now = new Date()): { key: "YYYY-MM"; total: number }[] // oldest → newest, empty months included
```

## Chart implementation

### `MonthlyChart`

- **No chart library.** Bars are flex children whose height is `total / niceMax`. Hand-rolled HTML keeps the bundle small and stays fully styleable.
- `niceMax()` rounds the axis to 1, 2, 2.5, 5 or 10 × 10ⁿ; ticks at 0, 25, 50, 75 and 100 %; compact currency labels (`$1.2K`).
- **Interaction:** each month is a focusable `<li>` with an `aria-label` such as "October 2026: $1,234.56". Hover or focus shows a tooltip and dims the other bars. The hit target is the full column, not just the bar.
- Single series in one color (`#2a78d6`). Months with spending get a minimum visible height of 3 px; empty months show no bar. The current month's label is bold.

### `CategoryBreakdown`

- A **part-to-whole strip** (segments separated by a 2 px gap) above a ranked list; each row has a color swatch, icon, name, amount, share % and a bar scaled to the **largest** category, not the total.
- Toggle: **Month** (default) / **All time**. Colors follow the category, never its rank, so filtering never repaints a category.

### Color palette

Category colors (`src/lib/categories.ts`) come from a fixed categorical order, checked with a color-vision-deficiency validator: all adjacent pairs pass CVD ΔE ≥ 8, and the normal-vision floor is ≥ 15. Three hues fall below 3:1 contrast against white, so **every colored mark has a visible text label** (name and value). Don't reorder or add colors without re-validating.

## States

| State | UI |
|---|---|
| Loading | Skeletons for the 4 cards and both chart panels |
| No expenses | `EmptyState` (add, or load sample data) |
| No spending this month | Cards show $0.00; the breakdown says "No expenses in this period." under Month |

## Performance

The aggregation is O(n) per metric and runs only when `expenses` changes. `monthlyTotals` filters once per month (6 × n), which is negligible below about 100k rows.

## Testing

There are no automated tests yet. Manual checklist:

- [ ] Totals match the Expenses page with no filters
- [ ] Add an expense dated last month → the % badge and the chart's previous bar update
- [ ] The Month/All-time toggle changes the breakdown only
- [ ] Keyboard-tab through the chart bars → tooltips appear
- [ ] The "View all" link goes to `/expenses`

## Known limitations

- Fixed 6-month window; no custom chart period.
- "Daily average" counts calendar days elapsed, not days with spending.
- No budgets or targets.

## Related documentation

- [Expense Management](expense-management-implementation.md): recent-expense row actions
- [Expense Search & Filtering](expense-search-filtering-implementation.md): shared aggregation helpers
- [Data Persistence](data-persistence-implementation.md): sample data for demos
