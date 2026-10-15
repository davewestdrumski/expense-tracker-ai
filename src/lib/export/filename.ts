import { CATEGORIES } from "@/types/expense";
import { todayISO } from "@/lib/format";
import type { ExportOptions } from "./types";

const MAX_LENGTH = 80;

/** Strips characters that are invalid in filenames on common operating systems. */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/\.(csv|json|pdf)$/i, "")
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^[.\s-]+|[.\s-]+$/g, "")
    .slice(0, MAX_LENGTH);
}

export function suggestFilename(options: Pick<ExportOptions, "startDate" | "endDate" | "categories">): string {
  const parts = ["expenses"];
  if (options.categories.length > 0 && options.categories.length < CATEGORIES.length) {
    parts.push(options.categories.length <= 2 ? options.categories.join("-").toLowerCase() : `${options.categories.length}-categories`);
  }
  if (options.startDate || options.endDate) {
    parts.push(`${options.startDate || "start"}_to_${options.endDate || todayISO()}`);
  } else {
    parts.push(todayISO());
  }
  return parts.join("-");
}

export function validateFilename(name: string): string | null {
  if (!name.trim()) return null; // empty falls back to the suggestion
  if (!sanitizeFilename(name)) return "Filename has no valid characters.";
  if (name.trim().length > MAX_LENGTH) return `Keep the filename under ${MAX_LENGTH} characters.`;
  return null;
}
