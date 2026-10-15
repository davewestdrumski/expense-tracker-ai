"use client";

import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  CalendarClock,
  ChevronDown,
  ClipboardCopy,
  Copy,
  ExternalLink,
  FileText,
  Folder,
  KeyRound,
  Link2,
  Mail,
  Paperclip,
  QrCode,
  Share2,
  ShieldCheck,
  X,
} from "lucide-react";
import { useCloud } from "@/context/CloudContext";
import { useToast } from "@/context/ToastContext";
import { copyText } from "@/lib/cloud/clipboard";
import { DEMO_ACCOUNT, DESTINATION_BY_ID } from "@/lib/cloud/destinations";
import { plainSummary, toMarkdownTable, toTSV } from "@/lib/cloud/templates";
import type { DestinationId, ExportArtifact, ShareLink, TemplateParams } from "@/lib/cloud/types";
import { formatBytes } from "@/lib/cloud/format";
import { Button, inputClass } from "../ui";
import { DestinationTile, SimulatedBadge, Toggle } from "./bits";
import { QRCode, qrIsDense } from "./QRCode";
import { SlideOver } from "./SlideOver";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SPREADSHEETS = ["Spendwise Expenses", "Household Budget 2026", "Taxes — Receipts"];
const NOTION_PAGES = ["Finance / Expense Reports", "Home / Monthly Budget", "Personal / Taxes"];

interface Props {
  destination: DestinationId;
  artifact: ExportArtifact;
  params: TemplateParams;
  onClose: () => void;
  onAutomate: (destination: DestinationId, target?: string) => void;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="grid rounded-lg bg-slate-100 p-0.5 text-sm font-medium" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }} role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1.5 transition ${value === o.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ArtifactCard({ artifact }: { artifact: ExportArtifact }) {
  const [open, setOpen] = useState(false);
  const preview = useMemo(() => artifact.content.replace(/^﻿/, "").split(/\r?\n/).slice(0, 18).join("\n"), [artifact.content]);
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
      <div className="flex items-center gap-3 bg-slate-50 px-4 py-3">
        <FileText className="h-8 w-8 shrink-0 text-slate-400" strokeWidth={1.5} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-sm font-medium text-slate-900">{artifact.filename}</p>
          <p className="text-xs text-slate-500">
            {artifact.scopeLabel} · {artifact.recordCount} records · {formatBytes(artifact.bytes)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
          aria-expanded={open}
        >
          Preview <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} aria-hidden />
        </button>
      </div>
      {open && <pre className="max-h-56 overflow-auto bg-slate-900 p-3 font-mono text-[11px] leading-relaxed text-slate-100">{preview}</pre>}
    </div>
  );
}

