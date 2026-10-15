import type { DestinationId, HistoryEntry, Integration, Schedule, ShareLink } from "./types";

const KEY = "spendwise:cloud:v1";
export const HISTORY_LIMIT = 100;

export interface CloudState {
  integrations: Partial<Record<DestinationId, Integration>>;
  history: HistoryEntry[];
  schedules: Schedule[];
  shares: ShareLink[];
  /** Last successful backup to any off-device destination. */
  lastBackupAt?: string;
}

export const EMPTY_CLOUD_STATE: CloudState = { integrations: {}, history: [], schedules: [], shares: [] };

export function loadCloudState(): CloudState {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY_CLOUD_STATE;
    const parsed = JSON.parse(raw) as Partial<CloudState>;
    return {
      integrations: parsed.integrations ?? {},
      history: Array.isArray(parsed.history) ? parsed.history : [],
      schedules: Array.isArray(parsed.schedules) ? parsed.schedules : [],
      shares: Array.isArray(parsed.shares) ? parsed.shares : [],
      lastBackupAt: parsed.lastBackupAt,
    };
  } catch {
    return EMPTY_CLOUD_STATE;
  }
}

export function saveCloudState(state: CloudState): void {
  window.localStorage.setItem(KEY, JSON.stringify(state));
}
