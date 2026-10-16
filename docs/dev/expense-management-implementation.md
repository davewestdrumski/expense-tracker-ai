# Expense Management: Implementation

> **Feature type:** Frontend (client-only, no server)
> **User guide:** [How to manage expenses](../user/how-to-expense-management.md)
> **Index:** [Documentation home](../README.md)

Creating, editing and deleting expenses. A single add/edit modal and a delete confirmation are hosted once at the app root and opened from anywhere through `useExpenseActions()`.

---

## Overview

| Capability | Entry points | Result |
|---|---|---|
| Add | Navbar **Add expense** (≥ `sm`), mobile floating **+** button, Expenses page header, dashboard header (mobile only), empty-state **Add your first expense** | Opens the form modal empty; on save, adds the expense to the top of the list and shows a toast |
| Edit | Pencil icon on any expense row (dashboard "Recent expenses" and Expenses list) | Opens the form modal filled in; on save, replaces the fields and updates `updatedAt` |
| Delete | Trash icon on any expense row | Opens a confirmation dialog; on confirm, removes the expense and shows a toast |

## Architecture

```
ExpenseRow ──openEdit / requestDelete──┐
Navbar / pages ──openCreate────────────┤
                                       ▼
Providers.tsx ─ ExpenseActionsHost  (ExpenseActionsContext)
   ├─ <Modal> ─ <ExpenseForm key={editing?.id ?? "new"}>
   │              └─ validateExpense()  ──► toExpenseInput()
   │                                         │
   │        addExpense(input) / updateExpense(id, input)
   └─ <ConfirmDialog> ──► deleteExpense(id)  │
                                             ▼
                              ExpenseContext (state + localStorage)
                                             │
                                   ToastContext ("Added $12.50 for Lunch")
```

The modal and dialog are rendered **once**, so pages never manage their own copies. The form is **keyed** by the expense being edited (or `"new"`), so opening it always starts from fresh state.

## Files

| File | Role |
|---|---|
| `src/app/(app)/layout.tsx` | Mounts `Providers` (and `CloudProvider`, `Navbar`) for all app pages |
| `src/components/Providers.tsx` | Provider stack (`ToastProvider` → `ExpenseProvider` → `ExpenseActionsHost`); owns modal and confirmation state; exports `useExpenseActions()` |
| `src/components/ExpenseForm.tsx` | Controlled form: description, amount, date, category; validation display; submit/cancel |
| `src/lib/validation.ts` | `validateExpense()`, `toExpenseInput()`, limits (`MAX_AMOUNT`, `MAX_DESCRIPTION`) |
| `src/components/Modal.tsx` | Generic dialog: Escape and backdrop close, scroll lock, focus on open, focus restore on close |
| `src/components/ConfirmDialog.tsx` | Destructive-action confirmation built on `Modal` |
| `src/components/ExpenseRow.tsx` | List row with category icon, date, amount, edit and delete buttons |
| `src/context/ExpenseContext.tsx` | `addExpense`, `updateExpense`, `deleteExpense` |
| `src/types/expense.ts` | `Expense`, `ExpenseInput`, `CATEGORIES` |
| `src/lib/categories.ts` | Per-category icon, chart color and badge classes |

## API

### `useExpenseActions()` (`src/components/Providers.tsx`)

```ts
interface ExpenseActions {
  openCreate: () => void;
  openEdit: (expense: Expense) => void;
  requestDelete: (expense: Expense) => void;
}
```

Throws if used outside `<Providers>`.

### `ExpenseContext` mutations (`src/context/ExpenseContext.tsx`)

```ts
addExpense(input: ExpenseInput): Expense;                 // new id + createdAt/updatedAt; prepended
updateExpense(id: string, input: ExpenseInput): void;     // merges fields, bumps updatedAt
deleteExpense(id: string): Expense | undefined;           // returns the removed record
```

IDs come from `crypto.randomUUID()`, with a time-plus-random fallback (`createId()` in `src/lib/storage.ts`).

### Data model (`src/types/expense.ts`)

