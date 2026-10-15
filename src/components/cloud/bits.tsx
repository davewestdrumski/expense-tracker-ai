import { FlaskConical } from "lucide-react";
import { DESTINATION_BY_ID } from "@/lib/cloud/destinations";
import type { DestinationId } from "@/lib/cloud/types";

export function DestinationTile({ id, size = "md" }: { id: DestinationId; size?: "sm" | "md" | "lg" }) {
  const { icon: Icon, color } = DESTINATION_BY_ID[id];
  const box = { sm: "h-7 w-7 rounded-lg", md: "h-10 w-10 rounded-xl", lg: "h-14 w-14 rounded-2xl" }[size];
  const glyph = { sm: "h-3.5 w-3.5", md: "h-5 w-5", lg: "h-7 w-7" }[size];
  return (
    <span className={`flex shrink-0 items-center justify-center text-white shadow-sm ${box}`} style={{ backgroundColor: color }}>
      <Icon className={glyph} aria-hidden />
    </span>
  );
}

/** Marks integrations whose delivery is simulated in this demo. */
export function SimulatedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 ring-1 ring-inset ring-amber-600/20 ${className}`}
      title="This integration is simulated in the demo — no data leaves your browser."
    >
      <FlaskConical className="h-2.5 w-2.5" aria-hidden />
      Simulated
    </span>
  );
}

export function StatusDot({ tone }: { tone: "green" | "amber" | "slate" | "blue" | "red" }) {
  const color = { green: "bg-emerald-500", amber: "bg-amber-500", slate: "bg-slate-300", blue: "bg-brand-500", red: "bg-red-500" }[tone];
  return (
    <span className="relative flex h-2 w-2">
      {tone === "blue" && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${color}`} />}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${color}`} />
    </span>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
        checked ? "bg-brand-600" : "bg-slate-300"
      }`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition ${checked ? "translate-x-[18px]" : "translate-x-0.5"}`} />
    </button>
  );
}
