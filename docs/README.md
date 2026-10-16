# Spendwise documentation

Each feature has two documents: a **developer** document (architecture, APIs, edge cases) and a **user guide** (step-by-step, with screenshots). They link to each other.

Generate docs for a new feature with the Claude Code command `/document-feature <feature name>` (see `.claude/commands/document-feature.md`).

## Features

| Feature | Developer docs | User guide |
|---|---|---|
| Expense Management | [Implementation](dev/expense-management-implementation.md) | [How to add, edit and delete expenses](user/how-to-expense-management.md) |
| Expense Search & Filtering | [Implementation](dev/expense-search-filtering-implementation.md) | [How to search and filter expenses](user/how-to-expense-search-filtering.md) |
| Dashboard Analytics | [Implementation](dev/dashboard-analytics-implementation.md) | [How to read your dashboard](user/how-to-dashboard-analytics.md) |
| Data Export (advanced dialog) | [Implementation](dev/data-export-implementation.md) | [How to export your expenses](user/how-to-data-export.md) |
| Data Persistence & Sample Data | [Implementation](dev/data-persistence-implementation.md) | [How to keep your data safe](user/how-to-data-persistence.md) |

## Conventions

- **Developer docs:** `docs/dev/<feature-slug>-implementation.md`
- **User guides:** `docs/user/how-to-<feature-slug>.md`
- **Screenshots:** `docs/images/<feature-slug>/<name>.png`. Each user guide ends with a *Screenshots needed* table listing the images it expects. Images not captured yet appear as broken image links until added.
- **Feature type:** every feature in this app is **frontend-only**. Data lives in the browser's `localStorage`, and there is no backend.

## Project overview

- Stack: Next.js 14 (App Router), TypeScript, Tailwind CSS
- Setup and scripts: see the [root README](../README.md)
- Source layout: `src/app` (routes), `src/components` (UI), `src/context` (state), `src/lib` (pure logic), `src/types`