```ts
type Category = "Food" | "Transportation" | "Entertainment" | "Shopping" | "Bills" | "Other";

interface Expense {
  id: string;
  date: string;        // "YYYY-MM-DD", interpreted as a local calendar date
  amount: number;      // dollars, rounded to cents
  category: Category;
  description: string;
  createdAt: string;   // ISO timestamp
  updatedAt: string;   // ISO timestamp
}
type ExpenseInput = Pick<Expense, "date" | "amount" | "category" | "description">;
```

## Validation rules (`validateExpense`)

| Field | Rule | Message |
|---|---|---|
| Description | Required after trimming; ≤ 100 characters | "Description is required." / "Keep it under 100 characters." |
| Amount | Required; matches `^\d+(\.\d{0,2})?$`; > 0; ≤ 1,000,000 | "Amount is required." / "Enter a valid amount with up to 2 decimal places." / "Amount must be greater than zero." / "Amount can't exceed $1,000,000." |
| Date | Required; `YYYY-MM-DD`; not after today; not before 1900-01-01 | "Date is required." / "Enter a valid date." / "Date can't be in the future." / "Enter a realistic date." |
| Category | One of `CATEGORIES` | "Choose a category." |

`toExpenseInput()` trims the description and rounds the amount to cents (`Math.round(n * 100) / 100`).

## Implementation notes

- **When errors appear:** a field shows its error only after it has been *touched* (blurred) or the form has been submitted. Once a field is touched, it re-validates on every change.
- **Amount input:** `type="text"` with `inputMode="decimal"`, so mobile shows a numeric keypad without the native number field's quirks (scroll-to-change, `e` notation). Typed characters other than digits and `.` are removed; on blur, valid values are formatted to 2 decimals.
- **Date input:** native `<input type="date">` with `max={todayISO()}`. Dates are stored as calendar strings and parsed with `parseISODate()` (local time) to avoid UTC off-by-one-day errors.
- **Category picker:** visually hidden radio inputs inside styled labels; the keyboard focus ring shows through `has-[:focus-visible]`.
- **Description counter:** shows trimmed length out of 100 and turns red when over. The input's `maxLength` is 120, so pasted text can still be seen and corrected rather than silently cut off.
- **Toasts:**
  - Add: `Added $12.50 for Lunch` (success)
  - Edit: `Expense updated` (success)
  - Delete: `Expense deleted` (info)

## Edge cases and error handling

| Case | Behavior |
|---|---|
| Submitting an invalid form | Every field is marked touched, all errors show, nothing is saved |
| Double-clicking Save | The button switches to its loading state on the first submit, and the modal closes in the same tick |
| Editing a record that another tab deleted | `updateExpense` maps over the current list; a missing id is a no-op |
| Closing during edit (Escape, backdrop, Cancel) | Changes are discarded; the next open starts fresh (keyed form) |
| Delete | Always confirmed; the dialog names the description and amount. There's no undo after confirming. |

## Accessibility

- Every input has a label; errors are linked with `aria-describedby`, and invalid fields set `aria-invalid`.
- The dialog has `role="dialog"`, `aria-modal`, and `aria-labelledby`; Escape closes it; focus goes back to the button that opened it.
- Edit and delete icon buttons have labels such as "Edit Groceries".
- **Known gap:** `Modal` has no focus trap, so Tab can reach the page behind the dialog.

## Testing

There are no automated tests yet. Manual checklist:

- [ ] An empty submit shows all four errors
- [ ] Amount `1.234`, `0`, `2000000` and a future date are each rejected with the right message
- [ ] Valid add → toast, row appears at the top of the list, and the dashboard totals update
- [ ] Edit → fields are pre-filled; save updates the row and the totals
- [ ] Delete → confirmation names the expense; Cancel keeps it; confirming removes it
- [ ] Escape and backdrop close the modal; focus returns to the opener

## Known limitations

- No undo after delete; no bulk edit or delete.
- Single currency (USD), formatted with `en-US`.
- Categories are fixed in code (`CATEGORIES`); there are no user-defined categories.

## Related documentation

- [Data Persistence](data-persistence-implementation.md): how changes are saved
- [Expense Search & Filtering](expense-search-filtering-implementation.md): the list these rows appear in
- [Dashboard Analytics](dashboard-analytics-implementation.md): totals that react to changes
