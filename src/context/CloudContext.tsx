"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useExpenses } from "./ExpenseContext";
import { useToast } from "./ToastContext";
import { createId } from "@/lib/storage";
import { sumAmounts, totalsByCategory } from "@/lib/expenses";
import { DEMO_ACCOUNT, DESTINATION_BY_ID } from "@/lib/cloud/destinations";
import { computeNextRun } from "@/lib/cloud/schedule";
import { encodeShare, shareUrl } from "@/lib/cloud/share";
import { EMPTY_CLOUD_STATE, HISTORY_LIMIT, loadCloudState, saveCloudState, type CloudState } from "@/lib/cloud/store";
import { buildArtifact, defaultParams, TEMPLATE_BY_ID } from "@/lib/cloud/templates";
import type {
  DestinationId,
  ExportArtifact,
  HistoryEntry,
  Integration,
  Job,
  Schedule,
  ShareLink,
  SharePayload,
  TemplateParams,
} from "@/lib/cloud/types";

export interface DeliverRequest {
  artifact: ExportArtifact;
  destination: DestinationId;
  params: TemplateParams;
  /** Email recipients, folder path, spreadsheet name… */
  target?: string;
  trigger?: "manual" | "schedule";
  scheduleId?: string;
}

export interface ShareOptions {
  includeItems: boolean;
  expiresInDays: number | null;
  password?: string;
  sharedBy?: string;
  note?: string;
}

export type SyncStatus =
  | { state: "syncing"; label: string }
  | { state: "never" }
  | { state: "stale"; changes: number; since: string }
  | { state: "ok"; since: string };

interface CloudContextValue extends CloudState {
  hydrated: boolean;
  jobs: Job[];
  syncStatus: SyncStatus;
  deliver: (req: DeliverRequest) => Promise<HistoryEntry | null>;
  cancelJob: (id: string) => void;
  clearFinishedJobs: () => void;
  connect: (id: DestinationId) => void;
  disconnect: (id: DestinationId) => void;
  setLiveSync: (target: Integration["liveSync"]) => void;
  createShare: (artifact: ExportArtifact, params: TemplateParams, options: ShareOptions) => Promise<ShareLink>;
  removeShare: (id: string) => void;
  saveSchedule: (schedule: Omit<Schedule, "id" | "createdAt" | "nextRunAt"> & { id?: string }) => void;
  removeSchedule: (id: string) => void;
  toggleSchedule: (id: string) => void;
  runScheduleNow: (id: string) => void;
  clearHistory: () => void;
}

const CloudContext = createContext<CloudContextValue | null>(null);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ease = (t: number) => 1 - Math.pow(1 - t, 2.2);

/** Simulated transfer time: scales with size, bounded so the demo stays snappy. */
function transferMs(destination: DestinationId, bytes: number): number {
  if (destination === "download") return 500;
  return Math.min(4800, 1400 + bytes / 25);
}

function jobCopy(destination: DestinationId, artifact: ExportArtifact, target?: string): { label: string; detail: string } {
  const name = DESTINATION_BY_ID[destination].name;
  switch (destination) {
    case "download":
      return { label: `Preparing ${artifact.filename}`, detail: "Download" };
    case "email":
      return { label: `Emailing ${artifact.title}`, detail: `To ${target}` };
    case "google-sheets":
      return { label: `Syncing ${artifact.title} to Sheets`, detail: target ?? name };
    case "notion":
      return { label: `Publishing ${artifact.title} to Notion`, detail: target ?? name };
    default:
      return { label: `Uploading ${artifact.filename}`, detail: `${name} · ${target ?? ""}` };
  }
}

