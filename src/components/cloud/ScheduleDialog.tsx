"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { useCloud } from "@/context/CloudContext";
import { DESTINATIONS, DESTINATION_BY_ID } from "@/lib/cloud/destinations";
import { computeNextRun, describeSchedule, WEEKDAYS } from "@/lib/cloud/schedule";
import { TEMPLATES, TEMPLATE_BY_ID } from "@/lib/cloud/templates";
import type { Frequency, Schedule } from "@/lib/cloud/types";
import { Modal } from "../Modal";
import { Button, inputClass } from "../ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ScheduleDraft = Partial<Omit<Schedule, "createdAt" | "nextRunAt">>;

export function ScheduleDialog({ initial, onClose }: { initial?: ScheduleDraft; onClose: (saved: boolean) => void }) {
  const { saveSchedule, integrations } = useCloud();
  const [form, setForm] = useState({
    id: initial?.id,
    name: initial?.name ?? "",
    templateId: initial?.templateId ?? "full-backup",
    destination: initial?.destination && DESTINATION_BY_ID[initial.destination].schedulable ? initial.destination : "dropbox",
    target: initial?.target ?? "",
    frequency: initial?.frequency ?? ("weekly" as Frequency),
    weekday: initial?.weekday ?? 1,
    dayOfMonth: initial?.dayOfMonth ?? 1,
    time: initial?.time ?? "09:00",
    enabled: initial?.enabled ?? true,
  });
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<typeof form>) => {
    setForm((f) => ({ ...f, ...patch }));
    setError(null);
  };

  const dest = DESTINATION_BY_ID[form.destination];
  const target = form.target || dest.defaultTarget || "";
  const suggestedName = `${TEMPLATE_BY_ID[form.templateId].name} → ${dest.name}`;
  const upcoming = useMemo(() => {
    const runs: Date[] = [];
    let from = new Date();
    for (let i = 0; i < 3; i++) {
      from = computeNextRun(form, from);
      runs.push(from);
    }
    return runs;
  }, [form]);
  const notConnected = dest.requiresConnection && !integrations[form.destination]?.connected;

  const save = () => {
    if (form.destination === "email") {
      const emails = target.split(/[,\s;]+/).filter(Boolean);
      if (!emails.length || emails.some((e) => !EMAIL_RE.test(e))) {
        setError("Enter one or more valid email addresses.");
        return;
      }
    }
    saveSchedule({ ...form, name: form.name.trim() || suggestedName, target });
    onClose(true);
  };

  return (
    <Modal open onClose={() => onClose(false)} title={form.id ? "Edit automation" : "New automation"} description="Run an export automatically in the background.">
      <div className="space-y-5">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Name</span>
          <input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder={suggestedName} className={inputClass} />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Template</span>
            <select value={form.templateId} onChange={(e) => set({ templateId: e.target.value as typeof form.templateId })} className={inputClass}>
              {TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.format})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Send to</span>
            <select value={form.destination} onChange={(e) => set({ destination: e.target.value as typeof form.destination, target: "" })} className={inputClass}>
              {DESTINATIONS.filter((d) => d.schedulable).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.requiresConnection && !integrations[d.id]?.connected ? " (not connected)" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">{form.destination === "email" ? "Recipients" : form.destination === "notion" || form.destination === "google-sheets" ? "Destination" : "Folder"}</span>
          <input
            value={form.target}
            onChange={(e) => set({ target: e.target.value })}
            placeholder={form.destination === "email" ? "you@example.com, partner@example.com" : dest.defaultTarget}
            className={`${inputClass} ${form.destination === "email" ? "" : "font-mono"}`}
          />
        </label>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Repeat</span>
          <div className="grid grid-cols-3 rounded-lg bg-slate-100 p-0.5 text-sm font-medium" role="radiogroup">
            {(["daily", "weekly", "monthly"] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={form.frequency === f}
                onClick={() => set({ frequency: f })}
                className={`rounded-md px-3 py-1.5 capitalize transition ${form.frequency === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {form.frequency === "weekly" && (
              <select value={form.weekday} onChange={(e) => set({ weekday: Number(e.target.value) })} className={inputClass} aria-label="Day of week">
                {WEEKDAYS.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            )}
            {form.frequency === "monthly" && (
              <select value={form.dayOfMonth} onChange={(e) => set({ dayOfMonth: Number(e.target.value) })} className={inputClass} aria-label="Day of month">
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    Day {d}
                  </option>
                ))}
              </select>
            )}
            <input type="time" value={form.time} onChange={(e) => e.target.value && set({ time: e.target.value })} className={`${inputClass} ${form.frequency === "daily" ? "col-span-2" : ""}`} aria-label="Time" />
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <CalendarClock className="h-4 w-4 text-brand-600" aria-hidden />
            {describeSchedule(form)}
          </p>
          <ul className="mt-2 space-y-1 text-xs text-slate-500">
            {upcoming.map((d) => (
              <li key={d.toISOString()}>{d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-400">Runs while Spendwise is open; missed runs catch up the next time you open it.</p>
        </div>

        {notConnected && (
          <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-600/20">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {dest.name} isn&apos;t connected yet. Runs will fail until you connect it in Integrations.
          </p>
        )}
        {error && <p className="text-xs font-medium text-red-600">{error}</p>}

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => onClose(false)}>
            Cancel
          </Button>
          <Button onClick={save}>{form.id ? "Save changes" : "Create automation"}</Button>
        </div>
      </div>
    </Modal>
  );
}
