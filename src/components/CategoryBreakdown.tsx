import type { Category } from "@/types/expense";
import { CATEGORY_META } from "@/lib/categories";
import { formatCurrency } from "@/lib/format";

interface CategoryBreakdownProps {
  data: { category: Category; total: number; count: number }[];
}

export function CategoryBreakdown({ data }: CategoryBreakdownProps) {
  const grandTotal = data.reduce((s, d) => s + d.total, 0);
  const max = Math.max(...data.map((d) => d.total), 0);

  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-500">No expenses in this period.</p>;
  }

  return (
    <div className="space-y-5">
      {/* Part-to-whole strip, segments separated by a 2px surface gap */}
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden>
        {data.map((d) => (
          <div
            key={d.category}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(d.total / grandTotal) * 100}%`, backgroundColor: CATEGORY_META[d.category].color }}
            title={`${d.category}: ${formatCurrency(d.total)}`}
          />
        ))}
      </div>

      <ul className="space-y-3.5">
        {data.map((d) => {
          const { icon: Icon, color } = CATEGORY_META[d.category];
          const share = grandTotal > 0 ? (d.total / grandTotal) * 100 : 0;
          return (
            <li key={d.category} title={`${d.count} ${d.count === 1 ? "expense" : "expenses"}`}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2 font-medium text-slate-700">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: color }} aria-hidden />
                  <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                  <span className="truncate">{d.category}</span>
                </span>
                <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                  <span className="font-semibold text-slate-900">{formatCurrency(d.total)}</span>
                  <span className="w-10 text-right text-xs text-slate-500">{share.toFixed(0)}%</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${max > 0 ? (d.total / max) * 100 : 0}%`, backgroundColor: color }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
