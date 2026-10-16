# Spendwise — Expense Tracker

A personal expense tracker built with Next.js 14 (App Router), TypeScript and Tailwind CSS. All data is kept in your browser's `localStorage`.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

Other scripts: `npm run lint`, `npm run typecheck`.

## Features

- **Dashboard**: total, this-month (with change vs. last month), daily average and top-category cards; a 6-month spending chart; a category breakdown (this month or all time); and recent expenses.
- **Expenses**: search, category filter, date range (with presets), sorting, inline edit and delete, and "show more" paging.
- **Add / edit**: a modal form with validation and a native date picker. You can open it from the navbar, the mobile floating button, or a page action.
- **CSV export**: exports the currently filtered list. Cells are guarded against spreadsheet formula injection.
- **Persistence**: `localStorage` under the key `expense-tracker:expenses:v1`. Open tabs stay in sync, and corrupt data and storage errors are handled.
- Responsive layout with a bottom tab bar on mobile, toasts, loading skeletons and empty states.

## Project structure

```
src/
  app/            routes: / (dashboard), /expenses, error & 404 pages
  components/     UI components (form, modal, charts, list, filters…)
  context/        ExpenseContext (state + persistence), ToastContext
  lib/            formatting, validation, filtering/aggregation, CSV, storage, sample data
  types/          shared types and the category list
```

## Documentation

Feature documentation for developers and end users lives in [`docs/`](docs/README.md).
