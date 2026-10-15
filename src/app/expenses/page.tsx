"use client";

import { useMemo, useState } from "react";
import { FileDown, Plus, SearchX } from "lucide-react";
import { useExpenses } from "@/context/ExpenseContext";
import { DEFAULT_FILTERS, describeRange, filterExpenses, sortExpenses, sumAmounts } from "@/lib/expenses";
import { formatCurrency } from "@/lib/format";
import { CATEGORIES, type ExpenseFilters, type SortKey } from "@/types/expense";
import { ExpenseFiltersBar } from "@/components/ExpenseFiltersBar";
import { ExpenseRow } from "@/components/ExpenseRow";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { LoadError } from "@/components/LoadError";
import { useExpenseActions } from "@/components/Providers";
import { Button, Card, Skeleton } from "@/components/ui";

const PAGE_SIZE = 50;

export default function ExpensesPage() {
  const { expenses, isLoading } = useExpenses();
  const { openCreate, openExport } = useExpenseActions();
  const [filters, setFilters] = useState<ExpenseFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortKey>("date-desc");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const results = useMemo(() => sortExpenses(filterExpenses(expenses, filters), sort), [expenses, filters, sort]);
  const total = useMemo(() => sumAmounts(results), [results]);

  const updateFilters = (next: ExpenseFilters) => {
    setFilters(next);
    setVisible(PAGE_SIZE);
  };

  // Carry the page's current filters into the export dialog.
  const handleExport = () =>
    openExport({
      startDate: filters.startDate,
      endDate: filters.endDate,
      categories: filters.category === "All" ? [...CATEGORIES] : [filters.category],
      search: filters.search,
      sort,
    });

  const header = (
    <PageHeader
      title="Expenses"
      subtitle="Search, filter, edit, and export your spending history."
      actions={
        <>
          <Button
            variant="secondary"
            onClick={handleExport}
            disabled={isLoading || expenses.length === 0}
            icon={<FileDown className="h-4 w-4" aria-hidden />}
          >
            Export…
          </Button>
          <Button onClick={openCreate} icon={<Plus className="h-4 w-4" aria-hidden />}>
            Add expense
          </Button>
        </>
      }
    />
  );

  if (isLoading) {
    return (
      <>
        {header}
        <Skeleton className="h-24 rounded-2xl" />
        <div className="mt-6 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </>
    );
  }

  if (expenses.length === 0) {
    return (
      <>
        {header}
        <LoadError />
        <EmptyState />
      </>
    );
  }

  return (
    <>
      {header}
      <LoadError />
      <Card className="p-4 sm:p-5">
        <ExpenseFiltersBar filters={filters} onChange={updateFilters} sort={sort} onSortChange={setSort} />
      </Card>

      <Card className="mt-6 overflow-hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-3 text-sm">
          <p className="text-slate-600">
            <span className="font-semibold text-slate-900">{results.length}</span>{" "}
            {results.length === 1 ? "expense" : "expenses"} · {describeRange(filters.startDate, filters.endDate)}
          </p>
          <p className="text-slate-600">
            Total <span className="font-semibold tabular-nums text-slate-900">{formatCurrency(total)}</span>
          </p>
        </div>

        {results.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <SearchX className="h-10 w-10 text-slate-300" aria-hidden />
            <p className="mt-3 text-sm font-medium text-slate-900">No matching expenses</p>
            <p className="mt-1 text-sm text-slate-500">Try adjusting your search or filters.</p>
            <Button variant="secondary" className="mt-4" onClick={() => updateFilters(DEFAULT_FILTERS)}>
              Clear filters
            </Button>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-slate-100">
              {results.slice(0, visible).map((e) => (
                <ExpenseRow key={e.id} expense={e} />
              ))}
            </ul>
            {results.length > visible && (
              <div className="border-t border-slate-100 p-4 text-center">
                <Button variant="ghost" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                  Show more ({results.length - visible} remaining)
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </>
  );
}
