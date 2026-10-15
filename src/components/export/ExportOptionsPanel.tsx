"use client";

import type { ReactNode } from "react";
import { Braces, Check, FileSpreadsheet, FileText, Search, type LucideIcon } from "lucide-react";
import { CATEGORIES, type Category, type SortKey } from "@/types/expense";
import { CATEGORY_META } from "@/lib/categories";
import { DATE_PRESETS, matchPreset, presetRange } from "@/lib/date-ranges";
import { EXPORT_COLUMNS } from "@/lib/export/columns";
import { EXPORT_FORMATS } from "@/lib/export/registry";
import type { ExportColumnKey, ExportFormat, ExportOptions } from "@/lib/export/types";
import { inputClass } from "../ui";

const FORMAT_ICONS: Record<ExportFormat, LucideIcon> = {
  csv: FileSpreadsheet,
  json: Braces,
  pdf: FileText,
};

interface Props {
  options: ExportOptions;
  onChange: (patch: Partial<ExportOptions>) => void;
  counts: Record<string, number>;
  filename: string;
  suggestedFilename: string;
  onFilenameChange: (value: string) => void;
  errors: Partial<Record<"dates" | "categories" | "columns" | "filename", string>>;
  disabled?: boolean;
}

function Section({ title, aside, children, error }: { title: string; aside?: ReactNode; children: ReactNode; error?: string }) {
  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
        {aside}
      </div>
      {children}
      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
    </section>
  );
}

function LinkButton({ onClick, children, disabled }: { onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-xs font-medium text-brand-600 hover:text-brand-700 disabled:cursor-default disabled:text-slate-300"
    >
      {children}
    </button>
  );
}

