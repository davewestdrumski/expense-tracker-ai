# Data Persistence & Sample Data: Implementation

> **Feature type:** Frontend (browser `localStorage`, no server)
> **User guide:** [How to keep your data safe](../user/how-to-data-persistence.md)
> **Index:** [Documentation home](../README.md)

Expenses live in React state inside `ExpenseProvider` and are mirrored to `localStorage` after every change. The provider also validates stored records, keeps open tabs in sync, reports storage failures, and can seed realistic sample data for demos.

---

## Architecture

```
mount ──► loadExpenses() ──► validate (isExpense) ──► setExpenses ──► isLoading=false
                 │ throws (bad JSON / not an array)
                 └─► loadError banner, start empty

setExpenses(...) ──► [effect] saveExpenses(expenses) ──fails──► onPersistError → error toast

other tab writes ──► window "storage" event ──► loadExpenses() ──► setExpenses
```

## Files

| File | Role |
|---|---|
| `src/context/ExpenseContext.tsx` | State, load/save effects, cross-tab sync, mutations, `useExpenses()` |
| `src/lib/storage.ts` | `loadExpenses`, `saveExpenses`, `isExpense` (exported record guard, also used by restore), `createId` |
| `src/components/Providers.tsx` | Wires `onPersistError` to the toast system |
| `src/components/LoadError.tsx` | Banner shown when stored data couldn't be read |
| `src/lib/sample-data.ts` | `generateSampleExpenses()` |
| `src/components/EmptyState.tsx` | **Load sample data** button |

## Storage format

| Property | Value |
|---|---|
| Key | `expense-tracker:expenses:v1` (versioned, so the schema can change later) |
| Value | JSON array of `Expense` (see [Expense Management](expense-management-implementation.md#data-model-srctypesexpensets)) |
| Scope | Per browser profile **and** per origin (`http://localhost:3000` ≠ a deployed URL) |
| Typical size | ~150 bytes per expense, so the ~5 MB quota holds ~30,000 expenses |

## API (`useExpenses()`)

```ts
interface ExpenseContextValue {
  expenses: Expense[];
  isLoading: boolean;          // true until the first localStorage read finishes
  loadError: string | null;
  addExpense, addMany, updateExpense, deleteExpense, clearAll;
  importExpenses(incoming: Expense[], mode: "merge" | "replace"): { added: number; skipped: number };
}
```

`addMany(inputs)` builds IDs and timestamps for each input and prepends them in one state update (used by sample data). `clearAll()` exists but has no UI.

`importExpenses` restores from a backup (Export Hub → **Restore from backup**): `"merge"` prepends records whose `id` isn't already present and reports how many were skipped; `"replace"` swaps the whole list. Callers must validate records with `isExpense` first.

## Implementation notes

- **Server rendering:** `localStorage` exists only in the browser, so the first render (on the server) has `isLoading = true` and pages show skeletons. The read happens in a mount effect.
- **Write-after-hydrate guard:** a `hydrated` ref stops the save effect from writing the initial empty array over stored data before the first read finishes.
- **Record validation:** `isExpense` checks types, the `YYYY-MM-DD` date pattern, that the amount is finite, and that the category is known. Invalid records are **dropped silently**; the rest load normally.
- **Cross-tab sync:** a `storage` event for any key starting with `expense-tracker:` triggers a re-read. Writes made in another tab therefore appear without a refresh. Two tabs editing at the same moment resolve last-write-wins.
- **ID generation:** `crypto.randomUUID()` where available, otherwise a time-plus-random string.

## Error handling

| Failure | Behavior |
|---|---|
| Stored value isn't JSON, or isn't an array | Red banner: "We couldn't read your saved expenses. Starting with an empty list." |
| Individual malformed records | Dropped; the remaining records load |
| `setItem` throws (quota exceeded, storage disabled, Safari private mode) | Error toast: "Couldn't save to local storage. Your browser storage may be full or disabled." Data stays in memory for the session. |

> ⚠️ **Caveat:** after a load error, the unreadable value stays in storage only until the **next change**. The first add, edit or delete then overwrites it with the in-memory list. If recovering corrupted data matters, copy the raw value from DevTools before making changes.

## Sample data (`generateSampleExpenses`)

- Covers the **last 90 days** ending today; each day randomly gets 0, 1 or 2 expenses (≈ 80–110 total).
- Draws from 13 templates across all 6 categories, each with a realistic amount range (Coffee $3–7, Electricity $70–140…).
- Every generated record passes `validateExpense`, and none is dated in the future.
- Offered only from the empty state, so it can't be mixed into real data by accident.

## Security and privacy

- Data never leaves the device; there are no network requests.
- `localStorage` can be read by any script on the same origin. Don't add third-party scripts without considering that.
- Data isn't encrypted at rest; anyone with access to the browser profile can read it.

## Testing

There are no automated tests yet. Manual checklist:

- [ ] Add an expense, refresh → it's still there
- [ ] Open two tabs, add in one → it appears in the other
- [ ] In DevTools, set the key to `not json`, reload → banner shows
- [ ] Add a record with `amount: "abc"` to the stored array, reload → that record is dropped, the others load
- [ ] Load sample data → ~90 days of expenses, toast shows the count

## Known limitations

- No sync between devices or browsers. Backups are made and restored through the [Export Hub](data-export-implementation.md) (Full Backup JSON + `importExpenses`); cloud destinations there are simulated, so a real off-device copy means downloading the file.
- No undo or history.
- No schema migrations yet (the `v1` key suffix leaves room for them).

## Related documentation

- [Expense Management](expense-management-implementation.md)
- [CSV Export](csv-export-implementation.md)
- [Data Export (Export Hub)](data-export-implementation.md): backup and restore
