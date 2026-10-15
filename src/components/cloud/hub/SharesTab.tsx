"use client";

import { useState } from "react";
import { Copy, ExternalLink, Link2, Lock, QrCode, Trash2 } from "lucide-react";
import { useCloud } from "@/context/CloudContext";
import { useToast } from "@/context/ToastContext";
import { copyText } from "@/lib/cloud/clipboard";
import { relativeTime } from "@/lib/cloud/schedule";
import type { ShareLink } from "@/lib/cloud/types";
import { Modal } from "../../Modal";
import { Card } from "../../ui";
import { QRCode } from "../QRCode";

export function SharesTab() {
  const { shares, removeShare } = useCloud();
  const { toast } = useToast();
  const [qr, setQr] = useState<ShareLink | null>(null);
  const now = Date.now();

  if (shares.length === 0) {
    return (
      <Card className="flex flex-col items-center px-6 py-16 text-center">
        <Link2 className="h-10 w-10 text-slate-300" aria-hidden />
        <p className="mt-3 text-sm font-medium text-slate-900">No shared links</p>
        <p className="mt-1 max-w-sm text-sm text-slate-500">Pick a template on the Export tab and choose “Share link” to create a private, expiring link with a QR code.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <ul className="divide-y divide-slate-100">
          {shares.map((l) => {
            const expired = l.expiresAt !== null && new Date(l.expiresAt).getTime() < now;
            return (
              <li key={l.id} className={`flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5 ${expired ? "opacity-60" : ""}`}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  {l.protected ? <Lock className="h-5 w-5" aria-hidden /> : <Link2 className="h-5 w-5" aria-hidden />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{l.title}</p>
                  <p className="text-xs text-slate-500">
                    Created {relativeTime(l.createdAt)} · {l.includesItems ? `${l.recordCount} line items` : "Summary only"} ·{" "}
                    {expired ? (
                      <span className="font-medium text-red-600">Expired</span>
                    ) : l.expiresAt ? (
                      `Expires ${relativeTime(l.expiresAt)}`
                    ) : (
                      "No expiry"
                    )}
                    {l.protected && " · Password"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={async () => toast((await copyText(l.url)) ? "Link copied" : "Couldn't access the clipboard", "info")} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Copy link" title="Copy link">
                    <Copy className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => setQr(l)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Show QR code" title="QR code">
                    <QrCode className="h-4 w-4" />
                  </button>
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Open link" title="Open">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button type="button" onClick={() => removeShare(l.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove from list" title="Remove from list">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
      <p className="text-xs text-slate-500">
        Share links carry their data inside the URL, so there&apos;s no server copy to delete. Removing a link here clears it from your list; copies already sent keep working until they expire.
      </p>
      {qr && (
        <Modal open onClose={() => setQr(null)} title="Scan to open" description={qr.title} size="sm">
          <div className="flex justify-center">
            <QRCode value={qr.url} size={240} />
          </div>
        </Modal>
      )}
    </div>
  );
}
