"use client";

import { useEffect, useState } from "react";
import { Activity, CalendarClock, Cloud, Link2, Plug } from "lucide-react";
import { useCloud } from "@/context/CloudContext";
import { DESTINATIONS, DESTINATION_BY_ID } from "@/lib/cloud/destinations";
import { relativeTime } from "@/lib/cloud/schedule";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui";
import { ScheduleDialog, type ScheduleDraft } from "@/components/cloud/ScheduleDialog";
import { ExportTab } from "@/components/cloud/hub/ExportTab";
import { AutomationsTab } from "@/components/cloud/hub/AutomationsTab";
import { HistoryTab } from "@/components/cloud/hub/HistoryTab";
import { SharesTab } from "@/components/cloud/hub/SharesTab";
import { IntegrationsTab } from "@/components/cloud/hub/IntegrationsTab";

const TABS = ["export", "automations", "history", "shared", "integrations"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = { export: "Export", automations: "Automations", history: "History", shared: "Shared links", integrations: "Integrations" };

export default function ExportHubPage() {
  const cloud = useCloud();
  const [tab, setTab] = useState<Tab>("export");
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraft | null>(null);

  // Deep-linkable tabs (#automations, #history…).
  useEffect(() => {
    const fromHash = window.location.hash.slice(1) as Tab;
    if (TABS.includes(fromHash)) setTab(fromHash);
  }, []);
  const selectTab = (t: Tab) => {
    setTab(t);
    history.replaceState(null, "", `#${t}`);
  };

  const connections = DESTINATIONS.filter((d) => d.requiresConnection);
  const connectedCount = connections.filter((d) => cloud.integrations[d.id]?.connected).length;
  const active = cloud.schedules.filter((s) => s.enabled);
  const nextRun = active.map((s) => s.nextRunAt).sort()[0];
  const monthAgo = Date.now() - 30 * 86_400_000;
  const recent = cloud.history.filter((h) => h.status === "completed" && new Date(h.createdAt).getTime() > monthAgo);

  const counts: Partial<Record<Tab, number>> = {
    automations: cloud.schedules.length,
    history: cloud.history.length,
    shared: cloud.shares.length,
    integrations: connectedCount,
  };

  const stats = [
    {
      icon: Cloud,
      label: "Backup",
      value: cloud.syncStatus.state === "never" ? "Never" : cloud.lastBackupAt ? relativeTime(cloud.lastBackupAt) : "—",
      sub: cloud.syncStatus.state === "stale" ? `${cloud.syncStatus.changes} changes since` : cloud.syncStatus.state === "ok" ? "Up to date" : "Back up below",
      tab: "export" as Tab,
    },
    { icon: Plug, label: "Connected", value: `${connectedCount} / ${connections.length}`, sub: "services", tab: "integrations" as Tab },
    { icon: CalendarClock, label: "Automations", value: String(active.length), sub: nextRun ? `Next ${relativeTime(nextRun)}` : "None scheduled", tab: "automations" as Tab },
    { icon: Activity, label: "Last 30 days", value: String(recent.length), sub: `exports · ${cloud.shares.length} links`, tab: "history" as Tab },
  ];

  return (
    <>
      <PageHeader title="Export Hub" subtitle="Send your data anywhere — on demand, on a schedule, or as a private link." />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <button key={s.label} type="button" onClick={() => selectTab(s.tab)} className="text-left">
            <Card className="flex items-center gap-3 p-4 transition hover:ring-slate-300">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <s.icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-medium text-slate-500">{s.label}</span>
                <span className="block truncate text-base font-semibold text-slate-900">{s.value}</span>
                <span className="block truncate text-xs text-slate-500">{s.sub}</span>
              </span>
            </Card>
          </button>
        ))}
      </div>

      <div className="mb-6 overflow-x-auto border-b border-slate-200">
        <nav className="-mb-px flex min-w-max gap-6" role="tablist" aria-label="Export Hub sections">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => selectTab(t)}
              className={`flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium transition ${
                tab === t ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              {t === "shared" && <Link2 className="h-4 w-4" aria-hidden />}
              {TAB_LABELS[t]}
              {!!counts[t] && <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${tab === t ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-600"}`}>{counts[t]}</span>}
            </button>
          ))}
        </nav>
      </div>

      {tab === "export" && (
        <ExportTab
          onAutomate={(destination, templateId, target) =>
            setScheduleDraft({
              templateId,
              destination,
              target: destination === "email" ? target : DESTINATION_BY_ID[destination].defaultTarget,
              frequency: "weekly",
              weekday: 1,
              time: "09:00",
            })
          }
        />
      )}
      {tab === "automations" && <AutomationsTab onEdit={(draft) => setScheduleDraft(draft ?? {})} />}
      {tab === "history" && <HistoryTab />}
      {tab === "shared" && <SharesTab />}
      {tab === "integrations" && <IntegrationsTab />}

      {scheduleDraft && (
        <ScheduleDialog
          initial={scheduleDraft}
          onClose={(saved) => {
            setScheduleDraft(null);
            if (saved) selectTab("automations");
          }}
        />
      )}
    </>
  );
}
