"use client";

import { Pencil, Trash2 } from "lucide-react";
import type { Expense } from "@/types/expense";
import { formatCurrency, formatDate } from "@/lib/format";
import { useExpenseActions } from "./Providers";
import { CategoryBadge, CategoryIcon } from "./ui";

export function ExpenseRow({ expense, compact = false }: { expense: Expense; compact?: boolean }) {
  const { openEdit, requestDelete } = useExpenseActions();

  return (
    <li className="group flex items-center gap-3 px-4 py-3.5 transition hover:bg-slate-50/80 sm:gap-4 sm:px-5">
      <CategoryIcon category={expense.category} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">{expense.description}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          <time dateTime={expense.date}>{formatDate(expense.date)}</time>
          {!compact && (
            <span className="hidden sm:inline">
              <CategoryBadge category={expense.category} />
            </span>
          )}
          {compact && <span>· {expense.category}</span>}
        </div>
      </div>
      <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">{formatCurrency(expense.amount)}</p>
      <div className="flex shrink-0 items-center gap-0.5 sm:opacity-0 sm:transition sm:focus-within:opacity-100 sm:group-hover:opacity-100">
        <button
          type="button"
          onClick={() => openEdit(expense)}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-brand-50 hover:text-brand-600"
          aria-label={`Edit ${expense.description}`}
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => requestDelete(expense)}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
          aria-label={`Delete ${expense.description}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}
