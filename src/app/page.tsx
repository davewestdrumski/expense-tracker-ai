"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Download, Plus } from "lucide-react";
import { useExpenses } from "@/context/ExpenseContext";
import { monthKey, toISODate } from "@/lib/format";
import { downloadCSV, monthlyTotals, sortExpenses, sumAmounts, totalsByCategory } from "@/lib/expenses";
import { SummaryCards } from "@/components/SummaryCards";
import { MonthlyChart } from "@/components/MonthlyChart";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";
import { ExpenseRow } from "@/components/ExpenseRow";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { LoadError } from "@/components/LoadError";
import { useExpenseActions } from "@/components/Providers";
import { Button, Card, Skeleton } from "@/components/ui";

type Period = "month" | "all";

export default function DashboardPage() {
  const { expenses, isLoading } = useExpenses();
  const { openCreate } = useExpenseActions();
  const [period, setPeriod] = useState<Period>("month");

  const stats = useMemo(() => {
    const now = new Date();
    const thisKey = monthKey(toISODate(now));
    const lastKey = monthKey(toISODate(new Date(now.getFullYear(), now.getMonth() - 1, 1)));
    const thisMonthItems = expenses.filter((e) => monthKey(e.date) === thisKey);
    const thisMonth = sumAmounts(thisMonthItems);
    const monthCategories = totalsByCategory(thisMonthItems);
    return {
      total: sumAmounts(expenses),
      thisMonth,
      thisMonthCount: thisMonthItems.length,
      lastMonth: sumAmounts(expenses.filter((e) => monthKey(e.date) === lastKey)),
      dailyAverage: thisMonth / now.getDate(),
      topCategory: monthCategories[0] ?? null,
      monthCategories,
      allCategories: totalsByCategory(expenses),
      monthly: monthlyTotals(expenses, 6, now),
      recent: [...expenses]
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
        .slice(0, 6),
    };
  }, [expenses]);

  const header = (
    <PageHeader
      title="Dashboard"
      subtitle={new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
      actions={
        <>
          <Button
            variant="secondary"
            onClick={() => downloadCSV(sortExpenses(expenses, "date-desc"))}
            disabled={isLoading || expenses.length === 0}
            icon={<Download className="h-4 w-4" aria-hidden />}
          >
            Export Data
          </Button>
          <Button onClick={openCreate} icon={<Plus className="h-4 w-4" aria-hidden />} className="sm:hidden">
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[124px] rounded-2xl" />
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <Skeleton className="h-80 rounded-2xl lg:col-span-3" />
          <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
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

  const categoryData = period === "month" ? stats.monthCategories : stats.allCategories;

  return (
    <>
      {header}
      <LoadError />
      <SummaryCards
        total={stats.total}
        totalCount={expenses.length}
        thisMonth={stats.thisMonth}
        lastMonth={stats.lastMonth}
        thisMonthCount={stats.thisMonthCount}
        dailyAverage={stats.dailyAverage}
        topCategory={stats.topCategory}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="p-5 sm:p-6 lg:col-span-3">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-slate-900">Monthly spending</h2>
            <p className="text-sm text-slate-500">Last 6 months</p>
          </div>
          <MonthlyChart data={stats.monthly} />
        </Card>

        <Card className="p-5 sm:p-6 lg:col-span-2">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">By category</h2>
              <p className="text-sm text-slate-500">{period === "month" ? "This month" : "All time"}</p>
            </div>
            <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium" role="group" aria-label="Period">
              {(["month", "all"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  aria-pressed={period === p}
                  className={`rounded-md px-2.5 py-1 transition ${
                    period === p ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {p === "month" ? "Month" : "All time"}
                </button>
              ))}
            </div>
          </div>
          <CategoryBreakdown data={categoryData} />
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-slate-900">Recent expenses</h2>
          <Link
            href="/expenses"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            View all <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <ul className="divide-y divide-slate-100">
          {stats.recent.map((e) => (
            <ExpenseRow key={e.id} expense={e} compact />
          ))}
        </ul>
      </Card>
    </>
  );
}
