"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { ClipboardCopy, CloudUpload, FileUp, Sparkles } from "lucide-react";
import { useExpenses } from "@/context/ExpenseContext";
import { useCloud } from "@/context/CloudContext";
import { useToast } from "@/context/ToastContext";
import { copyText } from "@/lib/cloud/clipboard";
import { DESTINATION_BY_ID } from "@/lib/cloud/destinations";
import { relativeTime } from "@/lib/cloud/schedule";
import { BACKUP_SCHEMA, buildArtifact, toTSV } from "@/lib/cloud/templates";
import type { DestinationId } from "@/lib/cloud/types";
import { isExpense } from "@/lib/storage";
import { formatDate, monthKey, toISODate } from "@/lib/format";
import type { Expense } from "@/types/expense";
import { Modal } from "../../Modal";
import { Button, Card } from "../../ui";

const BACKUP_TARGETS: DestinationId[] = ["dropbox", "google-drive", "onedrive"];

export function QuickActions() {
  const { expenses, importExpenses } = useExpenses();
  const cloud = useCloud();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [restore, setRestore] = useState<{ expenses: Expense[]; exportedAt?: string; newCount: number } | null>(null);

  const backupTarget = BACKUP_TARGETS.find((d) => cloud.integrations[d]?.connected) ?? "download";

  const backUpNow = () => {
    const artifact = buildArtifact("full-backup", expenses, {});
    const def = DESTINATION_BY_ID[backupTarget];
    void cloud.deliver({ artifact, destination: backupTarget, params: {}, target: def.defaultTarget ? `${def.defaultTarget}/${artifact.filename}` : undefined });
  };

  const copyMonth = async () => {
    const key = monthKey(toISODate(new Date()));
    const rows = expenses.filter((e) => monthKey(e.date) === key);
    toast((await copyText(toTSV(rows))) ? `Copied ${rows.length} rows — paste into Sheets, Excel, Notion or Airtable` : "Couldn't access the clipboard", "info");
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const list: unknown[] = Array.isArray(data) ? data : data?.schema === BACKUP_SCHEMA ? data.expenses : null;
      if (!Array.isArray(list)) throw new Error("not a backup");
      const valid = list.filter(isExpense);
      if (!valid.length) throw new Error("empty");
      const existing = new Set(expenses.map((x) => x.id));
      setRestore({ expenses: valid, exportedAt: data?.exportedAt, newCount: valid.filter((x) => !existing.has(x.id)).length });
    } catch {
      toast("That file isn't a Spendwise backup", "error");
    }
  };

  const applyRestore = (mode: "merge" | "replace") => {
    if (!restore) return;
    const { added, skipped } = importExpenses(restore.expenses, mode);
    toast(mode === "replace" ? `Restored ${added} expenses from backup` : `Added ${added} expenses · ${skipped} already present`);
    setRestore(null);
  };

  const status = cloud.syncStatus;

  return (
    <aside className="space-y-4">
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-100">Backup</p>
          <p className="mt-1 text-lg font-semibold">
            {status.state === "never" ? "Not backed up yet" : status.state === "stale" ? `${status.changes} unsaved ${status.changes === 1 ? "change" : "changes"}` : status.state === "syncing" ? "Syncing…" : "Everything is backed up"}
          </p>
          <p className="mt-0.5 text-sm text-brand-100">{cloud.lastBackupAt ? `Last backup ${relativeTime(cloud.lastBackupAt)}` : "Protect your data with one click."}</p>
          <button
            type="button"
            onClick={backUpNow}
            disabled={!expenses.length}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50 disabled:opacity-60"
          >
            <CloudUpload className="h-4 w-4" aria-hidden />
            Back up now to {DESTINATION_BY_ID[backupTarget].name === "Download" ? "this device" : DESTINATION_BY_ID[backupTarget].name}
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full items-center gap-3 px-5 py-3.5 text-left text-sm hover:bg-slate-50">
            <FileUp className="h-4 w-4 text-slate-400" aria-hidden />
            <span className="flex-1">
              <span className="block font-medium text-slate-800">Restore from backup</span>
              <span className="block text-xs text-slate-500">Import a Spendwise .json backup</span>
            </span>
          </button>
          <button type="button" onClick={copyMonth} className="flex w-full items-center gap-3 px-5 py-3.5 text-left text-sm hover:bg-slate-50">
            <ClipboardCopy className="h-4 w-4 text-slate-400" aria-hidden />
            <span className="flex-1">
              <span className="block font-medium text-slate-800">Copy this month as a table</span>
              <span className="block text-xs text-slate-500">Paste straight into any spreadsheet</span>
            </span>
          </button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
      </Card>

      <Card className="p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Sparkles className="h-4 w-4 text-amber-500" aria-hidden /> Tip
        </p>
        <p className="mt-1.5 text-sm text-slate-600">
          Pair <span className="font-medium">Tax Report</span> with a password-protected share link to hand everything to your accountant — no attachments, and it expires on its own.
        </p>
      </Card>

      {restore && (
        <Modal open onClose={() => setRestore(null)} title="Restore from backup" size="sm">
          <p className="text-sm text-slate-600">
            Found <span className="font-semibold text-slate-900">{restore.expenses.length} expenses</span>
            {restore.exportedAt ? ` in a backup from ${formatDate(toISODate(new Date(restore.exportedAt)))}` : ""}.{" "}
            {restore.newCount} {restore.newCount === 1 ? "isn't" : "aren't"} in your current data.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button onClick={() => applyRestore("merge")}>Merge — add {restore.newCount} new</Button>
            <Button variant="secondary" onClick={() => applyRestore("replace")}>
              Replace all ({expenses.length} current → {restore.expenses.length})
            </Button>
            <Button variant="ghost" onClick={() => setRestore(null)}>
              Cancel
            </Button>
          </div>
        </Modal>
      )}
    </aside>
  );
}
