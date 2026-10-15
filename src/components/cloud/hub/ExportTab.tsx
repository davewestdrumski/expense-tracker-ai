"use client";

import { useMemo, useState } from "react";
import { Check, CalendarRange, DatabaseBackup, Landmark, PieChart, type LucideIcon } from "lucide-react";
import { useExpenses } from "@/context/ExpenseContext";
import { useCloud } from "@/context/CloudContext";
import { DESTINATIONS } from "@/lib/cloud/destinations";
import { buildArtifact, defaultParams, TEMPLATES } from "@/lib/cloud/templates";
import { formatMonthKey, monthKey, toISODate } from "@/lib/format";
import type { DestinationId, TemplateId, TemplateParams } from "@/lib/cloud/types";
import { ConnectDialog } from "../ConnectDialog";
import { DeliverPanel } from "../DeliverPanel";
import { DestinationTile, SimulatedBadge, StatusDot } from "../bits";
import { QuickActions } from "./QuickActions";

export const TEMPLATE_ICONS: Record<TemplateId, LucideIcon> = {
  "tax-report": Landmark,
  "monthly-summary": CalendarRange,
  "category-analysis": PieChart,
  "full-backup": DatabaseBackup,
};

function StepLabel({ n, title, aside }: { n: number; title: string; aside?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">{n}</span>
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {aside && <span className="ml-auto">{aside}</span>}
    </div>
  );
}

export function ExportTab({ onAutomate }: { onAutomate: (destination: DestinationId, templateId: TemplateId, target?: string) => void }) {
  const { expenses } = useExpenses();
  const { integrations } = useCloud();
  const [templateId, setTemplateId] = useState<TemplateId>("monthly-summary");
  const [paramsById, setParamsById] = useState<Partial<Record<TemplateId, TemplateParams>>>({});
  const [panel, setPanel] = useState<DestinationId | null>(null);
  const [connecting, setConnecting] = useState<DestinationId | null>(null);

  const params = paramsById[templateId] ?? defaultParams(templateId);
  const artifact = useMemo(() => buildArtifact(templateId, expenses, params), [templateId, expenses, params]);

  const { years, months } = useMemo(() => {
    const now = new Date();
    const ys = new Set([now.getFullYear(), ...expenses.map((e) => Number(e.date.slice(0, 4)))]);
    const ms = new Set([monthKey(toISODate(now)), ...expenses.map((e) => monthKey(e.date))]);
    return { years: [...ys].sort((a, b) => b - a), months: [...ms].sort().reverse() };
  }, [expenses]);

  const pickDestination = (id: DestinationId) => {
    const def = DESTINATIONS.find((d) => d.id === id)!;
    if (def.requiresConnection && !integrations[id]?.connected) setConnecting(id);
    else setPanel(id);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-8 lg:col-span-2">
        <section>
          <StepLabel n={1} title="Choose a template" />
          <div className="grid gap-3 sm:grid-cols-2">
            {TEMPLATES.map((t) => {
              const Icon = TEMPLATE_ICONS[t.id];
              const selected = t.id === templateId;
              return (
                <div
                  key={t.id}
                  role="radio"
                  aria-checked={selected}
                  tabIndex={0}
                  onClick={() => setTemplateId(t.id)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setTemplateId(t.id))}
                  className={`group relative cursor-pointer overflow-hidden rounded-2xl bg-white p-4 text-left shadow-card ring-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 ${
                    selected ? "ring-2 ring-brand-600" : "ring-slate-200 hover:ring-slate-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: t.accent }}>
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">{t.name}</p>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500">{t.format}</span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">{t.description}</p>
                      <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">{t.audience}</p>
                    </div>
                    {selected && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600">
                        <Check className="h-3 w-3 text-white" strokeWidth={3} aria-hidden />
                      </span>
                    )}
                  </div>
                  {selected && (t.scope === "year" || t.scope === "month") && (
                    <div className="mt-3 border-t border-slate-100 pt-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={t.scope === "year" ? params.year : params.month}
                        onChange={(e) =>
                          setParamsById((p) => ({ ...p, [t.id]: t.scope === "year" ? { year: Number(e.target.value) } : { month: e.target.value } }))
                        }
                        className="w-full rounded-lg border-0 bg-slate-50 px-3 py-1.5 text-sm text-slate-800 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-brand-600"
                        aria-label={t.scope === "year" ? "Tax year" : "Month"}
                      >
                        {t.scope === "year"
                          ? years.map((y) => <option key={y} value={y}>Tax year {y}</option>)
                          : months.map((m) => <option key={m} value={m}>{formatMonthKey(m, "long")}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-slate-500" aria-live="polite">
            <span className="font-medium text-slate-700">{artifact.filename}</span> · {artifact.recordCount} records · {artifact.scopeLabel}
          </p>
        </section>

        <section>
          <StepLabel n={2} title="Send it somewhere" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {DESTINATIONS.map((d) => {
              const integration = integrations[d.id];
              const connected = !!integration?.connected;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => pickDestination(d.id)}
                  className="group flex items-center gap-3 rounded-2xl bg-white p-3.5 text-left shadow-card ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
                >
                  <DestinationTile id={d.id} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{d.name}</p>
                      {d.simulated && <SimulatedBadge />}
                    </div>
                    <p className="truncate text-xs text-slate-500">{d.description}</p>
                  </div>
                  {d.requiresConnection && (
                    <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-slate-500">
                      <StatusDot tone={connected ? "green" : "slate"} />
                      {connected ? "Connected" : "Connect"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <QuickActions />

      {connecting && <ConnectDialog id={connecting} onClose={() => setConnecting(null)} onConnected={() => setPanel(connecting)} />}
      {panel && (
        <DeliverPanel
          key={`${panel}-${templateId}`}
          destination={panel}
          artifact={artifact}
          params={params}
          onClose={() => setPanel(null)}
          onAutomate={(dest, target) => {
            setPanel(null);
            onAutomate(dest, templateId, target);
          }}
        />
      )}
    </div>
  );
}
