"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, History, RotateCw, XCircle, Ban, Clock } from "lucide-react";
import { useExpenses } from "@/context/ExpenseContext";
import { useCloud } from "@/context/CloudContext";
import { DESTINATIONS, DESTINATION_BY_ID } from "@/lib/cloud/destinations";
import { formatBytes } from "@/lib/cloud/format";
import { buildArtifact, describeScope } from "@/lib/cloud/templates";
import type { HistoryEntry } from "@/lib/cloud/types";
import { Button, Card, inputClass } from "../../ui";
import { DestinationTile } from "../bits";

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

const STATUS = {
  completed: { icon: CheckCircle2, className: "text-emerald-600", label: "Delivered" },
  failed: { icon: XCircle, className: "text-red-600", label: "Failed" },
  cancelled: { icon: Ban, className: "text-slate-400", label: "Cancelled" },
};

export function HistoryTab() {
  const { history, deliver, clearHistory } = useCloud();
  const { expenses } = useExpenses();
  const [destination, setDestination] = useState("all");
  const [status, setStatus] = useState("all");
  const [confirmClear, setConfirmClear] = useState(false);

  const groups = useMemo(() => {
    const filtered = history.filter((h) => (destination === "all" || h.destination === destination) && (status === "all" || h.status === status));
    const map = new Map<string, HistoryEntry[]>();
    for (const h of filtered) {
      const key = dayLabel(h.createdAt);
      map.set(key, [...(map.get(key) ?? []), h]);
    }
    return [...map.entries()];
  }, [history, destination, status]);

  const rerun = (h: HistoryEntry) => {
    const artifact = buildArtifact(h.templateId, expenses, h.params);
    void deliver({ artifact, destination: h.destination, params: h.params, target: h.target });
  };

  if (history.length === 0) {
    return (
      <Card className="flex flex-col items-center px-6 py-16 text-center">
        <History className="h-10 w-10 text-slate-300" aria-hidden />
        <p className="mt-3 text-sm font-medium text-slate-900">No exports yet</p>
        <p className="mt-1 text-sm text-slate-500">Everything you send, share or schedule will be logged here.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <select value={destination} onChange={(e) => setDestination(e.target.value)} className={`${inputClass} w-auto`} aria-label="Filter by destination">
          <option value="all">All destinations</option>
          {DESTINATIONS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputClass} w-auto`} aria-label="Filter by status">
          <option value="all">Any status</option>
          <option value="completed">Delivered</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <div className="ml-auto">
          {confirmClear ? (
            <span className="flex items-center gap-2 text-sm">
              <span className="text-slate-600">Clear all history?</span>
              <Button variant="danger" onClick={() => (clearHistory(), setConfirmClear(false))}>
                Clear
              </Button>
              <Button variant="ghost" onClick={() => setConfirmClear(false)}>
                Keep
              </Button>
            </span>
          ) : (
            <Button variant="ghost" onClick={() => setConfirmClear(true)}>
              Clear history
            </Button>
          )}
        </div>
      </div>

      {groups.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No exports match these filters.</p>}

      {groups.map(([day, entries]) => (
        <section key={day}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{day}</h3>
          <Card className="overflow-hidden">
            <ul className="divide-y divide-slate-100">
              {entries.map((h) => {
                const s = STATUS[h.status];
                const StatusIcon = s.icon;
                return (
                  <li key={h.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <DestinationTile id={h.destination} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-medium text-slate-900">
                        <span className="truncate">
                          {h.title} · {describeScope(h.templateId, h.params)}
                        </span>
                        {h.trigger === "schedule" && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-purple-50 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 ring-1 ring-inset ring-purple-600/20">
                            <Clock className="h-2.5 w-2.5" aria-hidden /> Scheduled
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {DESTINATION_BY_ID[h.destination].name}
                        {h.target ? ` · ${h.target}` : ""} · {h.recordCount} records · {formatBytes(h.bytes)}
                      </p>
                    </div>
                    <span className={`hidden items-center gap-1 text-xs font-medium sm:flex ${s.className}`}>
                      <StatusIcon className="h-4 w-4" aria-hidden /> {s.label}
                    </span>
                    <time className="w-16 shrink-0 text-right text-xs tabular-nums text-slate-400" dateTime={h.createdAt}>
                      {new Date(h.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </time>
                    {h.destination !== "share-link" ? (
                      <button type="button" onClick={() => rerun(h)} className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600" aria-label="Run again with current data" title="Run again with current data">
                        <RotateCw className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="w-7" />
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        </section>
      ))}
    </div>
  );
}
