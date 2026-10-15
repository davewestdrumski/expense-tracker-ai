import type { Frequency, Schedule } from "./types";

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Timing = Pick<Schedule, "frequency" | "weekday" | "dayOfMonth" | "time">;

/** Next run strictly after `from`, in local time. */
export function computeNextRun(s: Timing, from = new Date()): Date {
  const [hh, mm] = s.time.split(":").map(Number);
  const at = (y: number, m: number, d: number) => new Date(y, m, d, hh, mm, 0, 0);
  const y = from.getFullYear();
  const m = from.getMonth();
  const d = from.getDate();

  switch (s.frequency) {
    case "daily": {
      const c = at(y, m, d);
      return c > from ? c : at(y, m, d + 1);
    }
    case "weekly": {
      const delta = (s.weekday - from.getDay() + 7) % 7;
      const c = at(y, m, d + delta);
      return c > from ? c : at(y, m, d + delta + 7);
    }
    case "monthly": {
      const c = at(y, m, s.dayOfMonth);
      return c > from ? c : at(y, m + 1, s.dayOfMonth);
    }
  }
}

function ordinal(n: number): string {
  const suffix = n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th";
  return `${n}${suffix}`;
}

export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function describeSchedule(s: Timing): string {
  const at = formatTime(s.time);
  const labels: Record<Frequency, string> = {
    daily: `Every day at ${at}`,
    weekly: `Every ${WEEKDAYS[s.weekday]} at ${at}`,
    monthly: `Monthly on the ${ordinal(s.dayOfMonth)} at ${at}`,
  };
  return labels[s.frequency];
}

export function relativeTime(iso: string | number, now = Date.now()): string {
  const t = typeof iso === "number" ? iso : new Date(iso).getTime();
  const diff = t - now;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 45_000) return diff >= 0 ? "in a few seconds" : "just now";
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["minute", 60_000],
    ["hour", 3_600_000],
    ["day", 86_400_000],
    ["week", 604_800_000],
    ["month", 2_592_000_000],
  ];
  let unit: Intl.RelativeTimeFormatUnit = "minute";
  let size = 60_000;
  for (const [u, ms] of units) if (abs >= ms) [unit, size] = [u, ms];
  return rtf.format(Math.round(diff / size), unit);
}
