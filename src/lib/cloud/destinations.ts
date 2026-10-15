import { Cloud, Download, FileText, HardDrive, Link2, Mail, Package, Table2, type LucideIcon } from "lucide-react";
import type { DestinationId } from "./types";

export interface DestinationDefinition {
  id: DestinationId;
  name: string;
  description: string;
  icon: LucideIcon;
  /** Brand-adjacent tint for the icon tile. */
  color: string;
  /** Requires an OAuth-style connection before use. */
  requiresConnection: boolean;
  /** True when delivery is simulated in this demo (no real network call). */
  simulated: boolean;
  /** Can be used as a recurring schedule target. */
  schedulable: boolean;
  /** Default target, e.g. a folder path. */
  defaultTarget?: string;
}

export const DESTINATIONS: DestinationDefinition[] = [
  { id: "download", name: "Download", description: "Save the file to this device", icon: Download, color: "#475569", requiresConnection: false, simulated: false, schedulable: false },
  { id: "share-link", name: "Share link", description: "Private link & QR code, optional password", icon: Link2, color: "#2547eb", requiresConnection: false, simulated: false, schedulable: false },
  { id: "email", name: "Email", description: "Send as an attachment to anyone", icon: Mail, color: "#db2777", requiresConnection: false, simulated: true, schedulable: true },
  { id: "google-sheets", name: "Google Sheets", description: "New spreadsheet or live-synced tab", icon: Table2, color: "#0f9d58", requiresConnection: true, simulated: true, schedulable: true, defaultTarget: "Spendwise Expenses" },
  { id: "google-drive", name: "Google Drive", description: "Upload to a Drive folder", icon: HardDrive, color: "#1a73e8", requiresConnection: true, simulated: true, schedulable: true, defaultTarget: "/Spendwise/Exports" },
  { id: "dropbox", name: "Dropbox", description: "Upload to an app folder", icon: Package, color: "#0061fe", requiresConnection: true, simulated: true, schedulable: true, defaultTarget: "/Apps/Spendwise" },
  { id: "onedrive", name: "OneDrive", description: "Upload to your OneDrive", icon: Cloud, color: "#0078d4", requiresConnection: true, simulated: true, schedulable: true, defaultTarget: "/Documents/Spendwise" },
  { id: "notion", name: "Notion", description: "Add as a page or database rows", icon: FileText, color: "#191919", requiresConnection: true, simulated: true, schedulable: true, defaultTarget: "Finance / Expense Reports" },
];

export const DESTINATION_BY_ID = Object.fromEntries(DESTINATIONS.map((d) => [d.id, d])) as Record<DestinationId, DestinationDefinition>;

/** Demo account shown after a simulated OAuth connection. */
export const DEMO_ACCOUNT = "you@example.com";