function downloadArtifact(artifact: ExportArtifact) {
  const url = URL.createObjectURL(new Blob([artifact.content], { type: artifact.mimeType }));
  const a = document.createElement("a");
  a.href = url;
  a.download = artifact.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function CloudProvider({ children }: { children: ReactNode }) {
  const { expenses, isLoading } = useExpenses();
  const { toast } = useToast();
  const [state, setState] = useState<CloudState>(EMPTY_CLOUD_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [liveSyncing, setLiveSyncing] = useState(false);
  const cancelled = useRef(new Set<string>());
  const stateRef = useRef(state);
  stateRef.current = state;
  const expensesRef = useRef(expenses);
  expensesRef.current = expenses;

  useEffect(() => {
    setState(loadCloudState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      saveCloudState(state);
    } catch (err) {
      console.error(err);
    }
  }, [state, hydrated]);

  const patchJob = useCallback((id: string, patch: Partial<Job>) => {
    setJobs((js) => js.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }, []);

  const addHistory = useCallback((entry: HistoryEntry) => {
    setState((s) => ({
      ...s,
      history: [entry, ...s.history].slice(0, HISTORY_LIMIT),
      lastBackupAt: entry.status === "completed" && entry.templateId === "full-backup" ? entry.createdAt : s.lastBackupAt,
      integrations:
        entry.status === "completed" && s.integrations[entry.destination]
          ? { ...s.integrations, [entry.destination]: { ...s.integrations[entry.destination]!, lastSyncAt: entry.createdAt } }
          : s.integrations,
    }));
  }, []);

  const deliver = useCallback(
    async ({ artifact, destination, params, target, trigger = "manual", scheduleId }: DeliverRequest) => {
      const def = DESTINATION_BY_ID[destination];
      const id = createId();
      const startedAt = Date.now();
      const copy = jobCopy(destination, artifact, target);
      const job: Job = { id, ...copy, destination, state: "queued", progress: 0, startedAt };
      setJobs((js) => [job, ...js].slice(0, 8));

      const finish = (status: HistoryEntry["status"], error?: string): HistoryEntry => {
        patchJob(id, { state: status, progress: status === "completed" ? 1 : undefined, error });
        const entry: HistoryEntry = {
          id,
          templateId: artifact.templateId,
          destination,
          title: artifact.title,
          filename: artifact.filename,
          bytes: artifact.bytes,
          recordCount: artifact.recordCount,
          status,
          target,
          trigger,
          scheduleId,
          params,
          createdAt: new Date().toISOString(),
          durationMs: Date.now() - startedAt,
        };
        addHistory(entry);
        return entry;
      };

      await sleep(300);
      if (def.requiresConnection && !stateRef.current.integrations[destination]?.connected) {
        const entry = finish("failed", `${def.name} isn't connected`);
        toast(`${def.name} isn't connected — reconnect it in Integrations`, "error");
        return entry;
      }

      patchJob(id, { state: "running" });
      const duration = transferMs(destination, artifact.bytes);
      const t0 = performance.now();
      for (;;) {
        if (cancelled.current.has(id)) {
          cancelled.current.delete(id);
          finish("cancelled");
          return null;
        }
        const t = Math.min(1, (performance.now() - t0) / duration);
        patchJob(id, { progress: ease(t) * 0.98 });
        if (t >= 1) break;
        await sleep(110);
      }

      if (destination === "download") downloadArtifact(artifact);
      const entry = finish("completed");
      if (trigger === "manual") {
        const verb = destination === "download" ? "Downloaded" : destination === "email" ? "Sent" : "Delivered";
        toast(`${verb} ${artifact.title}${def.simulated ? " (simulated)" : ""}`);
      }
      return entry;
    },
    [addHistory, patchJob, toast],
  );

  const cancelJob = useCallback((id: string) => cancelled.current.add(id), []);
  const clearFinishedJobs = useCallback(() => setJobs((js) => js.filter((j) => j.state === "queued" || j.state === "running")), []);

  const connect = useCallback((id: DestinationId) => {
    setState((s) => ({
      ...s,
      integrations: { ...s.integrations, [id]: { connected: true, account: DEMO_ACCOUNT, connectedAt: new Date().toISOString() } },
    }));
  }, []);

  const disconnect = useCallback((id: DestinationId) => {
    setState((s) => ({ ...s, integrations: { ...s.integrations, [id]: { connected: false } } }));
  }, []);

  const setLiveSync = useCallback((target: Integration["liveSync"]) => {
    setState((s) => ({
      ...s,
      integrations: {
        ...s.integrations,
        "google-sheets": { ...(s.integrations["google-sheets"] ?? { connected: false }), liveSync: target, lastSyncAt: new Date().toISOString() },
      },
    }));
  }, []);

  // Simulated live sync: push changes to the linked sheet shortly after edits.
  const liveSync = state.integrations["google-sheets"]?.connected ? state.integrations["google-sheets"]?.liveSync : null;
  const firstExpenses = useRef(true);
  useEffect(() => {
    if (isLoading) return;
    if (firstExpenses.current) {
      firstExpenses.current = false;
      return;
    }
    if (!liveSync) return;
    setLiveSyncing(true);
    const t = setTimeout(() => {
      setLiveSyncing(false);
      setState((s) => ({
        ...s,
        integrations: {
          ...s.integrations,
          "google-sheets": { ...s.integrations["google-sheets"]!, lastSyncAt: new Date().toISOString() },
        },
      }));
    }, 1800);
    return () => clearTimeout(t);
  }, [expenses, isLoading, liveSync]);

  const createShare = useCallback(
    async (artifact: ExportArtifact, params: TemplateParams, options: ShareOptions) => {
      const now = new Date();
      const rows = artifact.rows;
      const dates = rows.map((e) => e.date).sort();
      const payload: SharePayload = {
        v: 1,
        title: artifact.title,
        scope: artifact.scopeLabel,
        templateId: artifact.templateId,
        sharedBy: options.sharedBy?.trim() || undefined,
        note: options.note?.trim() || undefined,
        createdAt: now.toISOString(),
        expiresAt: options.expiresInDays ? new Date(now.getTime() + options.expiresInDays * 86_400_000).toISOString() : null,
        summary: {
          count: rows.length,
          total: sumAmounts(rows),
          byCategory: totalsByCategory(rows),
          firstDate: dates[0] ?? null,
          lastDate: dates[dates.length - 1] ?? null,
        },
        items: options.includeItems ? rows.map((e) => [e.date, e.category, e.amount, e.description]) : undefined,
      };
      const token = await encodeShare(payload, options.password || undefined);
      const link: ShareLink = {
        id: createId(),
        title: `${artifact.title} · ${artifact.scopeLabel}`,
        templateId: artifact.templateId,
        url: shareUrl(token),
        createdAt: payload.createdAt,
        expiresAt: payload.expiresAt,
        protected: !!options.password,
        includesItems: options.includeItems,
        recordCount: rows.length,
      };
      setState((s) => ({ ...s, shares: [link, ...s.shares] }));
      addHistory({
        id: createId(),
        templateId: artifact.templateId,
        destination: "share-link",
        title: artifact.title,
        filename: artifact.filename,
        bytes: link.url.length,
        recordCount: rows.length,
        status: "completed",
        target: link.protected ? "Password-protected link" : "Public link",
        trigger: "manual",
        params,
        createdAt: payload.createdAt,
        durationMs: 0,
      });
      return link;
    },
    [addHistory],
  );

  const removeShare = useCallback((id: string) => setState((s) => ({ ...s, shares: s.shares.filter((l) => l.id !== id) })), []);

  const saveSchedule = useCallback<CloudContextValue["saveSchedule"]>((input) => {
    setState((s) => {
      const nextRunAt = computeNextRun(input).toISOString();
      if (input.id) {
        return { ...s, schedules: s.schedules.map((x) => (x.id === input.id ? { ...x, ...input, id: x.id, nextRunAt } : x)) };
      }
      const schedule: Schedule = { ...input, id: createId(), createdAt: new Date().toISOString(), nextRunAt };
      return { ...s, schedules: [...s.schedules, schedule] };
    });
  }, []);

  const removeSchedule = useCallback((id: string) => setState((s) => ({ ...s, schedules: s.schedules.filter((x) => x.id !== id) })), []);

  const toggleSchedule = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      schedules: s.schedules.map((x) =>
        x.id === id ? { ...x, enabled: !x.enabled, nextRunAt: computeNextRun(x).toISOString() } : x,
      ),
    }));
  }, []);

  const runSchedule = useCallback(
    (schedule: Schedule) => {
      const params = defaultParams(schedule.templateId);
      const artifact = buildArtifact(schedule.templateId, expensesRef.current, params);
      const now = new Date();
      setState((s) => ({
        ...s,
        schedules: s.schedules.map((x) =>
          x.id === schedule.id ? { ...x, lastRunAt: now.toISOString(), nextRunAt: computeNextRun(x, now).toISOString() } : x,
        ),
      }));
      return deliver({ artifact, destination: schedule.destination, params, target: schedule.target, trigger: "schedule", scheduleId: schedule.id });
    },
    [deliver],
  );

  const runScheduleNow = useCallback(
    (id: string) => {
      const schedule = stateRef.current.schedules.find((x) => x.id === id);
      if (schedule) {
        toast(`Running “${schedule.name}” in the background`, "info");
        void runSchedule(schedule);
      }
    },
    [runSchedule, toast],
  );

  // Background scheduler: runs due schedules while the app is open and catches up
  // (once per schedule) on anything missed while it was closed.
  const firstTick = useRef(true);
  useEffect(() => {
    if (!hydrated || isLoading) return;
    const tick = () => {
      const now = Date.now();
      const due = stateRef.current.schedules.filter((x) => x.enabled && new Date(x.nextRunAt).getTime() <= now);
      if (due.length && firstTick.current) {
        toast(`Catching up on ${due.length} scheduled ${due.length === 1 ? "export" : "exports"} missed while you were away`, "info");
      }
      firstTick.current = false;
      due.forEach((x) => void runSchedule(x));
    };
    tick();
    const interval = setInterval(tick, 20_000);
    return () => clearInterval(interval);
  }, [hydrated, isLoading, runSchedule, toast]);

  const clearHistory = useCallback(() => setState((s) => ({ ...s, history: [] })), []);

  const activeJob = jobs.find((j) => j.state === "running" || j.state === "queued");
  const syncStatus: SyncStatus = useMemo(() => {
    if (activeJob) return { state: "syncing", label: activeJob.label };
    if (liveSyncing) return { state: "syncing", label: "Syncing to Google Sheets" };
    if (!state.lastBackupAt) return { state: "never" };
    const changes = expenses.filter((e) => e.updatedAt > state.lastBackupAt!).length;
    return changes > 0 ? { state: "stale", changes, since: state.lastBackupAt } : { state: "ok", since: state.lastBackupAt };
  }, [activeJob, liveSyncing, state.lastBackupAt, expenses]);

  const value = useMemo<CloudContextValue>(
    () => ({
      ...state,
      hydrated,
      jobs,
      syncStatus,
      deliver,
      cancelJob,
      clearFinishedJobs,
      connect,
      disconnect,
      setLiveSync,
      createShare,
      removeShare,
      saveSchedule,
      removeSchedule,
      toggleSchedule,
      runScheduleNow,
      clearHistory,
    }),
    [state, hydrated, jobs, syncStatus, deliver, cancelJob, clearFinishedJobs, connect, disconnect, setLiveSync, createShare, removeShare, saveSchedule, removeSchedule, toggleSchedule, runScheduleNow, clearHistory],
  );

  return <CloudContext.Provider value={value}>{children}</CloudContext.Provider>;
}

export function useCloud(): CloudContextValue {
  const ctx = useContext(CloudContext);
  if (!ctx) throw new Error("useCloud must be used within CloudProvider");
  return ctx;
}

export { TEMPLATE_BY_ID };
