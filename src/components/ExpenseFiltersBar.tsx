"use client";

import { Search, X } from "lucide-react";
import { CATEGORIES, type ExpenseFilters, type SortKey } from "@/types/expense";
import { DATE_PRESETS, presetRange } from "@/lib/date-ranges";
import { DEFAULT_FILTERS } from "@/lib/expenses";
import { inputClass } from "./ui";

interface Props {
  filters: ExpenseFilters;
  onChange: (filters: ExpenseFilters) => void;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
}

const FILTER_PRESETS = DATE_PRESETS.filter((p) => p.id !== "90d");

export function ExpenseFiltersBar({ filters, onChange, sort, onSortChange }: Props) {
  const set = (patch: Partial<ExpenseFilters>) => onChange({ ...filters, ...patch });
  const isFiltered =
    filters.search !== "" || filters.category !== "All" || filters.startDate !== "" || filters.endDate !== "";
  const rangeInvalid = filters.startDate && filters.endDate && filters.startDate > filters.endDate;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto]">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="search"
            placeholder="Search descriptions…"
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
            className={`${inputClass} pl-9`}
            aria-label="Search expenses"
          />
        </div>
        <select
          value={filters.category}
          onChange={(e) => set({ category: e.target.value as ExpenseFilters["category"] })}
          className={inputClass}
          aria-label="Filter by category"
        >
          <option value="All">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortKey)}
          className={inputClass}
          aria-label="Sort expenses"
        >
          <option value="date-desc">Newest first</option>
          <option value="date-asc">Oldest first</option>
          <option value="amount-desc">Highest amount</option>
          <option value="amount-asc">Lowest amount</option>
        </select>
        <input
          type="date"
          value={filters.startDate}
          max={filters.endDate || undefined}
          onChange={(e) => set({ startDate: e.target.value })}
          className={inputClass}
          aria-label="Start date"
          title="Start date"
        />
        <input
          type="date"
          value={filters.endDate}
          min={filters.startDate || undefined}
          onChange={(e) => set({ endDate: e.target.value })}
          className={inputClass}
          aria-label="End date"
          title="End date"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTER_PRESETS.map((p) => {
          const range = presetRange(p.id);
          const active = filters.startDate === range.startDate && filters.endDate === range.endDate;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => set(active ? { startDate: "", endDate: "" } : range)}
              className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition ${
                active
                  ? "bg-brand-600 text-white ring-brand-600"
                  : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
              }`}
              aria-pressed={active}
            >
              {p.label}
            </button>
          );
        })}
        {isFiltered && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Clear filters
          </button>
        )}
      </div>
      {rangeInvalid && <p className="text-xs font-medium text-red-600">Start date is after the end date.</p>}
    </div>
  );
}
