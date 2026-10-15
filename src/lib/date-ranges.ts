import { toISODate } from "./format";

export type DatePreset = "this-month" | "last-month" | "30d" | "90d" | "year";

export interface DateRange {
  startDate: string;
  endDate: string;
}

export const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: "this-month", label: "This month" },
  { id: "last-month", label: "Last month" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "year", label: "This year" },
];

export function presetRange(preset: DatePreset, now = new Date()): DateRange {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  switch (preset) {
    case "this-month":
      return { startDate: toISODate(new Date(y, m, 1)), endDate: toISODate(now) };
    case "last-month":
      return { startDate: toISODate(new Date(y, m - 1, 1)), endDate: toISODate(new Date(y, m, 0)) };
    case "30d":
      return { startDate: toISODate(new Date(y, m, d - 29)), endDate: toISODate(now) };
    case "90d":
      return { startDate: toISODate(new Date(y, m, d - 89)), endDate: toISODate(now) };
    case "year":
      return { startDate: toISODate(new Date(y, 0, 1)), endDate: toISODate(now) };
  }
}

export function matchPreset(range: DateRange): DatePreset | null {
  return DATE_PRESETS.find((p) => {
    const r = presetRange(p.id);
    return r.startDate === range.startDate && r.endDate === range.endDate;
  })?.id ?? null;
}
