import { CalendarDays, PieChart, TrendingDown, TrendingUp, Wallet, Receipt } from "lucide-react";
import type { Category } from "@/types/expense";
import { formatCurrency } from "@/lib/format";
import { Card, CategoryIcon } from "./ui";

interface SummaryCardsProps {
  total: number;
  totalCount: number;
  thisMonth: number;
  lastMonth: number;
  thisMonthCount: number;
  dailyAverage: number;
  topCategory: { category: Category; total: number } | null;
}

function Stat({
  label,
  value,
  icon,
  footer,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 truncate text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</p>
        </div>
        {icon}
      </div>
      <div className="mt-3 text-xs text-slate-500">{footer}</div>
    </Card>
  );
}

function IconChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-600/10">
      {children}
    </span>
  );
}

export function SummaryCards(props: SummaryCardsProps) {
  const { total, totalCount, thisMonth, lastMonth, thisMonthCount, dailyAverage, topCategory } = props;
  const change = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : null;
  const up = change !== null && change > 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat
        label="Total spending"
        value={formatCurrency(total)}
        icon={
          <IconChip>
            <Wallet className="h-5 w-5" aria-hidden />
          </IconChip>
        }
        footer={`${totalCount} ${totalCount === 1 ? "expense" : "expenses"} recorded`}
      />
      <Stat
        label="This month"
        value={formatCurrency(thisMonth)}
        icon={
          <IconChip>
            <CalendarDays className="h-5 w-5" aria-hidden />
          </IconChip>
        }
        footer={
          change === null ? (
            `${thisMonthCount} ${thisMonthCount === 1 ? "expense" : "expenses"} this month`
          ) : (
            <span className="inline-flex items-center gap-1">
              <span
                className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold ${
                  up ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {up ? <TrendingUp className="h-3 w-3" aria-hidden /> : <TrendingDown className="h-3 w-3" aria-hidden />}
                {up ? "+" : ""}
                {change.toFixed(0)}%
              </span>
              vs. last month ({formatCurrency(lastMonth)})
            </span>
          )
        }
      />
      <Stat
        label="Daily average"
        value={formatCurrency(dailyAverage)}
        icon={
          <IconChip>
            <Receipt className="h-5 w-5" aria-hidden />
          </IconChip>
        }
        footer="Across days elapsed this month"
      />
      <Stat
        label="Top category"
        value={topCategory ? topCategory.category : "—"}
        icon={
          topCategory ? (
            <CategoryIcon category={topCategory.category} />
          ) : (
            <IconChip>
              <PieChart className="h-5 w-5" aria-hidden />
            </IconChip>
          )
        }
        footer={topCategory ? `${formatCurrency(topCategory.total)} this month` : "No spending this month yet"}
      />
    </div>
  );
}
