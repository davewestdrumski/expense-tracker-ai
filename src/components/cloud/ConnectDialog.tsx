"use client";

import { useEffect, useState } from "react";
import { ArrowLeftRight, Check, Loader2, Lock, ShieldCheck, Wallet } from "lucide-react";
import { useCloud } from "@/context/CloudContext";
import { DEMO_ACCOUNT, DESTINATION_BY_ID } from "@/lib/cloud/destinations";
import type { DestinationId } from "@/lib/cloud/types";
import { Modal } from "../Modal";
import { Button } from "../ui";
import { DestinationTile, SimulatedBadge } from "./bits";

const SCOPES: Partial<Record<DestinationId, string[]>> = {
  "google-sheets": ["Create spreadsheets in your Google Drive", "Edit spreadsheets created by Spendwise"],
  "google-drive": ["Upload files to a Spendwise folder", "See files created by Spendwise"],
  dropbox: ["Write to the Apps/Spendwise folder only"],
  onedrive: ["Create and update files in Documents/Spendwise"],
  notion: ["Create pages in workspaces you select", "Insert content into those pages"],
};

type Step = "consent" | "authorizing" | "done";

/** Simulated OAuth hand-off, modelled on real consent screens. */
export function ConnectDialog({ id, onClose, onConnected }: { id: DestinationId; onClose: () => void; onConnected?: () => void }) {
  const { connect } = useCloud();
  const def = DESTINATION_BY_ID[id];
  const [step, setStep] = useState<Step>("consent");

  useEffect(() => {
    if (step !== "authorizing") return;
    const t = setTimeout(() => {
      connect(id);
      setStep("done");
    }, 1600);
    return () => clearTimeout(t);
  }, [step, connect, id]);

  return (
    <Modal open onClose={onClose} title={`Connect ${def.name}`} size="sm">
      {step === "consent" && (
        <div>
          <div className="flex items-center justify-center gap-3 py-2">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
              <Wallet className="h-7 w-7" aria-hidden />
            </span>
            <ArrowLeftRight className="h-5 w-5 text-slate-300" aria-hidden />
            <DestinationTile id={id} size="lg" />
          </div>
          <p className="mt-4 text-center text-sm text-slate-600">
            <span className="font-semibold text-slate-900">Spendwise</span> wants to access your {def.name} account
          </p>
          <p className="mt-1 text-center text-xs text-slate-500">{DEMO_ACCOUNT}</p>
          <ul className="mt-5 space-y-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-200">
            {(SCOPES[id] ?? ["Upload exported files"]).map((s) => (
              <li key={s} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                {s}
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-start gap-2 text-xs text-slate-500">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Spendwise never sees your password. You can revoke access at any time.
          </p>
          <div className="mt-4 flex items-center justify-between">
            <SimulatedBadge />
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={() => setStep("authorizing")} data-autofocus>
                Allow
              </Button>
            </div>
          </div>
        </div>
      )}
      {step === "authorizing" && (
        <div className="flex flex-col items-center py-10 text-center" aria-live="polite">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" aria-hidden />
          <p className="mt-4 text-sm font-medium text-slate-800">Completing secure handshake…</p>
          <p className="mt-1 text-xs text-slate-500">Exchanging authorization code for an access token</p>
        </div>
      )}
      {step === "done" && (
        <div className="flex flex-col items-center py-6 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <ShieldCheck className="h-7 w-7 text-emerald-600" aria-hidden />
          </span>
          <p className="mt-4 text-base font-semibold text-slate-900">{def.name} connected</p>
          <p className="mt-1 text-sm text-slate-500">Signed in as {DEMO_ACCOUNT}</p>
          <Button
            className="mt-6"
            onClick={() => {
              onConnected?.();
              onClose();
            }}
          >
            Continue
          </Button>
        </div>
      )}
    </Modal>
  );
}
