"use client";

import { useState } from "react";
import { formatCompactCurrency, formatCurrency, formatMonthKey } from "@/lib/format";

interface MonthlyChartProps {
  data: { key: string; total: number }[];
}

/** Picks a "nice" axis maximum (1, 2, 2.5, 5 × 10^n) above the data max. */
function niceMax(value: number): number {
  if (value <= 0) return 100;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (step * exp >= value) return step * exp;
  }
  return 10 * exp;
}

export function MonthlyChart({ data }: MonthlyChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(...data.map((d) => d.total)));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const currentIndex = data.length - 1;

  return (
    <div>
      <div className="relative flex h-56 gap-3">
        {/* Y axis labels */}
        <div className="relative w-12 shrink-0 text-right text-[11px] tabular-nums text-slate-400" aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(t / max) * 100}%` }}>
              {formatCompactCurrency(t).replace(".00", "")}
            </span>
          ))}
        </div>

        <div className="relative flex-1">
          {/* Gridlines */}
          {ticks.map((t) => (
            <div
              key={t}
              className={`absolute inset-x-0 border-t ${t === 0 ? "border-slate-300" : "border-dashed border-slate-100"}`}
              style={{ bottom: `${(t / max) * 100}%` }}
              aria-hidden
            />
          ))}

          <ul className="absolute inset-0 flex items-end gap-2 sm:gap-4" role="list" aria-label="Monthly spending">
            {data.map((d, i) => {
              const pct = (d.total / max) * 100;
              const isActive = active === i;
              return (
                <li
                  key={d.key}
                  className="group relative flex h-full flex-1 cursor-default items-end justify-center"
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  tabIndex={0}
                  aria-label={`${formatMonthKey(d.key, "long")}: ${formatCurrency(d.total)}`}
                >
                  {/* Hover band: hit target wider than the bar */}
                  <div className={`absolute inset-0 rounded-lg transition ${isActive ? "bg-slate-100/70" : ""}`} aria-hidden />
                  <div
                    className="relative w-full max-w-[44px] rounded-t transition-[height] duration-500"
                    style={{
                      height: d.total > 0 ? `max(${pct}%, 3px)` : 0,
                      backgroundColor: "#2a78d6",
                      opacity: active === null || isActive ? 1 : 0.55,
                    }}
                  />
                  {isActive && (
                    <div
                      className="pointer-events-none absolute z-10 -translate-y-2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
                      style={{ bottom: `${Math.min(pct, 82)}%` }}
                      role="tooltip"
                    >
                      <div className="text-slate-300">{formatMonthKey(d.key, "long")}</div>
                      <div className="font-semibold tabular-nums">{formatCurrency(d.total)}</div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* X axis labels */}
      <div className="ml-[3.75rem] mt-2 flex gap-2 sm:gap-4" aria-hidden>
        {data.map((d, i) => (
          <span
            key={d.key}
            className={`flex-1 text-center text-xs ${i === currentIndex ? "font-semibold text-slate-700" : "text-slate-500"}`}
          >
            {formatMonthKey(d.key)}
          </span>
        ))}
      </div>
    </div>
  );
}
