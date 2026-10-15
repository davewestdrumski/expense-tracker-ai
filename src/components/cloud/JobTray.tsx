"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Loader2, X, XCircle, Ban } from "lucide-react";
import { useCloud } from "@/context/CloudContext";
import { DestinationTile } from "./bits";

/** Google-Drive-style background activity panel. */
export function JobTray() {
  const { jobs, cancelJob, clearFinishedJobs } = useCloud();
  const [collapsed, setCollapsed] = useState(false);
  const active = jobs.filter((j) => j.state === "queued" || j.state === "running");

  // Auto-dismiss finished jobs a while after everything settles.
  useEffect(() => {
    if (jobs.length === 0 || active.length > 0) return;
    const t = setTimeout(clearFinishedJobs, 8000);
    return () => clearTimeout(t);
  }, [jobs, active.length, clearFinishedJobs]);

  useEffect(() => {
    if (active.length > 0) setCollapsed(false);
  }, [active.length]);

  if (jobs.length === 0) return null;

  const title = active.length
    ? `${active.length} ${active.length === 1 ? "task" : "tasks"} in progress`
    : `${jobs.length} ${jobs.length === 1 ? "task" : "tasks"} finished`;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-40 animate-slide-up sm:bottom-6 sm:left-auto sm:right-6 sm:w-96">
      <div className="overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10">
        <div className="flex items-center gap-2 bg-slate-900 px-4 py-3 text-white">
          {active.length ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden />}
          <p className="flex-1 text-sm font-medium" aria-live="polite">
            {title}
          </p>
          <button type="button" onClick={() => setCollapsed((c) => !c)} className="rounded p-1 hover:bg-white/10" aria-label={collapsed ? "Expand" : "Collapse"}>
            {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {!active.length && (
            <button type="button" onClick={clearFinishedJobs} className="rounded p-1 hover:bg-white/10" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {!collapsed && (
          <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
            {jobs.map((job) => (
              <li key={job.id} className="flex items-center gap-3 px-4 py-3">
                <DestinationTile id={job.destination} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{job.label}</p>
                  {job.state === "running" || job.state === "queued" ? (
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-brand-600 transition-[width] duration-150" style={{ width: `${Math.round(job.progress * 100)}%` }} />
                    </div>
                  ) : (
                    <p className={`truncate text-xs ${job.state === "failed" ? "text-red-600" : "text-slate-500"}`}>
                      {job.state === "failed" ? job.error : job.state === "cancelled" ? "Cancelled" : job.detail}
                    </p>
                  )}
                </div>
                {job.state === "running" || job.state === "queued" ? (
                  <button type="button" onClick={() => cancelJob(job.id)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={`Cancel ${job.label}`}>
                    <X className="h-4 w-4" />
                  </button>
                ) : job.state === "completed" ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-label="Completed" />
                ) : job.state === "failed" ? (
                  <XCircle className="h-5 w-5 text-red-500" aria-label="Failed" />
                ) : (
                  <Ban className="h-5 w-5 text-slate-400" aria-label="Cancelled" />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
