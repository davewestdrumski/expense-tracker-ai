import type { Category, Expense } from "@/types/expense";

export type TemplateId = "tax-report" | "monthly-summary" | "category-analysis" | "full-backup";

export type DestinationId =
  | "download"
  | "email"
  | "share-link"
  | "google-sheets"
  | "google-drive"
  | "dropbox"
  | "onedrive"
  | "notion";

/** Parameters a template can be scoped by (only the relevant one is used). */
export interface TemplateParams {
  year?: number;
  /** YYYY-MM */
  month?: string;
}

/** A generated file, ready to deliver to any destination. */
export interface ExportArtifact {
  templateId: TemplateId;
  title: string;
  filename: string;
  mimeType: string;
  content: string;
  bytes: number;
  recordCount: number;
  /** Rows the artifact covers, for share links and email summaries. */
  rows: Expense[];
  /** Human-friendly scope, e.g. "Tax year 2026" or "October 2026". */
  scopeLabel: string;
}

export interface Integration {
  connected: boolean;
  account?: string;
  connectedAt?: string;
  lastSyncAt?: string;
  /** Google Sheets "live sync" target. */
  liveSync?: { spreadsheet: string; sheet: string } | null;
}

export type HistoryStatus = "completed" | "failed" | "cancelled";

export interface HistoryEntry {
  id: string;
  templateId: TemplateId;
  destination: DestinationId;
  title: string;
  filename: string;
  bytes: number;
  recordCount: number;
  status: HistoryStatus;
  /** Where it went: an email address, a cloud path, a link id… */
  target?: string;
  trigger: "manual" | "schedule";
  scheduleId?: string;
  params: TemplateParams;
  createdAt: string;
  durationMs: number;
}

export type Frequency = "daily" | "weekly" | "monthly";

export interface Schedule {
  id: string;
  name: string;
  templateId: TemplateId;
  destination: DestinationId;
  target: string;
  frequency: Frequency;
  /** 0 (Sun) – 6 (Sat) for weekly. */
  weekday: number;
  /** 1–28 for monthly. */
  dayOfMonth: number;
  /** HH:MM, local time. */
  time: string;
  enabled: boolean;
  createdAt: string;
  lastRunAt?: string;
  nextRunAt: string;
}

export interface ShareLink {
  id: string;
  title: string;
  templateId: TemplateId;
  url: string;
  createdAt: string;
  expiresAt: string | null;
  protected: boolean;
  includesItems: boolean;
  recordCount: number;
}

export type JobState = "queued" | "running" | "completed" | "failed" | "cancelled";

/** A unit of background work shown in the activity tray. */
export interface Job {
  id: string;
  label: string;
  detail: string;
  destination: DestinationId;
  state: JobState;
  progress: number;
  startedAt: number;
  error?: string;
}

/** Compact, serialisable report embedded in share links. */
export interface SharePayload {
  v: 1;
  title: string;
  scope: string;
  templateId: TemplateId;
  sharedBy?: string;
  note?: string;
  createdAt: string;
  expiresAt: string | null;
  summary: {
    count: number;
    total: number;
    byCategory: { category: Category; count: number; total: number }[];
    firstDate: string | null;
    lastDate: string | null;
  };
  /** [date, category, amount, description] — omitted for summary-only links. */
  items?: [string, Category, number, string][];
}
