"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Clock, Download, KeyRound, Link2Off, Loader2, Lock, Search, ShieldCheck, Wallet } from "lucide-react";
import { CATEGORY_META } from "@/lib/categories";
import { formatCurrency, formatDate } from "@/lib/format";
import { decodeShare, isProtectedToken, ShareError } from "@/lib/cloud/share";
import type { SharePayload } from "@/lib/cloud/types";

type View =
  | { state: "loading" }
  | { state: "password"; error?: string; checking?: boolean }
  | { state: "error"; title: string; message: string }
  | { state: "expired"; payload: SharePayload }
  | { state: "ready"; payload: SharePayload };

function csvCell(v: string | number) {
  if (typeof v === "number") return v.toFixed(2);
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export default function SharedReportPage() {
  const [view, setView] = useState<View>({ state: "loading" });
  const [password, setPassword] = useState("");
  const [query, setQuery] = useState("");

  const open = useCallback(async (pw?: string) => {
    const token = window.location.hash.slice(1);
    if (!token) {
      setView({ state: "error", title: "No report in this link", message: "The link looks incomplete. Ask the sender to copy it again." });
      return;
    }
    if (isProtectedToken(token) && !pw) {
      setView({ state: "password" });
      return;
    }
    try {
      const payload = await decodeShare(token, pw);
      const expired = payload.expiresAt !== null && new Date(payload.expiresAt).getTime() < Date.now();
      setView(expired ? { state: "expired", payload } : { state: "ready", payload });
    } catch (err) {
      if (err instanceof ShareError && err.code === "wrong-password") setView({ state: "password", error: "That password didn't work." });
      else if (err instanceof ShareError && err.code === "unsupported")
        setView({ state: "error", title: "Browser not supported", message: "Open this link in a recent version of Chrome, Edge, Firefox or Safari." });
      else setView({ state: "error", title: "This link is broken", message: "Part of the link may be missing. Ask the sender to share it again." });
    }
  }, []);

  useEffect(() => {
    void open();
    const onHash = () => void open();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [open]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setView({ state: "password", checking: true });
    await open(password);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
          <span className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white">
              <Wallet className="h-4 w-4" aria-hidden />
            </span>
            <span className="font-semibold text-slate-900">Spendwise</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Shared report</span>
          </span>
          <span className="hidden items-center gap-1.5 text-xs text-slate-500 sm:flex">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden /> Decoded privately in your browser
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        {view.state === "loading" && (
          <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600" aria-label="Loading" />
          </div>
        )}

        {view.state === "password" && (
          <form onSubmit={submit} className="mx-auto max-w-sm rounded-2xl bg-white p-8 text-center shadow-card ring-1 ring-slate-200">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
              <Lock className="h-6 w-6 text-brand-600" aria-hidden />
            </span>
            <h1 className="mt-4 text-lg font-semibold text-slate-900">This report is protected</h1>
            <p className="mt-1 text-sm text-slate-500">Enter the password the sender gave you.</p>
            <div className="relative mt-5">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-lg border-0 py-2 pl-9 pr-3 text-sm shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600"
                aria-label="Password"
              />
            </div>
            {view.error && <p className="mt-2 text-xs font-medium text-red-600">{view.error}</p>}
            <button
              type="submit"
              disabled={!password || view.checking}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {view.checking && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Unlock report
            </button>
          </form>
        )}

        {view.state === "error" && <Notice icon={<Link2Off className="h-6 w-6 text-slate-500" aria-hidden />} title={view.title} message={view.message} />}

        {view.state === "expired" && (
          <Notice
            icon={<Clock className="h-6 w-6 text-amber-600" aria-hidden />}
            title="This link has expired"
            message={`“${view.payload.title}” stopped being available on ${new Date(view.payload.expiresAt!).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}. Ask the sender for a new link.`}
          />
        )}

        {view.state === "ready" && <Report payload={view.payload} query={query} onQuery={setQuery} />}
      </main>
    </div>
  );
}

function Notice({ icon, title, message }: { icon: React.ReactNode; title: string; message: string }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl bg-white p-8 text-center shadow-card ring-1 ring-slate-200">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">{icon}</span>
      <h1 className="mt-4 text-lg font-semibold text-slate-900">{title}</h1>
      <p className="mt-1 text-sm text-slate-500">{message}</p>
      <Link href="/" className="mt-6 inline-block text-sm font-medium text-brand-600 hover:text-brand-700">
        Track your own expenses with Spendwise →
      </Link>
    </div>
  );
}

function Report({ payload, query, onQuery }: { payload: SharePayload; query: string; onQuery: (q: string) => void }) {
  const { summary, items } = payload;
  const max = summary.byCategory[0]?.total ?? 0;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items ?? []).filter(([, cat, , desc]) => !q || `${desc} ${cat}`.toLowerCase().includes(q));
  }, [items, query]);

  const downloadCsv = () => {
    const lines = ["Date,Category,Description,Amount", ...(items ?? []).map(([d, c, a, desc]) => [d, c, csvCell(desc), a.toFixed(2)].join(","))];
    const url = URL.createObjectURL(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${payload.title.toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <article className="space-y-6">
      <div>
        <p className="text-sm font-medium text-brand-600">{payload.scope}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{payload.title}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {payload.sharedBy ? `Shared by ${payload.sharedBy} · ` : ""}
          {new Date(payload.createdAt).toLocaleDateString("en-US", { dateStyle: "long" })}
          {payload.expiresAt ? ` · Available until ${new Date(payload.expiresAt).toLocaleDateString("en-US", { dateStyle: "medium" })}` : ""}
        </p>
        {payload.note && <p className="mt-4 rounded-xl border-l-4 border-brand-500 bg-white px-4 py-3 text-sm text-slate-700 shadow-card">{payload.note}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Total spent", formatCurrency(summary.total)],
          ["Expenses", summary.count.toLocaleString("en-US")],
          ["Average", formatCurrency(summary.count ? summary.total / summary.count : 0)],
          ["Period", summary.firstDate && summary.lastDate ? `${formatDate(summary.firstDate).replace(/, \d{4}$/, "")} – ${formatDate(summary.lastDate)}` : "—"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-slate-200">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="mt-1 truncate text-lg font-semibold tabular-nums text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-slate-200 sm:p-6">
        <h2 className="text-base font-semibold text-slate-900">By category</h2>
        <ul className="mt-4 space-y-3">
          {summary.byCategory.map((c) => (
            <li key={c.category}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-slate-700">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: CATEGORY_META[c.category].color }} aria-hidden />
                  {c.category} <span className="font-normal text-slate-400">({c.count})</span>
                </span>
                <span className="tabular-nums">
                  <span className="font-semibold text-slate-900">{formatCurrency(c.total)}</span>
                  <span className="ml-2 text-xs text-slate-500">{summary.total ? ((c.total / summary.total) * 100).toFixed(0) : 0}%</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100">
                <div className="h-full rounded-full" style={{ width: `${max ? (c.total / max) * 100 : 0}%`, backgroundColor: CATEGORY_META[c.category].color }} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {items && (
        <section className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-3">
            <h2 className="text-base font-semibold text-slate-900">Line items</h2>
            <div className="relative ml-auto">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => onQuery(e.target.value)}
                placeholder="Search"
                className="w-40 rounded-lg border-0 py-1.5 pl-8 pr-2 text-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-brand-600"
                aria-label="Search line items"
              />
            </div>
            <button type="button" onClick={downloadCsv} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50">
              <Download className="h-4 w-4" aria-hidden /> CSV
            </button>
          </div>
          <div className="max-h-[480px] overflow-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-5 py-2 font-semibold">Date</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Category</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Description</th>
                  <th scope="col" className="px-5 py-2 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(([date, cat, amount, desc], i) => (
                  <tr key={i}>
                    <td className="whitespace-nowrap px-5 py-2 text-slate-500">{formatDate(date)}</td>
                    <td className="px-3 py-2 text-slate-700">{cat}</td>
                    <td className="max-w-[240px] truncate px-3 py-2 text-slate-900">{desc}</td>
                    <td className="px-5 py-2 text-right font-medium tabular-nums text-slate-900">{formatCurrency(amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No matching line items.</p>}
          </div>
        </section>
      )}

      <p className="pt-4 text-center text-xs text-slate-400">
        This report lives entirely inside its link — nothing was uploaded to a server.{" "}
        <Link href="/" className="font-medium text-brand-600 hover:text-brand-700">
          Make your own with Spendwise
        </Link>
      </p>
    </article>
  );
}
