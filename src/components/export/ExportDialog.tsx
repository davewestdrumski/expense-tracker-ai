"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Download, FolderDown, RotateCcw } from "lucide-react";
import { useExpenses } from "@/context/ExpenseContext";
import { useToast } from "@/context/ToastContext";
import { CATEGORIES } from "@/types/expense";
import { formatCurrency } from "@/lib/format";
import { ALL_COLUMN_KEYS } from "@/lib/export/columns";
import { formatBytes } from "@/lib/export/download";
import { sanitizeFilename, suggestFilename, validateFilename } from "@/lib/export/filename";
import { EXPORTERS } from "@/lib/export/registry";
import { categoryCounts, selectExpenses, summarize } from "@/lib/export/select";
import type { ExportContext, ExportOptions } from "@/lib/export/types";
import { useExport } from "@/hooks/useExport";
import { Modal } from "../Modal";
import { Button } from "../ui";
import { ExportOptionsPanel } from "./ExportOptionsPanel";
import { ExportPreview } from "./ExportPreview";

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: "csv",
  startDate: "",
  endDate: "",
  categories: [...CATEGORIES],
  search: "",
  columns: ALL_COLUMN_KEYS,
  sort: "date-desc",
  filename: "",
};

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  /** Seed options, e.g. the filters currently applied on the Expenses page. */
  preset?: Partial<ExportOptions>;
}

export function ExportDialog({ open, onClose, preset }: ExportDialogProps) {
  const { expenses } = useExpenses();
  const { toast } = useToast();
  const { status, run, reset } = useExport();
  const [options, setOptions] = useState<ExportOptions>(() => ({ ...DEFAULT_EXPORT_OPTIONS, ...preset }));
  const [generatedAt] = useState(() => new Date());

  const update = (patch: Partial<ExportOptions>) => {
    setOptions((o) => ({ ...o, ...patch }));
    if (status.state === "error") reset();
  };

  const rows = useMemo(() => selectExpenses(expenses, options), [expenses, options]);
  const summary = useMemo(() => summarize(rows), [rows]);
  const counts = useMemo(() => categoryCounts(expenses, options), [expenses, options]);
  const ctx: ExportContext = useMemo(() => ({ options, rows, summary, generatedAt }), [options, rows, summary, generatedAt]);

  const suggested = suggestFilename(options);
  const errors = {
    dates: options.startDate && options.endDate && options.startDate > options.endDate ? "Start date is after the end date." : undefined,
    categories: options.categories.length === 0 ? "Select at least one category." : undefined,
    columns: options.columns.length === 0 ? "Select at least one column." : undefined,
    filename: validateFilename(options.filename) ?? undefined,
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const canExport = !hasErrors && rows.length > 0;
  const working = status.state === "working";
  const exporter = EXPORTERS[options.format];

  const handleExport = async () => {
    if (!canExport) return;
    const base = sanitizeFilename(options.filename) || suggested;
    const result = await run({ ...ctx, generatedAt: new Date() }, base);
    if (result) toast(`Exported ${result.count} ${result.count === 1 ? "expense" : "expenses"} as ${exporter.label}`);
  };

  const close = () => {
    if (!working) onClose();
  };

  const footer =
    status.state === "success" ? (
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={reset} icon={<RotateCcw className="h-4 w-4" aria-hidden />}>
          Export another
        </Button>
        <Button onClick={onClose}>Done</Button>
      </div>
    ) : (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-sm" aria-live="polite">
          {status.state === "error" ? (
            <span className="flex items-center gap-1.5 font-medium text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
              {status.message}
            </span>
          ) : rows.length === 0 ? (
            <span className="text-slate-500">No records match — adjust your filters.</span>
          ) : (
            <span className="text-slate-600">
              <span className="font-semibold text-slate-900">{summary.count.toLocaleString("en-US")}</span>{" "}
              {summary.count === 1 ? "record" : "records"} ·{" "}
              <span className="font-semibold tabular-nums text-slate-900">{formatCurrency(summary.total)}</span> ·{" "}
              <span className="font-mono text-xs">
                {sanitizeFilename(options.filename) || suggested}.{exporter.extension}
              </span>
            </span>
          )}
        </div>
        <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row">
          <Button variant="secondary" onClick={close} disabled={working}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={!canExport}
            loading={working}
            icon={<Download className="h-4 w-4" aria-hidden />}
            className="min-w-[150px]"
          >
            {working ? `Generating ${exporter.label}…` : `Export ${exporter.label}`}
          </Button>
        </div>
      </div>
    );

  return (
    <Modal
      open={open}
      onClose={close}
      size="xl"
      title="Export expenses"
      description="Choose a format, narrow down the data, and preview it before downloading."
      footer={footer}
    >
      {status.state === "success" ? (
        <div className="flex flex-col items-center py-12 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/50">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" aria-hidden />
          </span>
          <h3 className="mt-5 text-lg font-semibold text-slate-900">Export complete</h3>
          <p className="mt-1 text-sm text-slate-500">Your file has been downloaded. Check your browser&apos;s downloads.</p>
          <div className="mt-6 flex w-full max-w-sm items-center gap-3 rounded-xl bg-slate-50 p-4 text-left ring-1 ring-slate-200">
            <FolderDown className="h-8 w-8 shrink-0 text-brand-600" aria-hidden />
            <div className="min-w-0">
              <p className="truncate font-mono text-sm font-medium text-slate-900">{status.filename}</p>
              <p className="text-xs text-slate-500">
                {status.count.toLocaleString("en-US")} {status.count === 1 ? "record" : "records"} · {formatBytes(status.bytes)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <ExportOptionsPanel
            options={options}
            onChange={update}
            counts={counts}
            filename={options.filename}
            suggestedFilename={suggested}
            onFilenameChange={(filename) => update({ filename })}
            errors={errors}
            disabled={working}
          />
          <div className="lg:sticky lg:top-0 lg:self-start">
            <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</h3>
            <ExportPreview ctx={ctx} />
          </div>
        </div>
      )}
    </Modal>
  );
}
