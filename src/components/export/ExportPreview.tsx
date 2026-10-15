"use client";

import { useState } from "react";
import { FileX } from "lucide-react";
import { CATEGORY_META } from "@/lib/categories";
import { formatCurrency, formatDate } from "@/lib/format";
import { resolveColumns } from "@/lib/export/columns";
import { EXPORTERS } from "@/lib/export/registry";
import type { ExportContext } from "@/lib/export/types";

const TABLE_LIMIT = 50;
const RAW_LIMIT = 8;

type Tab = "table" | "output";

export function ExportPreview({ ctx }: { ctx: ExportContext }) {
  const [tab, setTab] = useState<Tab>("table");
  const { rows, summary, options } = ctx;
  const exporter = EXPORTERS[options.format];
  const columns = resolveColumns(options.columns);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Summary */}
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-slate-200 ring-1 ring-slate-200 sm:grid-cols-4">
        <Stat label="Records" value={summary.count.toLocaleString("en-US")} />
        <Stat label="Total" value={formatCurrency(summary.total)} />
        <Stat label="Average" value={formatCurrency(summary.average)} />
        <Stat
          label="Span"
          value={
            summary.firstDate && summary.lastDate
              ? `${daysBetween(summary.firstDate, summary.lastDate)} days`
              : "—"
          }
          hint={summary.firstDate && summary.lastDate ? `${formatDate(summary.firstDate)} – ${formatDate(summary.lastDate)}` : undefined}
        />
      </dl>

      {summary.byCategory.length > 0 && (
        <div className="mt-3">
          <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden>
            {summary.byCategory.map((c) => (
              <div
                key={c.category}
                style={{ width: `${(c.total / summary.total) * 100}%`, backgroundColor: CATEGORY_META[c.category].color }}
                title={`${c.category}: ${formatCurrency(c.total)}`}
              />
            ))}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
            {summary.byCategory.map((c) => (
              <li key={c.category} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: CATEGORY_META[c.category].color }} aria-hidden />
                {c.category} <span className="tabular-nums text-slate-400">{formatCurrency(c.total)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabs */}
      <div className="mt-5 flex items-center justify-between gap-2">
        <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium" role="tablist" aria-label="Preview mode">
          {(["table", "output"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1 transition ${tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {t === "table" ? "Data" : `${exporter.label} preview`}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400">
          {tab === "table" && rows.length > TABLE_LIMIT ? `Showing first ${TABLE_LIMIT} of ${rows.length}` : null}
        </span>
      </div>

      <div className="mt-2 min-h-[260px] flex-1 overflow-hidden rounded-xl ring-1 ring-slate-200">
        {rows.length === 0 ? (
          <div className="flex h-full min-h-[260px] flex-col items-center justify-center p-6 text-center">
            <FileX className="h-9 w-9 text-slate-300" aria-hidden />
            <p className="mt-2 text-sm font-medium text-slate-700">Nothing to export</p>
            <p className="mt-0.5 text-xs text-slate-500">No expenses match these options. Widen the date range or categories.</p>
          </div>
        ) : tab === "table" ? (
          <div className="h-full max-h-[340px] overflow-auto lg:max-h-none">
            <table className="w-full min-w-[420px] text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} scope="col" className={`px-3 py-2 font-semibold ${c.align === "right" ? "text-right" : ""}`}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.slice(0, TABLE_LIMIT).map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={`max-w-[220px] truncate px-3 py-2 ${
                          c.align === "right" ? "text-right font-medium tabular-nums text-slate-900" : "text-slate-700"
                        }`}
                      >
                        {c.display(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : exporter.preview ? (
          <pre className="h-full max-h-[340px] overflow-auto bg-slate-900 p-4 font-mono text-[11px] leading-relaxed text-slate-100 lg:max-h-none">
            {exporter.preview(ctx, RAW_LIMIT)}
          </pre>
        ) : (
          <PdfMock ctx={ctx} />
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-white px-3 py-2.5" title={hint}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-semibold tabular-nums text-slate-900">{value}</dd>
    </div>
  );
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000) + 1;
}

/** A scaled-down sketch of the first PDF page, built from the real data. */
function PdfMock({ ctx }: { ctx: ExportContext }) {
  const { rows, summary } = ctx;
  const columns = resolveColumns(ctx.options.columns);
  return (
    <div className="flex h-full items-start justify-center overflow-auto bg-slate-100 p-5">
      <div className="aspect-[8.5/11] w-full max-w-[320px] overflow-hidden rounded-sm bg-white shadow-lg ring-1 ring-slate-200">
        <div className="h-1 bg-brand-600" />
        <div className="p-4 text-[6px] leading-tight text-slate-700">
          <div className="flex justify-between text-[5px]">
            <span className="font-bold tracking-wide text-brand-600">SPENDWISE</span>
            <span className="text-slate-400">Generated {ctx.generatedAt.toLocaleDateString("en-US", { dateStyle: "medium" })}</span>
          </div>
          <div className="mt-1.5 text-[11px] font-bold text-slate-900">Expense Report</div>
          <div className="mt-2 grid grid-cols-4 gap-1">
            {[
              ["TOTAL", formatCurrency(summary.total)],
              ["EXPENSES", String(summary.count)],
              ["AVERAGE", formatCurrency(summary.average)],
              ["CATEGORIES", String(summary.byCategory.length)],
            ].map(([l, v]) => (
              <div key={l} className="rounded-[1px] bg-slate-50 p-1 ring-1 ring-slate-200">
                <div className="text-[4px] font-bold text-slate-400">{l}</div>
                <div className="truncate text-[7px] font-bold text-slate-900">{v}</div>
              </div>
            ))}
          </div>
          <div className="mt-2.5 text-[7px] font-bold text-slate-900">Spending by category</div>
          <div className="mt-1 space-y-[3px]">
            {summary.byCategory.map((c) => (
              <div key={c.category} className="flex items-center gap-1">
                <span className="w-12 truncate">{c.category}</span>
                <span className="h-[3px] flex-1 bg-slate-100">
                  <span
                    className="block h-full"
                    style={{ width: `${(c.total / summary.byCategory[0].total) * 100}%`, backgroundColor: CATEGORY_META[c.category].color }}
                  />
                </span>
                <span className="w-10 text-right font-bold tabular-nums">{formatCurrency(c.total)}</span>
              </div>
            ))}
          </div>
          <div className="mt-2.5 text-[7px] font-bold text-slate-900">Expenses</div>
          <div className="mt-1 flex bg-slate-100 px-1 py-[2px] text-[4.5px] font-bold uppercase text-slate-400">
            {columns.map((c) => (
              <span key={c.key} className={`flex-1 ${c.align === "right" ? "text-right" : ""}`}>
                {c.label}
              </span>
            ))}
          </div>
          {rows.slice(0, 14).map((row, i) => (
            <div key={row.id} className={`flex px-1 py-[1.5px] text-[5px] ${i % 2 ? "bg-slate-50" : ""}`}>
              {columns.map((c) => (
                <span key={c.key} className={`flex-1 truncate ${c.align === "right" ? "text-right" : ""}`}>
                  {c.display(row)}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
