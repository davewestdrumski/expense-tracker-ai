"use client";

import Link from "next/link";
import { CloudCog, CloudOff, CloudUpload, Cloud } from "lucide-react";
import { useCloud } from "@/context/CloudContext";
import { relativeTime } from "@/lib/cloud/schedule";

export function SyncStatusPill() {
  const { syncStatus, hydrated } = useCloud();
  if (!hydrated) return null;

  const view = {
    syncing: { icon: CloudUpload, text: "Syncing…", className: "bg-brand-50 text-brand-700 ring-brand-600/20", title: syncStatus.state === "syncing" ? syncStatus.label : "" },
    never: { icon: CloudOff, text: "Not backed up", className: "bg-slate-100 text-slate-600 ring-slate-500/20", title: "No backup yet — create one from the Export Hub" },
    stale: {
      icon: CloudCog,
      text: syncStatus.state === "stale" ? `${syncStatus.changes} unsaved ${syncStatus.changes === 1 ? "change" : "changes"}` : "",
      className: "bg-amber-50 text-amber-800 ring-amber-600/20",
      title: syncStatus.state === "stale" ? `Last backup ${relativeTime(syncStatus.since)}` : "",
    },
    ok: { icon: Cloud, text: "Backed up", className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", title: syncStatus.state === "ok" ? `Last backup ${relativeTime(syncStatus.since)}` : "" },
  }[syncStatus.state];

  const Icon = view.icon;
  return (
    <Link
      href="/exports"
      title={view.title}
      className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition hover:brightness-95 md:inline-flex ${view.className}`}
    >
      <Icon className={`h-3.5 w-3.5 ${syncStatus.state === "syncing" ? "animate-pulse" : ""}`} aria-hidden />
      {view.text}
    </Link>
  );
}
