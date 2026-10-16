# Expense Search & Filtering: Implementation

> **Feature type:** Frontend (client-only, no server)
> **User guide:** [How to search and filter expenses](../user/how-to-expense-search-filtering.md)
> **Index:** [Documentation home](../README.md)

The Expenses page (`/expenses`) lists every expense with keyword search, a category filter, a date range (with presets), sorting, a live count and total, and incremental "Show more" paging.

---

## Architecture

```
/expenses (src/app/expenses/page.tsx)
  state: filters: ExpenseFilters, sort: SortKey, visible: number
  │
  ├─ <ExpenseFiltersBar filters sort onChange onSortChange>   (controlled)
  │
  ├─ results = useMemo(sortExpenses(filterExpenses(expenses, filters), sort))
  ├─ total   = useMemo(sumAmounts(results))
  │
  └─ results.slice(0, visible).map(<ExpenseRow>)  + "Show more (N remaining)"
```

Filtering and sorting are **pure functions** in `src/lib/expenses.ts`, so they're cheap to test and reuse. The page derives its results with `useMemo` and never stores them.

## Files

| File | Role |
|---|---|
| `src/app/expenses/page.tsx` | Page state, derived results, results header, list, paging, empty states |
| `src/components/ExpenseFiltersBar.tsx` | Search, category select, sort select, start/end dates, preset chips, Clear filters |
| `src/lib/expenses.ts` | `filterExpenses`, `sortExpenses`, `sumAmounts`, `describeRange`, `DEFAULT_FILTERS` |
| `src/components/ExpenseRow.tsx` | Row rendering with edit/delete actions (see [Expense Management](expense-management-implementation.md)) |
| `src/types/expense.ts` | `ExpenseFilters`, `SortKey` |

## API

```ts
interface ExpenseFilters {
  search: string;
  category: Category | "All";
  startDate: string;   // "YYYY-MM-DD" or ""
  endDate: string;     // "YYYY-MM-DD" or ""
}
type SortKey = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

filterExpenses(expenses: Expense[], filters: ExpenseFilters): Expense[];
sortExpenses(expenses: Expense[], sort: SortKey): Expense[];   // returns a new array
sumAmounts(expenses: Expense[]): number;                       // rounded to cents
describeRange(start: string, end: string): string;             // "Oct 1, 2026 – Oct 15, 2026" | "All time" …
```

## Implementation notes

### Matching rules (`filterExpenses`)

| Filter | Rule |
|---|---|
| Search | Case-insensitive substring match on `"<description> <category> <amount.toFixed(2)>"`, so `coffee`, `food` and `12.50` all match. Surrounding whitespace is trimmed. |
| Category | Exact match unless `"All"` |
| Start / end date | **Inclusive**, using string comparison of `YYYY-MM-DD` (valid because the format sorts lexically) |

### Sorting (`sortExpenses`)

- Date sorts break ties by `createdAt`, so items entered on the same day keep a stable, intuitive order.
- Amount sorts compare numerically; ties keep the existing order (`Array.prototype.sort` is stable in modern engines).

### Date presets (`ExpenseFiltersBar`)

| Chip | Range |
|---|---|
| This month | 1st of the current month → today |
| Last month | 1st → last day of the previous month |
| Last 30 days | today − 29 days → today |
| This year | Jan 1 → today |

A chip is **active** when the current dates exactly equal its range. Clicking an active chip clears the dates. The date inputs use `min`/`max` to stop the native picker from choosing a reversed range; if one is typed anyway, an inline message says *"Start date is after the end date."*

### Paging

- `PAGE_SIZE = 50`. **Show more** adds another 50.
- `visible` resets to 50 whenever filters change (through `updateFilters`). Changing the **sort** does not reset paging.

### Results header

`"<count> expenses · <describeRange(...)>"` on the left, `Total <sum>` on the right. Both reflect **all** matching rows, not only the visible page.

## Edge cases

| Case | Behavior |
|---|---|
| No expenses at all | Empty state with **Add your first expense** and **Load sample data** (see [Data Persistence](data-persistence-implementation.md)) |
| Filters match nothing | "No matching expenses" panel with a **Clear filters** button |
| Loading from storage | Skeleton placeholders; the filter bar is hidden until data is ready |
| Reversed date range | Inline warning; results are empty (no row can satisfy both bounds) |
| Very large lists | Rendering is capped by paging; filter and sort are O(n log n) per change. That's fine for thousands of rows; there's no virtualization. |

## State and persistence

Filters and sort are **component state only**. They reset when you leave the page and aren't reflected in the URL, so a filtered view can't be bookmarked or shared.

## Testing

There are no automated tests yet. Manual checklist:

- [ ] Search matches description, category name and amount (`12.50`)
- [ ] Each preset sets the correct dates; clicking it again clears them
- [ ] Start > end shows the warning
- [ ] Count and total update with every filter change and include rows beyond the first 50
- [ ] **Show more** appears only when more than 50 rows match
- [ ] **Clear filters** restores everything

## Known limitations

- No multi-category selection (single category or All).
- Filters aren't kept in the URL or between visits.
- No amount-range filter.

## Related documentation

- [Expense Management](expense-management-implementation.md): row actions
- [CSV Export](csv-export-implementation.md): exports exactly the filtered, sorted results
- [Dashboard Analytics](dashboard-analytics-implementation.md): uses the same aggregation helpers
