# How to export, share and back up your expenses

> **For developers:** [Data Export (Export Hub) implementation](../dev/data-export-implementation.md) · **All guides:** [Documentation home](../README.md)

The **Export Hub** sends your expenses wherever they need to go: a file on your computer, a private link for your accountant, or a recurring backup.

---

> 🧪 **About "Simulated" services**
> Email, Google Sheets, Google Drive, Dropbox, OneDrive and Notion are marked **Simulated**. In this version they show the full experience (connecting, progress, history) but **nothing is actually sent**: your data stays in your browser. Download, share links, backups and the copy/mail-app shortcuts work for real.

## Open the Export Hub

Click **Export Hub** in the top navigation. On a phone, it's the right-most item in the bottom bar.

![The Export Hub overview](../images/data-export/hub-overview.png)

The four cards at the top show your backup status, connected services, active automations and recent exports. Click a card to jump to its tab.

## Export a report

### 1. Choose a template

| Template | Best for | File |
|---|---|---|
| **Tax Report** | Your accountant: every expense for a year, grouped by category with subtotals | CSV |
| **Monthly Summary** | A readable recap: totals, change vs last month, top purchases | Markdown (`.md`) |
| **Category Analysis** | Budgeting: each category's spending over the last 6 months | CSV |
| **Full Backup** | Safekeeping: everything, in a format you can restore later | JSON |

For **Tax Report** pick the year, and for **Monthly Summary** pick the month, in the menu that appears on the selected card.

![Template cards with Monthly Summary selected](../images/data-export/templates.png)

### 2. Choose where to send it

Click a destination. A panel slides in from the right with its options:

