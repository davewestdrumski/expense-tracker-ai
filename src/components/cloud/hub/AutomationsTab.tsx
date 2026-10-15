"use client";

import { CalendarClock, Pencil, Play, Plus, Trash2, Zap } from "lucide-react";
import { useCloud } from "@/context/CloudContext";
import { DESTINATION_BY_ID } from "@/lib/cloud/destinations";
import { describeSchedule, relativeTime } from "@/lib/cloud/schedule";
import { TEMPLATE_BY_ID } from "@/lib/cloud/templates";
import { Button, Card } from "../../ui";
import { DestinationTile, Toggle } from "../bits";
import type { ScheduleDraft } from "../ScheduleDialog";
import { TEMPLATE_ICONS } from "./ExportTab";

const RECIPES: { title: string; blurb: string; draft: ScheduleDraft }[] = [
  { title: "Weekly backup to Dropbox", blurb: "Full JSON backup every Sunday evening", draft: { templateId: "full-backup", destination: "dropbox", frequency: "weekly", weekday: 0, time: "20:00" } },
  { title: "Monthly summary to my inbox", blurb: "Recap email on the 1st of every month", draft: { templateId: "monthly-summary", destination: "email", frequency: "monthly", dayOfMonth: 1, time: "08:00" } },
  { title: "Category trends to Sheets", blurb: "Refresh a 6-month pivot every Monday", draft: { templateId: "category-analysis", destination: "google-sheets", frequency: "weekly", weekday: 1, time: "07:30" } },
  { title: "Tax report to Google Drive", blurb: "Keep your tax-year CSV current monthly", draft: { templateId: "tax-report", destination: "google-drive", frequency: "monthly", dayOfMonth: 28, time: "18:00" } },
];

export function AutomationsTab({ onEdit }: { onEdit: (draft?: ScheduleDraft) => void }) {
  const { schedules, toggleSchedule, runScheduleNow, removeSchedule, integrations, history } = useCloud();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">Automations run in the background while Spendwise is open and catch up when you return.</p>
        <Button onClick={() => onEdit()} icon={<Plus className="h-4 w-4" aria-hidden />}>
          New automation
        </Button>
      </div>

      {schedules.length > 0 && (
        <ul className="space-y-3">
          {schedules.map((s) => {
            const Icon = TEMPLATE_ICONS[s.templateId];
            const dest = DESTINATION_BY_ID[s.destination];
            const disconnected = dest.requiresConnection && !integrations[s.destination]?.connected;
            const last = history.find((h) => h.scheduleId === s.id);
            return (
              <li key={s.id}>
                <Card className={`flex flex-col gap-4 p-4 sm:flex-row sm:items-center ${s.enabled ? "" : "opacity-60"}`}>
                  <div className="flex items-center gap-2">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ backgroundColor: TEMPLATE_BY_ID[s.templateId].accent }}>
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="text-slate-300" aria-hidden>
                      →
                    </span>
                    <DestinationTile id={s.destination} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{s.name}</p>
                    <p className="flex items-center gap-1.5 text-xs text-slate-500">
                      <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                      {describeSchedule(s)} · <span className="truncate font-mono">{s.target}</span>
                    </p>
                    <p className="mt-1 text-xs">
                      {disconnected ? (
                        <span className="font-medium text-red-600">{dest.name} disconnected — runs will fail</span>
                      ) : s.enabled ? (
                        <span className="text-slate-600">Next run {relativeTime(s.nextRunAt)}</span>
                      ) : (
                        <span className="text-slate-500">Paused</span>
                      )}
                      {last && (
                        <span className={last.status === "completed" ? "text-slate-400" : "text-red-500"}>
                          {" "}
                          · Last run {relativeTime(last.createdAt)} ({last.status})
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Toggle checked={s.enabled} onChange={() => toggleSchedule(s.id)} label={`Enable ${s.name}`} />
                    <button type="button" onClick={() => runScheduleNow(s.id)} className="ml-2 rounded-lg p-2 text-slate-400 hover:bg-brand-50 hover:text-brand-600" aria-label={`Run ${s.name} now`} title="Run now">
                      <Play className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => onEdit(s)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={`Edit ${s.name}`} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => removeSchedule(s.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`Delete ${s.name}`} title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Zap className="h-4 w-4 text-amber-500" aria-hidden />
          {schedules.length ? "More recipes" : "Start from a recipe"}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {RECIPES.map((r) => (
            <button
              key={r.title}
              type="button"
              onClick={() => onEdit({ ...r.draft, name: r.title })}
              className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4 text-left transition hover:border-brand-400 hover:bg-white"
            >
              <DestinationTile id={r.draft.destination!} size="sm" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-800">{r.title}</span>
                <span className="block text-xs text-slate-500">{r.blurb}</span>
              </span>
              <Plus className="ml-auto h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