export function ExportOptionsPanel({
  options,
  onChange,
  counts,
  filename,
  suggestedFilename,
  onFilenameChange,
  errors,
  disabled,
}: Props) {
  const activePreset = matchPreset(options);
  const allTime = !options.startDate && !options.endDate;
  const extension = EXPORT_FORMATS.find((f) => f.format === options.format)!.extension;

  const toggleCategory = (c: Category) => {
    const next = options.categories.includes(c)
      ? options.categories.filter((x) => x !== c)
      : CATEGORIES.filter((x) => x === c || options.categories.includes(x));
    onChange({ categories: next });
  };

  const toggleColumn = (key: ExportColumnKey) => {
    onChange({
      columns: options.columns.includes(key)
        ? options.columns.filter((k) => k !== key)
        : EXPORT_COLUMNS.map((c) => c.key).filter((k) => k === key || options.columns.includes(k)),
    });
  };

  return (
    <fieldset disabled={disabled} className="space-y-7">
      {/* Format */}
      <Section title="Format">
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Export format">
          {EXPORT_FORMATS.map((f) => {
            const Icon = FORMAT_ICONS[f.format];
            const selected = options.format === f.format;
            return (
              <label
                key={f.format}
                className={`relative flex cursor-pointer flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center ring-1 ring-inset transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 ${
                  selected ? "bg-brand-50 ring-brand-500" : "bg-white ring-slate-200 hover:bg-slate-50"
                }`}
                title={f.tagline}
              >
                <input
                  type="radio"
                  name="export-format"
                  value={f.format}
                  checked={selected}
                  onChange={() => onChange({ format: f.format })}
                  className="sr-only"
                />
                <Icon className={`h-6 w-6 ${selected ? "text-brand-600" : "text-slate-400"}`} aria-hidden />
                <span className={`text-sm font-semibold ${selected ? "text-brand-700" : "text-slate-700"}`}>{f.label}</span>
                {selected && (
                  <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600">
                    <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} aria-hidden />
                  </span>
                )}
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-slate-500">{EXPORT_FORMATS.find((f) => f.format === options.format)!.tagline}</p>
      </Section>

      {/* Date range */}
      <Section title="Date range" error={errors.dates}>
        <div className="mb-3 flex flex-wrap gap-1.5">
          <Chip active={allTime} onClick={() => onChange({ startDate: "", endDate: "" })}>
            All time
          </Chip>
          {DATE_PRESETS.map((p) => (
            <Chip key={p.id} active={activePreset === p.id} onClick={() => onChange(presetRange(p.id))}>
              {p.label}
            </Chip>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">From</span>
            <input
              type="date"
              value={options.startDate}
              max={options.endDate || undefined}
              onChange={(e) => onChange({ startDate: e.target.value })}
              className={`${inputClass} ${errors.dates ? "ring-red-400" : ""}`}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">To</span>
            <input
              type="date"
              value={options.endDate}
              min={options.startDate || undefined}
              onChange={(e) => onChange({ endDate: e.target.value })}
              className={`${inputClass} ${errors.dates ? "ring-red-400" : ""}`}
            />
          </label>
        </div>
      </Section>

      {/* Categories */}
      <Section
        title={`Categories (${options.categories.length}/${CATEGORIES.length})`}
        error={errors.categories}
        aside={
          <span className="flex gap-3">
            <LinkButton onClick={() => onChange({ categories: [...CATEGORIES] })} disabled={options.categories.length === CATEGORIES.length}>
              All
            </LinkButton>
            <LinkButton onClick={() => onChange({ categories: [] })} disabled={options.categories.length === 0}>
              None
            </LinkButton>
          </span>
        }
      >
        <div className="grid grid-cols-2 gap-1.5">
          {CATEGORIES.map((c) => {
            const checked = options.categories.includes(c);
            const { icon: Icon, color } = CATEGORY_META[c];
            return (
              <label
                key={c}
                className={`flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm ring-1 ring-inset transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 ${
                  checked ? "bg-white ring-slate-300" : "bg-slate-50 text-slate-400 ring-slate-200"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleCategory(c)}
                  className="h-3.5 w-3.5 rounded border-slate-300 accent-brand-600"
                />
                <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: checked ? color : undefined }} aria-hidden />
                <span className={`flex-1 truncate font-medium ${checked ? "text-slate-700" : ""}`}>{c}</span>
                <span className="text-xs tabular-nums text-slate-400">{counts[c] ?? 0}</span>
              </label>
            );
          })}
        </div>
      </Section>

      {/* Keyword */}
      <Section title="Keyword">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="search"
            value={options.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Only include matching descriptions"
            className={`${inputClass} pl-9`}
            aria-label="Keyword filter"
          />
        </div>
      </Section>

      {/* Columns & sort */}
      <Section title="Columns & order" error={errors.columns}>
        <div className="flex flex-wrap gap-1.5">
          {EXPORT_COLUMNS.map((col) => (
            <Chip key={col.key} active={options.columns.includes(col.key)} onClick={() => toggleColumn(col.key)} check>
              {col.label}
            </Chip>
          ))}
        </div>
        <select
          value={options.sort}
          onChange={(e) => onChange({ sort: e.target.value as SortKey })}
          className={`${inputClass} mt-3`}
          aria-label="Sort order"
        >
          <option value="date-desc">Date — newest first</option>
          <option value="date-asc">Date — oldest first</option>
          <option value="amount-desc">Amount — highest first</option>
          <option value="amount-asc">Amount — lowest first</option>
        </select>
      </Section>

      {/* Filename */}
      <Section title="Filename" error={errors.filename}>
        <div className="flex rounded-lg shadow-sm">
          <input
            type="text"
            value={filename}
            onChange={(e) => onFilenameChange(e.target.value)}
            placeholder={suggestedFilename}
            spellCheck={false}
            aria-label="Filename"
            className={`${inputClass} rounded-r-none shadow-none ${errors.filename ? "ring-red-400" : ""}`}
          />
          <span className="inline-flex items-center rounded-r-lg bg-slate-50 px-3 font-mono text-xs text-slate-500 ring-1 ring-inset ring-slate-300 [margin-left:-1px]">
            .{extension}
          </span>
        </div>
        {filename && (
          <LinkButton onClick={() => onFilenameChange("")}>Reset to suggested name</LinkButton>
        )}
      </Section>
    </fieldset>
  );
}

function Chip({
  active,
  onClick,
  children,
  check,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  check?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition ${
        active ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {check && active && <Check className="h-3 w-3" strokeWidth={3} aria-hidden />}
      {children}
    </button>
  );
}