export function DeliverPanel({ destination, artifact, params, onClose, onAutomate }: Props) {
  const def = DESTINATION_BY_ID[destination];
  const cloud = useCloud();
  const { toast } = useToast();

  // Email
  const [recipients, setRecipients] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [subject, setSubject] = useState(`${artifact.title} — ${artifact.scopeLabel}`);
  const [message, setMessage] = useState("Hi,\n\nHere's my latest expense export from Spendwise.\n\nThanks!");
  const [delivery, setDelivery] = useState<"attachment" | "link">("attachment");
  const [ccMe, setCcMe] = useState(true);

  // Share link
  const [includeItems, setIncludeItems] = useState(artifact.recordCount <= 150);
  const [expiry, setExpiry] = useState<string>("7");
  const [password, setPassword] = useState("");
  const [sharedBy, setSharedBy] = useState("");
  const [note, setNote] = useState("");
  const [link, setLink] = useState<ShareLink | null>(null);
  const [busy, setBusy] = useState(false);

  // Cloud storage / Sheets / Notion
  const [folder, setFolder] = useState(def.defaultTarget ?? "");
  const [conflict, setConflict] = useState<"keep" | "replace">("keep");
  const [sheetMode, setSheetMode] = useState<"new" | "existing">("new");
  const [spreadsheet, setSpreadsheet] = useState(SPREADSHEETS[0]);
  const [newSheetName, setNewSheetName] = useState(`${artifact.title} — ${artifact.scopeLabel}`);
  const [tab, setTab] = useState("Expenses");
  const [liveSync, setLiveSync] = useState(false);
  const [notionPage, setNotionPage] = useState(NOTION_PAGES[0]);
  const [notionMode, setNotionMode] = useState<"page" | "database">("page");

  const connected = !def.requiresConnection || !!cloud.integrations[destination]?.connected;

  const addRecipient = (raw = draft) => {
    const parts = raw.split(/[,\s;]+/).map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return true;
    const bad = parts.find((p) => !EMAIL_RE.test(p));
    if (bad) {
      setDraftError(`“${bad}” isn't a valid email address`);
      return false;
    }
    setRecipients((r) => Array.from(new Set([...r, ...parts])));
    setDraft("");
    setDraftError(null);
    return true;
  };

  const onRecipientKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (["Enter", ",", " ", "Tab"].includes(e.key) && draft.trim()) {
      if (e.key !== "Tab") e.preventDefault();
      addRecipient();
    } else if (e.key === "Backspace" && !draft && recipients.length) {
      setRecipients((r) => r.slice(0, -1));
    }
  };

  const copy = async (text: string, what: string) => toast((await copyText(text)) ? `${what} copied to clipboard` : "Couldn't access the clipboard", "info");

  const target = (() => {
    switch (destination) {
      case "email":
        return recipients.join(", ");
      case "google-sheets":
        return `${sheetMode === "new" ? newSheetName : spreadsheet} › ${tab}`;
      case "notion":
        return notionPage;
      case "google-drive":
      case "dropbox":
      case "onedrive":
        return `${folder.replace(/\/$/, "")}/${artifact.filename}`;
      default:
        return undefined;
    }
  })();

  const submit = async () => {
    if (destination === "share-link") {
      setBusy(true);
      try {
        setLink(await cloud.createShare(artifact, params, { includeItems, expiresInDays: expiry === "never" ? null : Number(expiry), password, sharedBy, note }));
      } catch (err) {
        console.error(err);
        toast("Couldn't create the link — your browser may not support it", "error");
      } finally {
        setBusy(false);
      }
      return;
    }
    if (destination === "email") {
      if (draft.trim() && !addRecipient()) return;
      const all = Array.from(new Set([...recipients, ...draft.split(/[,\s;]+/).filter((p) => EMAIL_RE.test(p))]));
      if (!all.length) {
        setDraftError("Add at least one recipient");
        return;
      }
      if (delivery === "link") {
        await cloud.createShare(artifact, params, { includeItems: true, expiresInDays: 30 });
      }
      void cloud.deliver({ artifact, destination, params, target: all.join(", ") });
      onClose();
      return;
    }
    if (destination === "google-sheets" && liveSync) {
      cloud.setLiveSync({ spreadsheet: sheetMode === "new" ? newSheetName : spreadsheet, sheet: tab });
    }
    void cloud.deliver({ artifact, destination, params, target });
    onClose();
  };

  const openMailApp = () => {
    const body = `${message}\n\n${plainSummary(artifact)}\n\n(Exported with Spendwise — attach ${artifact.filename} after downloading it.)`;
    window.location.href = `mailto:${recipients.join(",")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const primaryLabel: Record<DestinationId, string> = {
    download: "Download",
    "share-link": "Create link",
    email: "Send email",
    "google-sheets": sheetMode === "new" ? "Create spreadsheet" : "Sync to sheet",
    "google-drive": "Upload to Drive",
    dropbox: "Upload to Dropbox",
    onedrive: "Upload to OneDrive",
    notion: "Publish to Notion",
  };

  const footer = link ? (
    <div className="flex justify-end">
      <Button onClick={onClose}>Done</Button>
    </div>
  ) : (
    <div className="flex items-center justify-between gap-2">
      {def.schedulable ? (
        <Button variant="ghost" onClick={() => onAutomate(destination, destination === "email" ? recipients.join(", ") : target)} icon={<CalendarClock className="h-4 w-4" aria-hidden />}>
          Automate
        </Button>
      ) : (
        <span />
      )}
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={!connected || artifact.recordCount === 0} loading={busy}>
          {primaryLabel[destination]}
        </Button>
      </div>
    </div>
  );

  return (
    <SlideOver
      open
      onClose={onClose}
      title={link ? "Your link is ready" : def.name}
      subtitle={link ? "Anyone with the link can view this report" : def.description}
      icon={<DestinationTile id={destination} />}
      footer={footer}
    >
      {link ? (
        <ShareResult link={link} onCopy={copy} />
      ) : (
        <div className="space-y-6">
          <ArtifactCard artifact={artifact} />
          {artifact.recordCount === 0 && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-600/20">This template has no expenses for the selected period.</p>
          )}

          {def.simulated && (
            <div className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-600 ring-1 ring-slate-200">
              <SimulatedBadge className="mt-px" />
              <span>Delivery is simulated in this demo. Your data stays in this browser; history and status update as if it were sent.</span>
            </div>
          )}

          {destination === "download" && (
            <p className="text-sm text-slate-600">The file is generated in your browser and saved straight to this device.</p>
          )}

          {destination === "email" && (
            <>
              <Field label="To">
                <div className={`flex flex-wrap items-center gap-1.5 rounded-lg bg-white px-2 py-1.5 shadow-sm ring-1 ring-inset ${draftError ? "ring-red-400" : "ring-slate-300"} focus-within:ring-2 focus-within:ring-brand-600`}>
                  {recipients.map((r) => (
                    <span key={r} className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                      {r}
                      <button type="button" onClick={() => setRecipients((rs) => rs.filter((x) => x !== r))} aria-label={`Remove ${r}`} className="text-brand-400 hover:text-brand-700">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="email"
                    value={draft}
                    onChange={(e) => {
                      setDraft(e.target.value);
                      setDraftError(null);
                    }}
                    onKeyDown={onRecipientKey}
                    onBlur={() => draft.trim() && addRecipient()}
                    placeholder={recipients.length ? "" : "accountant@example.com"}
                    className="min-w-[10rem] flex-1 border-0 p-1 text-sm focus:ring-0"
                    aria-label="Recipient email"
                  />
                </div>
                {draftError && <span className="mt-1 block text-xs font-medium text-red-600">{draftError}</span>}
              </Field>
              <Field label="Subject">
                <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Message">
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className={inputClass} />
              </Field>
              <div className="space-y-3">
                <Segmented
                  value={delivery}
                  onChange={setDelivery}
                  options={[
                    { value: "attachment", label: "Attach file" },
                    { value: "link", label: "Send secure link" },
                  ]}
                />
                <label className="flex items-center justify-between text-sm text-slate-700">
                  Send me a copy ({DEMO_ACCOUNT})
                  <Toggle checked={ccMe} onChange={setCcMe} label="Send me a copy" />
                </label>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 text-xs ring-1 ring-slate-200">
                <p className="font-semibold uppercase tracking-wide text-slate-400">Preview</p>
                <p className="mt-2 text-slate-500">
                  From <span className="text-slate-800">Spendwise &lt;reports@spendwise.app&gt;</span>
                </p>
                <p className="mt-1 font-semibold text-slate-900">{subject || "(no subject)"}</p>
                <p className="mt-2 whitespace-pre-line text-slate-700">{message}</p>
                <pre className="mt-2 whitespace-pre-wrap font-sans text-slate-600">{plainSummary(artifact)}</pre>
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-white px-2 py-1 font-medium text-slate-700 ring-1 ring-slate-200">
                  {delivery === "attachment" ? <Paperclip className="h-3 w-3" aria-hidden /> : <Link2 className="h-3 w-3" aria-hidden />}
                  {delivery === "attachment" ? `${artifact.filename} · ${formatBytes(artifact.bytes)}` : "View report (link expires in 30 days)"}
                </p>
              </div>
              <button type="button" onClick={openMailApp} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700">
                <Mail className="h-4 w-4" aria-hidden /> Open in my mail app instead
              </button>
            </>
          )}

          {destination === "share-link" && (
            <>
              <label className="flex items-start justify-between gap-4">
                <span>
                  <span className="block text-sm font-medium text-slate-700">Include line items</span>
                  <span className="block text-xs text-slate-500">Off shares totals and category breakdown only — a shorter link and an easy-to-scan QR code.</span>
                </span>
                <Toggle checked={includeItems} onChange={setIncludeItems} label="Include line items" />
              </label>
              <Field label="Link expires">
                <select value={expiry} onChange={(e) => setExpiry(e.target.value)} className={inputClass}>
                  <option value="1">In 24 hours</option>
                  <option value="7">In 7 days</option>
                  <option value="30">In 30 days</option>
                  <option value="never">Never</option>
                </select>
              </Field>
              <Field label="Password (optional)" hint="Encrypts the report with AES-256. Share the password separately.">
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                  <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="No password" autoComplete="off" className={`${inputClass} pl-9`} />
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Shared by">
                  <input value={sharedBy} onChange={(e) => setSharedBy(e.target.value)} placeholder="Your name" maxLength={40} className={inputClass} />
                </Field>
                <Field label="Note">
                  <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="For our Q3 review" maxLength={140} className={inputClass} />
                </Field>
              </div>
              <p className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800 ring-1 ring-emerald-600/20">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                Zero-knowledge link: the report is compressed into the part of the URL after “#”, which browsers never send to a server.
              </p>
            </>
          )}

          {destination !== "download" && destination !== "email" && destination !== "share-link" && !connected && (
            <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center">
              <p className="text-sm font-medium text-slate-800">{def.name} isn&apos;t connected</p>
              <p className="mt-1 text-xs text-slate-500">Connect it from the Integrations tab to continue.</p>
            </div>
          )}

          {destination === "google-sheets" && connected && (
            <>
              <Segmented value={sheetMode} onChange={setSheetMode} options={[{ value: "new", label: "New spreadsheet" }, { value: "existing", label: "Existing" }]} />
              {sheetMode === "new" ? (
                <Field label="Spreadsheet name">
                  <input value={newSheetName} onChange={(e) => setNewSheetName(e.target.value)} className={inputClass} />
                </Field>
              ) : (
                <Field label="Spreadsheet">
                  <select value={spreadsheet} onChange={(e) => setSpreadsheet(e.target.value)} className={inputClass}>
                    {SPREADSHEETS.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="Sheet tab">
                <input value={tab} onChange={(e) => setTab(e.target.value)} className={inputClass} />
              </Field>
              <label className="flex items-start justify-between gap-4 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <span>
                  <span className="block text-sm font-medium text-slate-800">Keep in sync</span>
                  <span className="block text-xs text-slate-500">Push every new or edited expense to this sheet automatically.</span>
                </span>
                <Toggle checked={liveSync} onChange={setLiveSync} label="Keep in sync" />
              </label>
              <button type="button" onClick={() => copy(toTSV(artifact.rows), "Table")} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700">
                <ClipboardCopy className="h-4 w-4" aria-hidden /> Copy as table to paste into any spreadsheet
              </button>
            </>
          )}

          {(destination === "google-drive" || destination === "dropbox" || destination === "onedrive") && connected && (
            <>
              <Field label="Folder">
                <div className="relative">
                  <Folder className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                  <input value={folder} onChange={(e) => setFolder(e.target.value)} className={`${inputClass} pl-9 font-mono`} />
                </div>
              </Field>
              <Field label="If a file with this name exists">
                <Segmented value={conflict} onChange={setConflict} options={[{ value: "keep", label: "Keep both" }, { value: "replace", label: "Replace" }]} />
              </Field>
              <p className="truncate rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600 ring-1 ring-slate-200">{target}</p>
            </>
          )}

          {destination === "notion" && connected && (
            <>
              <Field label="Add to">
                <select value={notionPage} onChange={(e) => setNotionPage(e.target.value)} className={inputClass}>
                  {NOTION_PAGES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </Field>
              <Segmented value={notionMode} onChange={setNotionMode} options={[{ value: "page", label: "As a page" }, { value: "database", label: "As database rows" }]} />
              <button
                type="button"
                onClick={() => copy(artifact.templateId === "monthly-summary" ? artifact.content : toMarkdownTable(artifact.rows), "Markdown")}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                <ClipboardCopy className="h-4 w-4" aria-hidden /> Copy as Markdown to paste into Notion
              </button>
            </>
          )}
        </div>
      )}
    </SlideOver>
  );
}

function ShareResult({ link, onCopy }: { link: ShareLink; onCopy: (text: string, what: string) => void }) {
  const [showQR, setShowQR] = useState(!qrIsDense(link.url));
  const canNativeShare = typeof navigator !== "undefined" && "share" in navigator;
  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <input readOnly value={link.url} onFocus={(e) => e.currentTarget.select()} className={`${inputClass} font-mono text-xs`} aria-label="Share link" />
        <Button onClick={() => onCopy(link.url, "Link")} icon={<Copy className="h-4 w-4" aria-hidden />}>
          Copy
        </Button>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {link.protected && <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 ring-1 ring-emerald-600/20">Password protected</span>}
        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
          {link.expiresAt ? `Expires ${new Date(link.expiresAt).toLocaleDateString("en-US", { dateStyle: "medium" })}` : "Never expires"}
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">{link.includesItems ? `${link.recordCount} line items` : "Summary only"}</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">{link.url.length.toLocaleString()} characters</span>
      </div>

      <div className="flex flex-col items-center rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
        {showQR ? (
          <>
            <QRCode value={link.url} />
            <p className="mt-3 text-xs text-slate-500">Scan to open on a phone</p>
          </>
        ) : (
          <div className="text-center">
            <QrCode className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
            <p className="mt-2 text-sm text-slate-600">This link carries {link.recordCount} line items — its QR code will be dense.</p>
            <button type="button" onClick={() => setShowQR(true)} className="mt-2 text-sm font-medium text-brand-600 hover:text-brand-700">
              Show anyway
            </button>
            <p className="mt-1 text-xs text-slate-400">Tip: a summary-only link makes an easy-to-scan code.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
          <ExternalLink className="h-4 w-4" aria-hidden /> Open preview
        </a>
        <Button
          variant="secondary"
          disabled={!canNativeShare}
          onClick={() => navigator.share?.({ title: link.title, url: link.url }).catch(() => {})}
          icon={<Share2 className="h-4 w-4" aria-hidden />}
          title={canNativeShare ? undefined : "Not supported in this browser"}
        >
          Share…
        </Button>
      </div>
      <p className="text-xs text-slate-500">
        Links are self-contained, so they keep working even if you clear this app — use an expiry and password for anything sensitive.
      </p>
    </div>
  );
}