| Destination | What you can set |
|---|---|
| **Download** | Nothing; the file saves straight to your device |
| **Share link** | See [Share a private link](#share-a-private-link) |
| **Email** *(Simulated)* | Recipients, subject, message, attach file or send a secure link, send me a copy. **Open in my mail app instead** opens your own email program with a summary (attach the file yourself). |
| **Google Sheets** *(Simulated)* | New or existing spreadsheet, tab name, **Keep in sync**. **Copy as table** puts the data on your clipboard to paste into any spreadsheet for real. |
| **Google Drive / Dropbox / OneDrive** *(Simulated)* | Folder, and whether to keep both or replace an existing file |
| **Notion** *(Simulated)* | Page, and page vs database rows. **Copy as Markdown** lets you paste into Notion for real. |

Click **Preview** in the panel to see the first lines of the file. Then click the main button (for example **Upload to Dropbox**). The panel closes and the work continues in the **activity tray** in the bottom-right corner, where you can watch progress or cancel.

![Destination panel for Dropbox and the activity tray](../images/data-export/deliver-panel.png)

> **Connect first:** services like Dropbox need to be connected once. If one isn't, you'll see a sign-in screen; click **Allow**, then **Continue**.

## Share a private link

Send a report without attachments. The report travels **inside the link**; nothing is uploaded.

1. Choose a template, then **Share link**.
2. Set the options:
   - **Include line items:** off shares totals and the category breakdown only (a shorter link and an easier QR code)
   - **Link expires:** 24 hours, 7 days, 30 days or never
   - **Password (optional):** encrypts the report; share the password separately (for example by text message)
   - **Shared by** and **Note:** shown to the recipient
3. Click **Create link**. Copy it, scan the **QR code** with a phone, click **Open preview**, or use **Share…** on supported devices.

![Share link result with QR code](../images/data-export/share-result.png)

### What the recipient sees

A clean report page with your note, totals, a category breakdown and (if included) a searchable list of expenses with a **CSV** download button. Password-protected links ask for the password first; expired links show *"This link has expired"*.

![Shared report as seen by the recipient](../images/data-export/shared-view.png)

> The link only works where your Spendwise app is hosted. A link created on `localhost` opens only on your own computer.

## Automate recurring exports

1. Open the **Automations** tab and click **New automation**, or pick a recipe such as *Weekly backup to Dropbox*.
2. Choose the template, destination, recipients or folder, and when it repeats (daily, weekly or monthly, plus the time).
3. Check the **next 3 runs** preview and click **Create automation**.

![Automation dialog with next runs preview](../images/data-export/automation-dialog.png)

On each automation you can **pause/resume** (switch), **Run now** (▶), **Edit** (pencil) or **Delete** (trash).

> ⚠️ Automations run **only while Spendwise is open in a browser tab**. If any were due while it was closed, each one runs **once** when you return, and you'll see a notice.

Tip: from any destination panel, click **Automate** to turn the current export into an automation.

## Review your history

The **History** tab lists every export, newest first, grouped by day: what was sent, where, how many records, and whether it was delivered, failed or cancelled. Scheduled runs are tagged **Scheduled**. Filter by destination or status, or click ↻ to **run an export again** with your current data.

![Export history](../images/data-export/history.png)

## Manage shared links

The **Shared links** tab lists your links with their expiry and password status. Copy a link, show its QR code, open it, or remove it from the list.

> Removing a link only removes it from **your list**. Anyone who already has it can keep opening it until it expires, so use an expiry and a password for anything sensitive.

## Connect or disconnect services

The **Integrations** tab shows each service's connection status and last activity. Click **Connect** or **Disconnect**. If Google Sheets is set to keep in sync, you can **Stop** syncing here.

## Back up and restore

### Back up now

On the **Export** tab, click **Back up now** in the blue card. Spendwise saves a **Full Backup** to your first connected cloud drive (simulated) or downloads it to this device.

### Restore from backup

1. Click **Restore from backup** and choose a Spendwise `.json` backup file.
2. Choose:
   - **Merge:** adds expenses that aren't already in your list
   - **Replace all:** swaps your current list for the backup (this can't be undone)

![Restore from backup dialog](../images/data-export/restore.png)

### The backup status badge

On larger screens, a badge next to **Add expense** shows:

| Badge | Meaning |
|---|---|
| **Not backed up** | You've never made a Full Backup |
| **N unsaved changes** | Expenses were added or edited since the last backup |
| **Backed up** | Nothing has changed since the last backup |
| **Syncing…** | An export is in progress |

> A backup sent to a **simulated** service also counts as "Backed up". To be sure you have a real copy, use **Back up now** with no cloud drive connected, so the file downloads to your device.

## Troubleshooting

**"Dropbox isn't connected — reconnect it in Integrations".**
The service was disconnected. Connect it on the **Integrations** tab, then **Run now** or re-run from **History**.

**The QR code isn't shown.**
The link is long because it includes every line item. Click **Show anyway**, or create a summary-only link (turn off **Include line items**).

**"That password didn't work".**
Check capitals and spaces, or ask the sender for the password again.

**"This link is broken".**
Part of the link was cut off, which is common when long links are pasted into some email or chat apps. Ask the sender to share it again, ideally as summary-only.

**"That file isn't a Spendwise backup".**
Choose a file created by the **Full Backup** template (`spendwise-backup-YYYY-MM-DD.json`).

**An automation didn't run.**
Automations need Spendwise open in a tab. Open the app; anything overdue runs once automatically.

## Related guides

- [How to export to CSV](how-to-csv-export.md): quick export of the Expenses list
- [How to keep your data safe](how-to-data-persistence.md)
- [How to search and filter expenses](how-to-expense-search-filtering.md)

---

### Screenshots needed

| File | What to capture |
|---|---|
| `images/data-export/hub-overview.png` | Export Hub with stat cards and tabs, sample data loaded |
| `images/data-export/templates.png` | Template cards with Monthly Summary selected and its month menu visible |
| `images/data-export/deliver-panel.png` | Dropbox slide-over panel open, activity tray showing an upload in progress |
| `images/data-export/share-result.png` | "Your link is ready" panel with QR code and badges |
| `images/data-export/shared-view.png` | `/shared` page in a private window showing a report |
| `images/data-export/automation-dialog.png` | New automation dialog with the next-runs preview |
| `images/data-export/history.png` | History tab with delivered, failed and scheduled entries |
| `images/data-export/restore.png` | Restore from backup confirmation with Merge and Replace buttons |
