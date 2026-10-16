# Data Export (Export Hub) — Implementation

> **Feature type:** Frontend (client-only, no server). Some destinations are **simulated**; see [Real vs simulated](#real-vs-simulated).
> **User guide:** [How to export, share and back up your expenses](../user/how-to-data-export.md)
> **Index:** [Documentation home](../README.md)
> **Branch:** `feature-data-export-v3`

A SaaS-style **Export Hub** at `/exports` that combines use-case **templates** (Tax Report, Monthly Summary, Category Analysis, Full Backup) with **destinations** (download, email, share link, Google Sheets, Google Drive, Dropbox, OneDrive, Notion). Deliveries run as background **jobs** with progress, are recorded in **history**, and can be **scheduled**. Share links carry the report inside the URL and open on a public, chrome-less `/shared` page.

---

## Real vs simulated

| Works for real (no backend needed) | Simulated in this demo |
|---|---|
| Browser **download** of every template | **Email** sending |
| **Share links** (+ password, expiry, QR) and the `/shared` viewer | **Google Sheets** upload and **live sync** |
| **Open in mail app** (`mailto:` with subject + summary) | **Google Drive**, **Dropbox**, **OneDrive** uploads |
| **Copy as table** (TSV) and **Copy as Markdown** (clipboard) | **Notion** publishing |
| **Back up now** to this device, **Restore from backup** | OAuth **connect** flow (`ConnectDialog`) |
| Schedules, history, sync-status pill (local bookkeeping) | |

Simulated destinations have `simulated: true` in `src/lib/cloud/destinations.ts`, which drives the amber **Simulated** badge, an in-panel disclaimer, and a "(simulated)" suffix on toasts. They go through the full job/history pipeline, but **no data leaves the browser**.

**Making them real would need a backend:** OAuth client registration and a server-side token exchange, encrypted refresh-token storage per user, server-side upload/email APIs (provider SDKs or SMTP/transactional email), a durable job queue with retries, and a server scheduler (cron) so automations run when no tab is open. The UI contracts (`ExportArtifact`, `DeliverRequest`, `HistoryEntry`, `Schedule`) can stay; the body of `deliver()` would become an API call.

## Architecture

```
src/app/layout.tsx            <html><body> only
├─ (app)/layout.tsx           Providers → CloudProvider → Navbar, <main>, JobTray
│   ├─ page.tsx               Dashboard          (URL /)
│   ├─ expenses/page.tsx      Expenses           (URL /expenses)
│   └─ exports/page.tsx       Export Hub         (URL /exports)
│        ├─ ExportTab ── TEMPLATES × DESTINATIONS
│        │     ├─ ConnectDialog (mock OAuth, if not connected)
│        │     ├─ DeliverPanel  (SlideOver, per-destination config)
│        │     └─ QuickActions  (Back up now · Restore · Copy month)
│        ├─ AutomationsTab ── ScheduleDialog
│        ├─ HistoryTab · SharesTab · IntegrationsTab
└─ (public)/shared/page.tsx   Shared report viewer (URL /shared) — no providers, noindex
```

**Delivery pipeline:**

```
buildArtifact(templateId, expenses, params) ─► ExportArtifact
        │
        ├─ destination = share-link ─► createShare() ─► encodeShare() ─► /shared#<token>
        │
        └─ deliver({artifact, destination, target}) ─► Job (queued → running → completed|failed|cancelled)
                                                        │   progress ticks shown in JobTray
                                                        ▼
                                              HistoryEntry + integration.lastSyncAt + lastBackupAt
```

Route groups `(app)` and `(public)` don't change URLs; they let `/shared` render without the app shell (navbar, providers).

## Files

| File | Role |
|---|---|
| `src/app/(app)/layout.tsx` | Mounts `Providers`, `CloudProvider`, `Navbar`, `JobTray` for all app pages |
| `src/app/(app)/exports/page.tsx` | Export Hub: stat cards, tabs (deep-linkable via `#export`, `#automations`, `#history`, `#shared`, `#integrations`), schedule dialog host |
| `src/app/(public)/shared/page.tsx` + `layout.tsx` | Public viewer: decode, password prompt, expiry, report, CSV download; `robots: noindex` |
| `src/context/CloudContext.tsx` | State, persistence, job runner, `deliver`, `createShare`, schedules + scheduler, simulated live sync, `syncStatus` |
| `src/lib/cloud/types.ts` | `TemplateId`, `DestinationId`, `ExportArtifact`, `Job`, `HistoryEntry`, `Schedule`, `ShareLink`, `SharePayload`, `Integration` |
| `src/lib/cloud/templates.ts` | `TEMPLATES`, `buildArtifact`, `defaultParams`, `describeScope`, `templateRows`, `toTSV`, `toMarkdownTable`, `plainSummary` |
| `src/lib/cloud/destinations.ts` | `DESTINATIONS` metadata, `DEMO_ACCOUNT` |
| `src/lib/cloud/share.ts` | `encodeShare`, `decodeShare`, `isProtectedToken`, `shareUrl`, `ShareError` |
| `src/lib/cloud/schedule.ts` | `computeNextRun`, `describeSchedule`, `formatTime`, `relativeTime`, `WEEKDAYS` |
| `src/lib/cloud/store.ts` | `loadCloudState` / `saveCloudState`, `HISTORY_LIMIT` |
| `src/lib/cloud/clipboard.ts`, `format.ts` | Clipboard with `execCommand` fallback; `formatBytes` |
| `src/components/cloud/DeliverPanel.tsx` | Slide-over config for each destination + share-link result (QR, copy, native share) |
| `src/components/cloud/ConnectDialog.tsx` | Mock OAuth: consent → "handshake" (1.6 s) → connected |
| `src/components/cloud/ScheduleDialog.tsx` | Automation builder with next-3-runs preview |
| `src/components/cloud/JobTray.tsx` | Floating activity panel: progress, cancel, auto-dismiss |
| `src/components/cloud/SyncStatusPill.tsx` | Navbar backup status (≥ `md` screens) |
| `src/components/cloud/QRCode.tsx` | SVG QR from `qrcode-generator` module matrix; `qrIsDense()` |
| `src/components/cloud/SlideOver.tsx`, `bits.tsx` | Drawer; `DestinationTile`, `SimulatedBadge`, `StatusDot`, `Toggle` |
| `src/components/cloud/hub/*.tsx` | `ExportTab`, `QuickActions`, `AutomationsTab`, `HistoryTab`, `SharesTab`, `IntegrationsTab` |
| `src/context/ExpenseContext.tsx` | Adds `importExpenses(incoming, "merge" \| "replace")` |
| `src/lib/storage.ts` | `isExpense` is now exported (used by restore) |
| `src/components/Navbar.tsx` | "Export Hub" link; sync pill; mobile bar now 4 columns |

**Dependency added:** `qrcode-generator@1.4.4` (MIT, zero dependencies).

## Templates

| Template | Format | Scope (`params`) | Content |
|---|---|---|---|
| Tax Report | CSV (BOM) | `year` | Title lines, then per category: rows + `Subtotal — <Category> (n)`; grand `TOTAL` row. Filename `tax-report-<year>.csv` |
| Monthly Summary | Markdown | `month` (`YYYY-MM`) | Total, count, daily average (days elapsed if current month, else days in month), ▲/▼ % vs previous month, category table, top 5 purchases. `monthly-summary-<month>.md` |
| Category Analysis | CSV (BOM) | rolling 6 months | Category × month pivot + Total, Avg / month, Share %; totals row. `category-analysis-<today>.csv` |
| Full Backup | JSON | all | `{ schema: "spendwise-backup", schemaVersion: 1, exportedAt, count, expenses: Expense[] }`. `spendwise-backup-<today>.json` |

All CSV cells use the formula-injection guard (`'` prefix for `= + - @ \t \r`) and RFC 4180 quoting.

## API

### `useCloud()` (`src/context/CloudContext.tsx`)

```ts
interface CloudContextValue extends CloudState {   // integrations, history, schedules, shares, lastBackupAt
  hydrated: boolean;
  jobs: Job[];
  syncStatus: { state: "syncing"; label } | { state: "never" } | { state: "stale"; changes; since } | { state: "ok"; since };
  deliver(req: DeliverRequest): Promise<HistoryEntry | null>;   // null if cancelled
  cancelJob(id): void;  clearFinishedJobs(): void;
  connect(id): void;    disconnect(id): void;
  setLiveSync(target: { spreadsheet; sheet } | null): void;
  createShare(artifact, params, { includeItems, expiresInDays, password?, sharedBy?, note? }): Promise<ShareLink>;
  removeShare(id): void;
  saveSchedule(schedule): void; removeSchedule(id): void; toggleSchedule(id): void; runScheduleNow(id): void;
  clearHistory(): void;
}
```

### Templates and sharing

```ts
buildArtifact(templateId, expenses, params, now?): ExportArtifact;  // filename, mimeType, content, bytes, recordCount, rows, scopeLabel
encodeShare(payload: SharePayload, password?): Promise<string>;     // "1.<b64url>" | "1e.<b64url>"
decodeShare(token, password?): Promise<SharePayload>;                // throws ShareError("invalid" | "wrong-password" | "unsupported")
computeNextRun({ frequency, weekday, dayOfMonth, time }, from?): Date; // strictly after `from`, local time
```

## Implementation notes

### Job pipeline (`deliver`)

1. Adds a `queued` job (tray keeps the newest 8).
2. After 300 ms, fails immediately with "`<Name>` isn't connected" if the destination requires a connection and isn't connected.
3. Runs: progress eases to 98 % over a simulated transfer time `min(4800, 1400 + bytes / 25)` ms (500 ms for download), ticking every 110 ms and checking a cancel set.
4. On completion: download triggers a real Blob download; writes a `HistoryEntry`; updates `integrations[dest].lastSyncAt`; sets `lastBackupAt` if the template is `full-backup`; toasts (manual runs only).

`JobTray` expands when work starts and clears finished jobs 8 s after everything settles.

### Share links (`src/lib/cloud/share.ts`)

| Step | Detail |
|---|---|
| Payload | `SharePayload` v1: title, scope, sharedBy, note, createdAt, expiresAt, summary (count, total, byCategory, first/last date), optional `items: [date, category, amount, description][]` |
| Compress | `JSON` → UTF-8 → `CompressionStream("gzip")` |
| Encrypt (optional) | PBKDF2-HMAC-SHA256, **210,000** iterations, 16-byte random salt → AES-256-GCM with 12-byte random IV. Output `salt ‖ iv ‖ ciphertext` |
| Encode | base64url (no padding); prefix `1.` (plain) or `1e.` (encrypted) |
| URL | `${origin}/shared#<token>` — the fragment is never sent to the server |

The `/shared` viewer decodes in the browser, prompts for a password for `1e.` tokens, shows dedicated screens for wrong password / broken link / unsupported browser, and refuses links past `expiresAt`. Expiry is **advisory**: it is checked client-side, so anyone who can decode a link can re-encode it without one.

Defaults in `DeliverPanel`: expiry 7 days; *Include line items* on when ≤ 150 records. The QR is hidden behind "Show anyway" when the URL exceeds 900 characters (`qrIsDense`).

### Schedules

- `computeNextRun` handles daily / weekly (weekday 0–6) / monthly (day 1–28, avoiding short-month issues) at `HH:MM` local time.
- The scheduler ticks on mount and every **20 s** while any app page is open. Due schedules run with `trigger: "schedule"`; `nextRunAt` is recomputed from *now*, so any number of missed runs collapse into **one** catch-up run (with an info toast on first tick).
- Schedules can't target **Download** or **Share link** (`schedulable: false`).
- Automations **only run while a Spendwise tab is open**.

### History, shares and integrations

- History is capped at **100** entries (`HISTORY_LIMIT`), newest first. **Re-run** rebuilds the artifact from *current* data with the stored params and sends it to the same destination/target (not available for share links).
- Shares store metadata + full URL. Removing one only removes it from the list.
- `connect()` stores `{ connected, account: "you@example.com", connectedAt }`. Disconnecting makes subsequent deliveries and schedule runs fail with a clear error.
- **Simulated live sync:** when Google Sheets is connected with a `liveSync` target, every expense change shows "Syncing…" for 1.8 s, then bumps `lastSyncAt`.

### Sync-status pill (`syncStatus`)

| State | Condition | Pill |
|---|---|---|
| `syncing` | Any job queued/running, or live sync in progress | "Syncing…" (blue) |
| `never` | No `lastBackupAt` | "Not backed up" (grey) |
| `stale` | Some expense has `updatedAt > lastBackupAt` | "N unsaved changes" (amber) |
| `ok` | Otherwise | "Backed up" (green) |

`lastBackupAt` is set by any **completed Full Backup**, whatever the destination.

### Backup and restore (`QuickActions`)

- **Back up now** delivers Full Backup to the first connected of Dropbox → Google Drive → OneDrive, otherwise downloads it.
- **Restore** accepts a Spendwise backup (`schema: "spendwise-backup"`) or a bare `Expense[]`; records are filtered with `isExpense`. A confirmation offers **Merge** (adds records whose `id` isn't present) or **Replace all**, via `importExpenses`.

### Persistence

Cloud state (`integrations`, `history`, `schedules`, `shares`, `lastBackupAt`) is saved to `localStorage` key **`spendwise:cloud:v1`** on every change; jobs are in memory only. Corrupt JSON falls back to an empty state.

## Edge cases and error handling

| Case | Behavior |
|---|---|
| Destination disconnected (manual or scheduled) | Job fails, error toast, history entry `failed`; Automations shows "disconnected — runs will fail" |
| Template has 0 records | Warning in panel; primary action disabled |
| Invalid email recipient | Inline error naming the bad address; send blocked until ≥ 1 valid recipient |
| Job cancelled | History entry `cancelled`; no file delivered |
| Wrong password / tampered encrypted link | "That password didn't work." (AES-GCM authentication rejects tampering) |
| Truncated / garbage link | "This link is broken" screen |
| `CompressionStream` / WebCrypto missing | Share creation error toast; viewer shows "Browser not supported" |
| Restore of a non-backup file | "That file isn't a Spendwise backup" |
| Clipboard blocked | Falls back to `execCommand("copy")`, then an error toast |
| Corrupt `spendwise:cloud:v1` | Starts with empty cloud state |

## Security

- **Share-link confidentiality:** data lives in the URL fragment (not sent in HTTP requests or logged by servers) but persists in browser history, sync and chat logs, and can be read by any script on the `/shared` page (avoid adding analytics there). Unprotected links are readable by anyone holding them.
- **Encryption:** AES-256-GCM with per-link random salt and IV. PBKDF2 at **210k iterations of SHA-256 is below OWASP's current 600k recommendation** (210k is their SHA-512 figure).
- **Expiry and revocation:** advisory only (client-checked, self-contained links). The UI tells users that removing a link doesn't recall copies.
- **XSS:** all shared content renders as React text; QR is SVG path data (no `innerHTML`).
- **Output injection:** CSV formula guard on Tax Report, Category Analysis and the `/shared` CSV; Markdown escapes `|` (tables) and strips `|*_` from top-purchase lines; TSV strips tabs/newlines.
- **Mock OAuth:** no real tokens or accounts; shows the fixed demo account `you@example.com`.
- `/shared` is `noindex, nofollow`.

## Performance

| Rows | Tax Report | Full Backup | Share link with items | Password encode |
|---|---|---|---|---|
| 1,000 | ~6 ms / 38 KB | ~1 ms / 235 KB | ~9 KB URL | ~28 ms |
| 10,000 | ~12 ms / 354 KB | ~8 ms / 2.4 MB | **~84 KB URL** | ~38 ms |

(Benchmark data is repetitive and compresses better than real data.) `/exports` is the largest route at 128 kB first-load JS. During a job, the 110 ms progress tick re-renders **every** `useCloud()` consumer (~9×/s) because `jobs` shares the context value.

## Extending

**Add a template:** add the id to `TemplateId` (`types.ts`); add a `TemplateDefinition` to `TEMPLATES` (name, description, audience, format, `scope`, accent); add a `case` in `buildArtifact` (and in `templateRows`/`defaultParams` if it needs a new scope); add an icon to `TEMPLATE_ICONS` in `hub/ExportTab.tsx`.

**Add a destination:** add the id to `DestinationId`; add metadata to `DESTINATIONS` (icon, color, `requiresConnection`, `simulated`, `schedulable`, `defaultTarget`); add copy in `jobCopy()` and a label in `DeliverPanel`'s `primaryLabel`; add a config section in `DeliverPanel` and a target in its `target` switch; optionally consent scopes in `ConnectDialog`'s `SCOPES`.

## Testing

No automated tests are committed. Manual checklist:

- [ ] Each template downloads with the expected filename and content
- [ ] Share link (no password) opens in a private window; summary-only link shows a scannable QR
- [ ] Password link: wrong password rejected, correct one opens; editing a character in the token shows an error
- [ ] Expired link (create with 24 h, change system clock) shows the expired screen
- [ ] Connect Dropbox → upload shows progress in the tray → history entry; cancel mid-way → `cancelled`
- [ ] Disconnect Dropbox → scheduled run fails with a clear message
- [ ] Create a daily automation a minute in the future → runs within ~20 s of due time; close the tab past due → one catch-up on reopen
- [ ] Restore a backup: Merge adds only new ids; Replace swaps the list
- [ ] Pill: no backup → "Not backed up"; after Back up now → "Backed up"; edit an expense → "1 unsaved change"

## Known limitations

- **Two open tabs overwrite each other's cloud state** (no `storage` listener; last save wins) and **both run due schedules** (duplicate runs).
- **A simulated Full Backup marks the pill "Backed up"** even though nothing was stored off-device.
- **Share-link size is unbounded** (≈ 84 KB URL at 10k items); email/chat clients may truncate long URLs.
- **PBKDF2 iterations (210k SHA-256) are below OWASP's 600k guidance.**
- **Re-render pressure** during jobs (~9×/s for all `useCloud()` consumers).
- **`DeliverPanel` is large** (~520 lines, ~25 `useState`s for six destination types).
- **Password field is `type="text"`** (visible on screen).
- **"Unsaved changes" ignores deletions** and restored records with older `updatedAt`.
- Email "Send secure link" creates a link but doesn't show it in the email panel (it appears under **Shared links**).
- Shares aren't capped in storage; save failures for cloud state are only logged.
- `not-found.tsx` sits outside `(app)` and renders without the navbar.
- Automations need an open tab; integrations other than download/share/clipboard/mailto are simulated.

## Related documentation

- [CSV Export](csv-export-implementation.md) — the Expenses-page export, unchanged on this branch
- [Data Persistence](data-persistence-implementation.md) — `importExpenses`, storage format
- [Expense Management](expense-management-implementation.md) — `Expense` data model
- [Dashboard Analytics](dashboard-analytics-implementation.md) — shared aggregation helpers (`sumAmounts`, `totalsByCategory`)
