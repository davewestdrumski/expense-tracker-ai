# Data Export: Code Analysis of Three Implementations

| | |
|---|---|
| **Subject** | Export features of the Spendwise expense tracker (Next.js 14, TypeScript, Tailwind, localStorage) |
| **Branches** | `feature-data-export-v1` (`19fa89a`), `feature-data-export-v2` (`68bcc00`), `feature-data-export-v3` (`5a9aeca`). Each branches from `main` (`9223d3b`). |
| **Method** | `git diff main...<branch>` for every branch, a manual review of every changed file, a production `next build` per branch for bundle sizes, and standalone benchmarks of each branch's export code at 1,000 and 10,000 expenses (Node 24, bundled with esbuild). |
| **Disclosure** | Claude wrote all three implementations in this session, so this is a self-review. I've tried to report problems as plainly as strengths. Every finding in the [issue register](#6-issue-register) was checked against the branch source, not recalled from memory. |

---

## Contents

1. [Executive summary](#1-executive-summary)
2. [Shared baseline (`main`)](#2-shared-baseline-main)
3. [Version 1: simple CSV export](#3-version-1--simple-csv-export)
4. [Version 2: advanced local export](#4-version-2--advanced-local-export)
5. [Version 3: cloud-integrated Export Hub](#5-version-3--cloud-integrated-export-hub)
6. [Issue register](#6-issue-register)
7. [Cross-cutting comparison](#7-cross-cutting-comparison)
8. [Recommendation](#8-recommendation)

---

## 1. Executive summary

| | **V1: Simple** | **V2: Advanced local** | **V3: Cloud hub** |
|---|---|---|---|
| UX pattern | One button on the dashboard | Wide modal: options on the left, live preview on the right | A dedicated `/exports` page with 5 tabs, slide-over panels, a job tray, and a public `/shared` page |
| Files changed | 2 | 21 (16 new) | 36 (31 new) |
| Lines added / removed | +17 / −7 | +1,421 / −85 | +3,378 / −18 |
| New runtime dependencies | none | none | `qrcode-generator@1.4.4` |
| First-load JS (dashboard) | 110 kB (no change) | 120 kB (+10 kB) | 111 kB (+1 kB); `/exports` is 128 kB |
| Output formats | CSV | CSV, JSON, PDF | CSV (Tax Report, Category Analysis), Markdown (Monthly Summary), JSON (Full Backup) |
| User controls | None | Format, date range and presets, categories, keyword, columns, sort, filename | Template plus its period, destination, destination settings, schedule, share options |
| Works without a backend | Yes | Yes | Download, share links, backup/restore, mailto and clipboard: yes. Email, Sheets, Drive, Dropbox, OneDrive, Notion: **simulated only** |
| Error handling | None on the new path | Good: a status state machine, validation, inline errors | Mixed: good in places, with several gaps (see §5.7) |
| Automated tests committed | No | No | No |
| Overall complexity | Trivial | Moderate, well layered | High; two hot spots (`CloudContext`, `DeliverPanel`) |

**Bottom line:** V2's export engine is the strongest foundation. It's a registry of format modules with pure functions, it renders previews from the same code that generates the file, and it needs no dependencies. V3 adds the most *distinctive* capabilities: share links that need no server, backup and restore, and use-case templates. But most of its surface (the cloud services, email and live sync) is simulated, and V3 is the riskiest to maintain. V1 is a sensible one-click shortcut, but on its own it's not a feature. See [§8](#8-recommendation) for a combined approach.

---

## 2. Shared baseline (`main`)

What every version builds on, since this shapes what each version needed to add:

- **Data:** `ExpenseContext` holds `Expense[]` in React state and persists it to `localStorage` (`expense-tracker:expenses:v1`). Stored records are validated on load (`isExpense`), and open tabs stay in sync through the `storage` event.
- **UI primitives:** `Modal` (closes on Escape, locks scrolling, restores focus, **no focus trap**), `Button`, `Card`, toasts (`ToastContext`), and `useExpenseActions()` to open the add, edit and delete dialogs from anywhere.
- **Existing export:** `main` already has an **Export CSV** button on the Expenses page. It calls `downloadCSV(filtered)` in `src/lib/expenses.ts`, which builds the file as a Blob and downloads it through a temporary object URL. The CSV adds a BOM so Excel reads UTF-8 correctly, and guards against formula injection. Each version treats this differently:
  - V1 reuses it.
  - V2 replaces it.
  - V3 leaves it alone.

---

## 3. Version 1: simple CSV export

### 3.1 Files changed

| File | Change |
|---|---|
| `src/app/page.tsx` | +15 / −5: adds the **Export Data** button to the dashboard `PageHeader` actions |
| `src/lib/expenses.ts` | +2 / −2: reorders CSV columns to `Date, Category, Amount, Description` |

### 3.2 Architecture overview

```
Dashboard (page.tsx)
  └─ <Button onClick={() => downloadCSV(sortExpenses(expenses, "date-desc"))}>
                         │
lib/expenses.ts          ▼
  expensesToCSV(rows) ── string ──► downloadCSV() ── Blob ──► <a download> click
```

No new modules. The feature is one inline event handler that composes two existing pure functions.

### 3.3 Key components

| Unit | Responsibility |
|---|---|
| Dashboard `header.actions` | Renders the button. It's disabled while data loads or when there are no expenses. |
| `sortExpenses(…, "date-desc")` | Puts newest expenses first in the export |
| `expensesToCSV` | Writes the header and rows, escaping each cell |
| `downloadCSV` | Creates the Blob (with BOM), makes a temporary `<a download>`, clicks it, then releases the object URL |

### 3.4 Libraries

None added. Uses only browser APIs: `Blob`, `URL.createObjectURL`, and an anchor's `download` attribute.

### 3.5 Patterns

- **Reuse over new code:** the whole feature is composition of existing helpers.
- **Inline handler:** no hook, state or abstraction.
- **One shared serializer:** the dashboard and the Expenses-page export call the same function. As a result, the column reorder **also changed the Expenses-page CSV**. That keeps both exports consistent, but it's a side effect worth knowing about.

### 3.6 Complexity

Trivial: one expression and no branching. This is the easiest of the three to review, test and delete.

### 3.7 Error handling

- **None on the new path.** The Expenses-page handler on `main` wraps `downloadCSV` in `try/catch` and shows a toast; the dashboard handler (`src/app/page.tsx:57`) doesn't. A failure (say, a browser blocking the download) is silent.
- No feedback on success either. The user only sees the browser's download UI.
- Empty data is prevented by disabling the button.

### 3.8 Security

- **Formula injection:** cells starting with `= + - @ \t \r` get a `'` prefix. Commas, quotes and newlines are quoted per RFC 4180.
- Everything happens in the browser; nothing is sent anywhere.

### 3.9 Performance

- 1,000 rows: **1.8 ms**, 45 KB. 10,000 rows: **6.4 ms**, 456 KB (benchmark).
- Runs synchronously on the main thread; negligible at realistic sizes.
- `URL.revokeObjectURL` runs in `setTimeout(…, 0)`. That works in current Chromium and Firefox, but is the most aggressive timing possible; V2 uses 1 s.

### 3.10 Extensibility and maintainability

- Easy to understand, but there's nowhere to plug in more: any new format, filter or option means rewriting it.
- The column order is now implicitly shared by two features with no test pinning it.

### 3.11 Technical deep dive

| Question | Answer |
|---|---|
| How does export work? | Click → sort a copy of all expenses → serialize to CSV → download. |
| File generation | Strings joined with `\r\n`, a `﻿` BOM prepended, wrapped in a `text/csv;charset=utf-8` Blob. The filename is `expenses-YYYY-MM-DD.csv`. |
| User interaction | A single synchronous click handler. No confirmation, preview or feedback. |
| State management | None added. Reads `expenses` and `isLoading` from `ExpenseContext`. |
| Edge cases | Empty or loading → button disabled. Commas, quotes and newlines → quoted. Formula prefixes → guarded. Unicode → kept (UTF-8 with BOM). Download failure → **unhandled**. |

---

## 4. Version 2: advanced local export

### 4.1 Files changed

**New (16):**

| Area | Files |
|---|---|
| Export engine (`src/lib/export/`) | `types.ts`, `columns.ts`, `select.ts`, `filename.ts`, `download.ts`, `registry.ts`, `pdf-writer.ts`, `formats/csv.ts`, `formats/json.ts`, `formats/pdf.ts` |
| Hook | `src/hooks/useExport.ts` |
| UI (`src/components/export/`) | `ExportDialog.tsx`, `ExportOptionsPanel.tsx`, `ExportPreview.tsx` |
| Shared utility | `src/lib/date-ranges.ts` (date presets moved out of `ExpenseFiltersBar`) |

**Modified (5):**

| File | Change |
|---|---|
| `src/components/Modal.tsx` | Adds an `xl` size and a pinned `footer` slot; the body is now its own scroll area |
| `src/components/Providers.tsx` | Adds `openExport(preset?)` to `useExpenseActions()` and hosts `ExportDialog` |
| `src/app/page.tsx` | Adds an **Export…** button that opens the dialog |
| `src/app/expenses/page.tsx` | **Export…** opens the dialog pre-filled with the page's current filters and sort |
| `src/components/ExpenseFiltersBar.tsx` | Uses the shared `date-ranges.ts` |
| `src/lib/expenses.ts` | Removes the old `csvEscape`, `expensesToCSV` and `downloadCSV` (−27) |

### 4.2 Architecture overview

Three layers with one-way dependencies:

```
┌──────────────── UI (components/export) ─────────────────┐
│ ExportDialog  ── owns ExportOptions state, validation    │
│  ├─ ExportOptionsPanel (controlled form)                 │
│  └─ ExportPreview (Data tab + "<format> preview" tab)    │
└───────────────┬──────────────────────────────────────────┘
                │ ExportContext {options, rows, summary, generatedAt}
┌───────────────▼─────── Orchestration ────────────────────┐
│ useExport(): idle → working → success | error            │
│   build(ctx) → Blob → saveBlob()                         │
└───────────────┬──────────────────────────────────────────┘
                │
┌───────────────▼────── Engine (lib/export) ───────────────┐
│ select.ts   selectExpenses / summarize / categoryCounts  │
│ columns.ts  column definitions (raw vs. display values)  │
│ registry.ts EXPORTERS: Record<ExportFormat, Exporter>    │
│   ├─ formats/csv.ts   build + preview                    │
│   ├─ formats/json.ts  build + preview                    │
│   └─ formats/pdf.ts   build → pdf-writer.ts (PDF 1.4)    │
│ filename.ts sanitize / suggest / validate                │
└──────────────────────────────────────────────────────────┘
```

The central abstraction is the **`Exporter` interface**:

```ts
interface Exporter {
  format; label; tagline; extension; mimeType;
  build: (ctx: ExportContext) => Blob;
  preview?: (ctx: ExportContext, limit: number) => string;
}
```

The preview and the real file run through the **same code**, so what you preview is what you get.

### 4.3 Key components

| Unit | Responsibility |
|---|---|
| `ExportDialog` | Owns `ExportOptions` state; works out the selected rows, summary and category counts with `useMemo`; validates; renders the footer summary and the success screen |
| `ExportOptionsPanel` | A purely controlled form: format cards, date presets and inputs, category checkboxes with live counts, keyword, column chips, sort, filename with an extension label |
| `ExportPreview` | Summary stats, a category share bar, a 50-row table, the raw CSV/JSON preview, and an HTML mock-up of the PDF's first page |
| `useExport` | Status state machine, a guard against double submission (`running` ref), a minimum spinner time, error capture |
| `select.ts` | Filtering (reuses `filterExpenses` and `sortExpenses`), summaries, per-category counts |
| `columns.ts` | Each column has a machine value (`raw`, for CSV/JSON) and a human value (`display`, for preview/PDF), and selected columns always come out in a fixed order |
| `filename.ts` | Removes characters that are invalid on Windows, macOS or Linux (and control characters), strips duplicated extensions, caps length at 80, suggests names like `expenses-food-2026-10-01_to_2026-10-15` |
| `pdf-writer.ts` | A dependency-free PDF 1.4 writer: Helvetica and Helvetica-Bold using built-in character-width tables, WinAnsi text encoding, rectangles and lines, and correct byte offsets in the file's index |
| `formats/pdf.ts` | Report layout: header, filter line, 4 summary tiles that shrink text to fit, category bars, a striped table with headers repeated on each page, a totals row, "Page X of Y" footers |

### 4.4 Libraries

**None added.** The PDF writer replaces jsPDF/pdfmake (~100–300 kB), keeping the cost to about **+10 kB** first-load JS. The trade-off is owning ~350 lines of PDF code, with the limits listed in §4.8.

### 4.5 Patterns

- **Strategy and registry:** formats are interchangeable objects looked up by key, so adding a format means one file plus one registry line.
- **Pure core, thin hook:** all of `lib/export` is pure and works outside React (that's how it was benchmarked).
- **Controlled components:** the options panel has no state of its own.
- **Derived state with `useMemo`:** rows, summary and counts are computed from `options` and never stored.
- **Discriminated-union status:** `ExportStatus = idle | working | success | error`, which rules out impossible combinations.
- **Reset by `key`:** `Providers` gives the dialog a fresh `key` each time it opens, so state never leaks between sessions.
- **Pre-filling from context:** the Expenses page passes its current filters as a `preset`, so the export matches what the user is looking at.

### 4.6 Complexity

Moderate and well spread out. The largest files are `ExportOptionsPanel` (285 lines, presentational), `ExportPreview` (210) and `formats/pdf.ts` (183). Each component has at most 3 `useState` calls. The PDF writer is the only algorithmically dense part: binary search for text fitting, coordinate flipping, index offsets.

### 4.7 Error handling

- **Validation before export:** start date after end date, no categories, no columns, invalid filename. Errors show next to the relevant control, and the Export button stays disabled. Zero matching rows gives an empty state, and the footer says "No records match".
- **During export:** `try/catch` around `build` and `saveBlob`. On error, a message appears in the footer and clears on the next option change.
- **Concurrency:** the `running` ref ignores repeat clicks; the dialog can't be closed (Escape, backdrop or Cancel) while it's working.
- **Gaps:**
  - The PDF fonts can't show non-Latin text, so characters like CJK are silently replaced with `?` (accented Latin letters are fine). The user isn't warned.
  - The minimum spinner time (450 ms) is cosmetic.

### 4.8 Security

- CSV formula-injection guard and RFC 4180 quoting (same rules as `main`).
- Filenames are sanitized before being given to the browser.
- The PDF writer escapes `\`, `(` and `)` in text, and reduces input to WinAnsi bytes, so user text can't inject PDF commands.
- JSON uses `JSON.stringify` and includes no executable content.
- Nothing leaves the device.

### 4.9 Performance (benchmarks)

| Rows | Preview recompute (filter, summary, counts) | CSV | JSON | PDF |
|---|---|---|---|---|
| 1,000 | 2.0 ms | 1.8 ms / 45 KB | 1.0 ms / 133 KB | 57 ms / 358 KB / 34 pages |
| 10,000 | 4.2 ms | 8.8 ms / 446 KB | 6.7 ms / 1.3 MB | **472 ms / 3.5 MB / 334 pages** |

- The preview recomputes on every keystroke in the keyword box with no debounce. That's fine up to around 10k rows.
- PDF generation **blocks the main thread**: about 0.5 s at 10k rows. The PDF's content isn't compressed, so files are roughly 3–5× bigger than necessary.
- `categoryCounts` re-sorts the selection just to count it (minor waste).

### 4.10 Extensibility and maintainability

- **High.** New format → implement `Exporter`. New column → one entry in `EXPORT_COLUMNS`. New filter → extend `ExportOptions` and `selectExpenses`.
- Formats only see an `ExportContext`, so they're easy to unit-test (none are committed yet).
- **Risk:** the custom PDF writer is a maintenance commitment. Unicode text, compression, images or links would mean a real font subsystem; at that point, switching to a library may be cheaper.

### 4.11 Technical deep dive

| Question | Answer |
|---|---|
| How does export work? | Opening the dialog seeds `ExportOptions`. Each change re-derives the rows and summary, which drive the preview and footer. Clicking **Export** runs `useExport.run(ctx, base)`: it waits one frame so the spinner can show, calls `EXPORTERS[format].build(ctx)` to get a Blob, keeps the spinner up for at least 450 ms, then downloads the file and shows the success screen with filename, record count and size. |
| File generation | **CSV:** escaped rows, BOM. **JSON:** a `{meta, summary, expenses}` document whose `fields` respect the column selection. **PDF:** layout is converted into PDF drawing commands per page, then assembled into a PDF 1.4 file with the standard Helvetica fonts. Because every character is one byte, string offsets equal byte offsets. |
| User interaction | Modal flow; every control updates the preview immediately; inline validation; a disabled primary action until the options are valid; a success screen with "Export another". |
| State management | Local `useState` in `ExportDialog`, with everything else derived through `useMemo`. Export lifecycle in `useExport`. Opening and closing go through `ExpenseActions` in `Providers`. |
| Edge cases | Empty selection; reversed date range; unchecking every category or column; filenames like `my:report/"Q3".csv` become `my-report-Q3`; long descriptions are truncated with an ellipsis that fits the measured width; tables flow across pages with repeated headers; the totals row moves to a new page if it doesn't fit; tile text shrinks to fit. |

---

## 5. Version 3: cloud-integrated Export Hub

### 5.1 Files changed

**New (31):**

| Area | Files |
|---|---|
| Routes | `src/app/(app)/layout.tsx`, `src/app/(app)/exports/page.tsx`, `src/app/(public)/shared/layout.tsx`, `src/app/(public)/shared/page.tsx` |
| Domain (`src/lib/cloud/`) | `types.ts`, `templates.ts`, `destinations.ts`, `share.ts`, `schedule.ts`, `store.ts`, `clipboard.ts`, `format.ts` |
| State | `src/context/CloudContext.tsx` |
| UI (`src/components/cloud/`) | `bits.tsx`, `SlideOver.tsx`, `JobTray.tsx`, `SyncStatusPill.tsx`, `QRCode.tsx`, `ConnectDialog.tsx`, `DeliverPanel.tsx`, `ScheduleDialog.tsx` |
| Hub tabs (`src/components/cloud/hub/`) | `ExportTab.tsx`, `QuickActions.tsx`, `AutomationsTab.tsx`, `HistoryTab.tsx`, `SharesTab.tsx`, `IntegrationsTab.tsx` |

**Modified or moved (7):**

| File | Change |
|---|---|
| `src/app/page.tsx` → `src/app/(app)/page.tsx` | Moved into a route group (URLs unchanged) |
| `src/app/expenses/page.tsx` → `src/app/(app)/expenses/page.tsx` | Moved into a route group (URLs unchanged) |
| `src/app/layout.tsx` | Root layout reduced to `<html>` and `<body>`; providers and navbar moved to `(app)/layout.tsx` |
| `src/components/Navbar.tsx` | Adds an "Export Hub" link and the sync-status pill; mobile tab bar goes from 3 to 4 columns |
| `src/context/ExpenseContext.tsx` | Adds `importExpenses(incoming, "merge" \| "replace")` |
| `src/lib/storage.ts` | Exports `isExpense` so restores can validate records |
| `tailwind.config.ts` | Adds a `slide-in-right` animation |
| `package.json` / lock | Adds `qrcode-generator@1.4.4` |

### 5.2 Architecture overview

```
(app)/layout.tsx
  Providers (Expense, Toast, ExpenseActions)
    └─ CloudProvider ── one context for: integrations, history, schedules, shares,
       │                 lastBackupAt (persisted) + jobs, syncStatus (in memory)
       │                 + background scheduler + simulated live sync
       ├─ Navbar ─ SyncStatusPill
       ├─ /exports page
       │    ├─ ExportTab: TEMPLATES × DESTINATIONS → DeliverPanel (slide-over)
       │    │               ConnectDialog (simulated sign-in)   QuickActions (backup/restore)
       │    ├─ AutomationsTab → ScheduleDialog
       │    ├─ HistoryTab / SharesTab / IntegrationsTab
       └─ JobTray (floating, global)

(public)/shared/page.tsx   ← no providers; decodes the link in the browser
        ▲
        └── URL "#1.<base64url(gzip(json))>" or "#1e.<…(salt|iv|AES-GCM ciphertext)>"
```

**Delivery pipeline:** template → `buildArtifact(template, expenses, params)` produces an `ExportArtifact`. Then `deliver({artifact, destination, target})` creates a **job** (queued → running → completed / failed / cancelled), which adds a `HistoryEntry` and updates integration and backup status.

### 5.3 Key components

| Unit | Responsibility |
|---|---|
| `templates.ts` | Four use-case templates, each with a `scope` (year, month, rolling 6 months, all). `buildArtifact` writes the content; there are also helpers for TSV, Markdown tables and plain-text summaries. |
| `destinations.ts` | Metadata for each destination: icon and color, whether it needs a connection, whether it's `simulated`, whether it can be scheduled, a default target |
| `share.ts` | `encodeShare` / `decodeShare`: gzip through `CompressionStream`; optional PBKDF2-SHA256 key derivation (210k iterations) with AES-256-GCM encryption; URL-safe base64; a version prefix; typed errors (`invalid`, `wrong-password`, `unsupported`) |
| `schedule.ts` | `computeNextRun` (daily, weekly, monthly, local time, strictly after the reference time); readable descriptions; relative times through `Intl.RelativeTimeFormat` |
| `store.ts` | Saves and loads cloud state in localStorage (`spendwise:cloud:v1`); caps history at 100 |
| `CloudContext` | The job runner (simulated transfer time scales with file size, cancel via a ref set), delivery, connect/disconnect, share creation, schedule CRUD, the 20 s scheduler with catch-up, simulated Sheets live sync, the derived `syncStatus` |
| `DeliverPanel` | The per-destination form and the share-link result screen (QR, copy, native share). **~25 `useState` calls** |
| `ConnectDialog` | Three-step simulated sign-in: consent screen → "handshake" spinner → connected |
| `ScheduleDialog` | Automation builder with a next-3-runs preview and a not-connected warning |
| `JobTray` | Floating panel listing jobs, with progress and cancel; auto-dismisses after 8 s once idle |
| `QuickActions` | "Back up now" (to the first connected drive, else download), restore from backup (merge or replace), copy this month as TSV |
| `/shared` page | Public viewer: password prompt, expiry check, report, searchable line items, CSV download; `noindex` |

### 5.4 Libraries

- `qrcode-generator@1.4.4` (MIT, no dependencies, about 117 kB unpacked, released 2019). It's used only for its module matrix (`isDark`); the SVG is rendered by React, so no `innerHTML` is involved. Newer versions exist (2.0.x, released 2025); 1.4.4 was chosen as a long-proven release.
- Browser APIs: `CompressionStream`/`DecompressionStream`, `crypto.subtle` (PBKDF2, AES-GCM), `crypto.getRandomValues`, `navigator.clipboard`, `navigator.share`, `mailto:`, `Intl.RelativeTimeFormat`.

### 5.5 Patterns

- **Templates × destinations:** any template can go to any destination through one `ExportArtifact` contract.
- **Job queue with progress:** asynchronous loops that check a cancel set; jobs live in memory, history is persisted.
- **Provider as a service layer:** `CloudContext` holds business logic, persistence, scheduling and derived status together.
- **Data in the link (no server):** the share link *is* the data store, so nothing needs hosting.
- **Honest simulation:** a `simulated` flag on each destination drives "Simulated" badges, disclaimers and "(simulated)" in toasts. Wherever possible a real fallback sits next to the simulated path: mailto, TSV or Markdown copy.
- **Route groups:** `(app)` and `(public)` let `/shared` render without the app shell.
- **Recipes:** pre-filled schedule drafts to get started quickly.

### 5.6 Complexity

**High**, and concentrated in two places:

- **`CloudContext.tsx` (430 lines):** 17 `useCallback`s, 5 effects, and refs that mirror state (`stateRef`, `expensesRef`) for async code. It mixes persistence, the job runner, scheduling, sharing and status in one module. It's hard to test in isolation and easy to break.
- **`DeliverPanel.tsx` (523 lines, ~25 `useState`s):** the configuration for all six destination types lives in one component's state. This should be split into one sub-form per destination.

Everything else is moderate. The `lib/cloud` modules are pure and testable.

### 5.7 Error handling

**Handled:**

- Delivering to a disconnected service: the job fails with "`<Service>` isn't connected", there's an error toast, and the history entry says failed. Schedules show "disconnected — runs will fail".
- Share decoding: separate screens for wrong password, broken or incomplete link, expired link, and unsupported browser. A tampered encrypted link is rejected because AES-GCM authenticates the data.
- Restore: wrong file shape or zero valid records → "That file isn't a Spendwise backup". Each record is validated with `isExpense`. Merging skips duplicate IDs.
- Clipboard: falls back to `execCommand("copy")`, then shows an error toast.
- Recipient entry: checks each address and shows the bad one.
- Corrupt cloud state in storage → falls back to an empty state.

**Gaps (details in §6):**

- **Two tabs overwrite each other's cloud state.** There's no `storage` listener, so whichever tab saves last wins, and both tabs run schedules (duplicate runs).
- **No limit on share-link size.** 10,000 items make an **84 KB URL**, which messaging and email clients may truncate.
- **The backup-status pill can say "Backed up" after a *simulated* upload,** although no data was stored anywhere.
- The changes-since-backup count ignores deletions, and restored records that keep old `updatedAt` values.
- Email "Send secure link" creates a share link, but doesn't show it in the email panel (it appears under Shared links).
- `saveCloudState` errors are only logged; a full storage quota fails silently. Shares store full URLs and aren't capped, so they can grow large.
- **Replace on restore has no undo** beyond its confirmation step.

### 5.8 Security

| Area | Assessment |
|---|---|
| Share-link confidentiality | The data travels in the URL fragment, which browsers don't send to the server. **But** any script on the page (analytics, extensions) can read `location.hash`, and links persist in browser history, sync and chat logs. Unprotected links are readable by anyone who has them; that's by design. |
| Encryption | AES-256-GCM with a random 16-byte salt and 12-byte IV per link, and a key derived from the password with PBKDF2-HMAC-SHA256 at **210,000 iterations**. That's **below OWASP's current guidance of 600,000 for SHA-256** (210k is their figure for SHA-512). Measured cost is about 25–40 ms, so tripling it is affordable. |
| Expiry | **Advisory only.** It's checked in the viewer's browser and stored inside the data; anyone who can decode the link can make a copy without the expiry. The UI is honest about links not being revocable. |
| Password entry | Uses `type="text"`, so the password is visible on screen. Arguably useful when sharing it, but it should at least offer a reveal toggle. |
| XSS | All shared content renders through React's text escaping, with no `dangerouslySetInnerHTML`. The QR is built from path data, not markup. |
| Injection in outputs | The formula-injection guard is applied to Tax Report and Category Analysis CSVs and the shared-page CSV. Markdown output escapes `\|`, `*` and `_` in descriptions. TSV strips tabs and newlines. |
| Mock OAuth | No real tokens. It shows a fixed demo account (`you@example.com`), clearly badged. |
| Indexing | `/shared` sets `robots: noindex, nofollow`. |

### 5.9 Performance

| Rows | Tax Report | Monthly Summary | Category Analysis | Full Backup | Share link (with items) | Password-protected encode |
|---|---|---|---|---|---|---|
| 1,000 | 5.8 ms / 38 KB | 1.4 ms | 1.7 ms | 0.8 ms / 235 KB | **9.4 KB** URL in 23 ms | 28 ms |
| 10,000 | 11.9 ms / 354 KB | 2.1 ms | 3.1 ms | 7.6 ms / 2.4 MB | **84 KB** URL in 15 ms | 38 ms |

(The benchmark data is repetitive, so it compresses better than real data; gzip took 52 KB of JSON down to 9.4 KB. Expect larger links in real use.)

- **Re-render pressure:** job progress updates every ~110 ms, and `jobs` lives in the same memoized context value as everything else. So **every `useCloud()` consumer re-renders about 9 times a second** during a transfer: the navbar pill, the whole hub page and the job tray. That's fine at this size, but it's the first thing to fix if the hub grows. Fix: a separate `JobsContext`, or a store with selectors.
- The `ExportTab` artifact is rebuilt on every expense change while the tab is open (cheap: ≤12 ms at 10k rows).
- The scheduler checks every 20 s while any app page is open.
- **Bundle:** `/exports` is 128 kB first-load, the largest route. `/shared` is 103 kB and doesn't load the app's providers.

### 5.10 Extensibility and maintainability

- **Good:** new templates (one `case` in `buildArtifact` plus metadata) and new destinations (metadata plus a branch in `DeliverPanel` and `jobCopy`). The pure `lib/cloud` modules are easy to test.
- **Weak:**
  - `CloudContext` is a "god provider".
  - `DeliverPanel` is a switch on destination type spread across one component.
  - Templates and V2's format registry are parallel concepts that don't share code (V3 has its own CSV escaper, a third copy in the codebase).
- **Product risk:** six of the eight destinations are simulated. Making them real requires a backend (OAuth client secrets, token storage, server-side uploads and email sending, a real scheduler). The UI shapes are reusable, but `deliver()`'s internals would be replaced entirely.

### 5.11 Technical deep dive

| Question | Answer |
|---|---|
| How does export work? | The user picks a template and its period → `buildArtifact` makes an `ExportArtifact` (filename, MIME type, content, rows, scope label) → picks a destination → for connected services, `DeliverPanel` opens (or `ConnectDialog` first if not connected) → submitting calls `deliver()` or `createShare()` → the panel closes and the job runs in the background with progress in the `JobTray` → history and status update when it finishes. |
| File generation | Strings per template: CSV with section subtotals (Tax Report), a pivot table (Category Analysis), Markdown (Monthly Summary), JSON with `schema: "spendwise-backup"` (Full Backup). Downloads use a Blob and object URL. Share links: JSON → gzip → [PBKDF2 → AES-GCM] → base64url → `/shared#…`. |
| User interaction | A step-by-step hub (1. template, 2. destination), slide-over configuration, simulated sign-in, background jobs with cancel, schedule recipes, deep-linkable tabs (`#history`), and a public recipient view. |
| State management | `CloudContext` holds persisted state (integrations, history, schedules, shares, `lastBackupAt`) plus in-memory `jobs`; `syncStatus` is derived. Refs mirror state for async loops. Component-level `useState` handles form state. |
| Scheduling | `computeNextRun` gives the next run strictly after now. A tick on mount and then every 20 s runs schedules whose `nextRunAt ≤ now`, recomputing from *now*, so missed runs collapse into **one** catch-up run with a notice. Runs only happen while a tab is open. |
| Edge cases | Monthly schedules are limited to days 1–28 to avoid month-length problems; the December → January rollover is tested. Empty templates show a warning and a disabled action. A dense-QR warning appears above 900 characters. `navigator.share` is feature-detected. Missing CompressionStream or WebCrypto → "unsupported" screen. Restore detects duplicates by ID. |

---

## 6. Issue register

Severity reflects impact if this branch were adopted as-is. **All items were checked in the branch source.**

| # | Ver. | Severity | Finding | Evidence | Suggested fix |
|---|---|---|---|---|---|
| 1 | All | **High** | No automated tests committed. Logic was checked with throwaway scripts that aren't in any branch. | `git ls-files` shows no test or spec files on any branch | Add Vitest; port the scratch checks (CSV escaping, column order, PDF index offsets, share round-trip, schedule rollover) |
| 2 | V3 | **High** | Two open tabs overwrite each other's cloud state (last save wins), and both tabs run due schedules. | `CloudContext.tsx` has no `storage` listener | Listen for `storage` events and merge; elect one tab to run schedules (`BroadcastChannel` or Web Locks API) |
| 3 | V3 | **High** (honesty) | A *simulated* Full Backup to Dropbox, Drive or OneDrive sets `lastBackupAt`, and the navbar then says "Backed up". | `CloudContext.tsx:141` sets it for any completed `full-backup` | Only count real destinations (download), or label it "Backed up (simulated)" |
| 4 | V3 | Medium | No limit on share-link size; 10k items produce an 84 KB URL. | Benchmark §5.9; only `qrIsDense` checks length | Warn above ~8 KB and default to summary-only; require summary-only above ~32 KB |
| 5 | V3 | Medium | PBKDF2-SHA256 uses 210k iterations, below OWASP's 600k. | `share.ts:10` | Raise to 600k (≈ +50 ms), or use SHA-512 at 210k; record the iteration count in the link prefix |
| 6 | V3 | Medium | Job progress re-renders every `useCloud()` consumer about 9×/s. | `jobs` in the context value (`CloudContext.tsx:418`); 110 ms tick (`:199`) | Split out a `JobsContext`, or use `useSyncExternalStore` with selectors |
| 7 | V3 | Medium | `DeliverPanel` has ~25 `useState`s across six destination types. | File review | One sub-form component per destination, each reporting its target |
| 8 | V2 | Medium | PDF generation blocks the main thread (~470 ms at 10k rows) and isn't compressed (3.5 MB). | Benchmark §4.9; no `/Filter` in `pdf-writer.ts` | Move to a Web Worker; compress content with `CompressionStream("deflate")` and `/FlateDecode` |
| 9 | V2 | Medium | PDF replaces non-Latin characters with `?` without warning. | `toWinAnsi` in `pdf-writer.ts` | Warn in the preview when it happens; embed a Unicode font if needed |
| 10 | All | Medium | `Modal` (and V3's `SlideOver`) have no focus trap; Tab can move to the page behind. | No `Tab` key handling in `Modal.tsx` on any branch | Add a focus trap, or use `<dialog>` with `showModal()` |
| 11 | V1 | Low | The dashboard export has no `try/catch` or success feedback. | `src/app/page.tsx:57` | Wrap in try/catch and show a toast, like the Expenses page |
| 12 | V1 | Low | Reordering columns silently changed the existing Expenses-page CSV too. | Shared `expensesToCSV` | Intended? If so, document it and pin it with a test |
| 13 | V3 | Low | Share-link password field is `type="text"`. | `DeliverPanel.tsx:369` | `type="password"` with a reveal toggle |
| 14 | V3 | Low | The changes-since-backup count ignores deletions and restores. | `CloudContext.tsx:394` | Track a data revision counter in `ExpenseContext` |
| 15 | V3 | Low | Email "secure link" mode creates a link without showing it in the panel. | `DeliverPanel.tsx:200` discards the result | Show the link in the email preview and a copy control |
| 16 | V3 | Low | `not-found.tsx` now renders without the navbar (outside the `(app)` group). | Route restructure | Add a not-found page inside `(app)`, or give the root not-found its own minimal header |
| 17 | V3 | Low | Persisted shares (full URLs) aren't capped; storage-full errors are only logged. | `store.ts`, `CloudContext` save effect | Cap or trim the share list; show an error toast if saving fails |
| 18 | V2/V3 | Low | Three separate CSV escapers (`main`/V1, V2 `formats/csv.ts`, V3 `templates.ts` and `/shared`). | grep | One shared `csv.ts` utility |
| 19 | V1 | Info | `revokeObjectURL` runs at `setTimeout(…, 0)`. | `src/lib/expenses.ts:91` | Use ~1 s like V2 for safety |

---

## 7. Cross-cutting comparison

### 7.1 Scorecard (1 = weak, 5 = strong)

| Criterion | V1 | V2 | V3 | Notes |
|---|:-:|:-:|:-:|---|
| Feature depth | 1 | 4 | 5 | V3 is broadest, but much of it is simulated |
| Works as shipped (no backend) | 5 | 5 | 3 | V3: 2 of 8 destinations (download, share link) fully real, plus the mailto and copy fallbacks |
| Code clarity | 5 | 4 | 3 | V3 has two oversized units |
| Architecture and layering | 2 | 5 | 3 | V2's pure engine and registry is the cleanest |
| Extensibility | 1 | 5 | 4 | Both use registries; V3 also has templates |
| Error handling | 2 | 4 | 3 | V2 is complete for its scope; V3 has the gaps in §6 |
| Security | 4 | 4 | 3 | V3 has the most exposure (links, crypto settings), handled reasonably |
| Performance | 5 | 3 | 4 | V2's PDF is the main-thread outlier; V3's re-render pressure |
| Accessibility | 4 | 3 | 3 | Labels and ARIA present everywhere; no focus trap in V2/V3 dialogs |
| Bundle cost | 5 | 4 | 4 | +0 / +10 kB / +1 kB on the dashboard (V3's cost sits on `/exports`) |
| Testability | 3 | 5 | 4 | Pure modules in V2 and V3; nothing committed anywhere |
| Maintenance burden | 5 | 3 | 2 | V2: custom PDF writer. V3: size, and simulated services that need a backend to become real |

### 7.2 Choosing by use case

| If the priority is… | Choose |
|---|---|
| Ship today, minimum risk | V1 (after fix #11) |
| Accountants or power users who need exact, filtered, multi-format files | V2 |
| Sharing, backups, recurring workflows, a "connected" product story | V3's share links, backup/restore and templates; the cloud services only once there's a backend |

---

## 8. Recommendation

**Adopt V2's engine as the core and layer on the parts of V3 that work for real. Keep V1's one-click export as the default quick action.**

1. **Core: V2's `lib/export`.** Keep the `Exporter` registry, `ExportContext`, column model, filename handling and preview-equals-output design. Fix #8 (move PDF to a worker and compress it) and #9 (warn about non-Latin text).
2. **Quick path, inspired by V1:** a split button, **Export ▾**. The main click runs CSV with default options straight away; the arrow opens V2's dialog. This keeps V1's zero-friction path with no duplicate code.
3. **Bring over from V3, rebuilt on V2's registry:**
   - **Templates** become named presets of `ExportOptions` plus a format. Tax Report and Category Analysis become new `Exporter`s (subtotal CSV, pivot CSV); Monthly Summary becomes a Markdown exporter.
   - **Full Backup and restore** become the JSON exporter with `schema: "spendwise-backup"`, plus `importExpenses`.
   - **Share links** become a "Share" destination next to "Download" in the dialog. Apply fixes #4 (size limits), #5 (600k iterations) and #13 (password field). Keep `/shared` and the `(public)` route group.
   - **Copy as table / Markdown:** cheap and real.
4. **Defer** email, Sheets, Drive, Dropbox, OneDrive, Notion, live sync and schedules until there's a backend. They need server-side OAuth, token storage and a real scheduler. Keep V3's UI components (`ConnectDialog`, `JobTray`, `ScheduleDialog`) on a branch as design references.
5. **Before merging anything:** fix #1 (tests) and #10 (focus trap). If any of V3's state comes along, also fix #2 (multi-tab) and #6 (split the context).

**Estimated combined change:** about V2's size (~1,400 lines) plus ~600 for the share and backup modules, with **no new runtime dependency** apart from optionally keeping `qrcode-generator` for share QR codes.

---

### Appendix A: Raw measurements

**Production builds** (`next build`, Next 14.2.35). Each cell is page JS / first-load JS:

| Route | `main` | V1 | V2 | V3 |
|---|---|---|---|---|
| `/` | 6.28 kB / 110 kB | 7.95 kB / 110 kB | 5.13 kB / 120 kB | 3.80 kB / 111 kB |
| `/expenses` | 5.12 kB / 99.7 kB | 6.49 kB / 99.5 kB | 3.59 kB / 109 kB | 2.59 kB / 101 kB |
| `/exports` | — | — | — | 25.8 kB / 128 kB |
| `/shared` | — | — | — | 6.94 kB / 103 kB |
| Shared chunks | 87.3 kB | 87.3 kB | 87.3 kB | 87.3 kB |

**Benchmark setup:** synthetic expenses spread over 365 days across all six categories; each branch's source bundled with esbuild and run on Node 24.15. Times are single runs and include JIT warm-up, so treat them as rough magnitudes.
