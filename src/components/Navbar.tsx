"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CloudUpload, LayoutDashboard, ListOrdered, Plus, Wallet } from "lucide-react";
import { useExpenseActions } from "./Providers";
import { Button } from "./ui";
import { SyncStatusPill } from "./cloud/SyncStatusPill";

const LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/expenses", label: "Expenses", icon: ListOrdered },
  { href: "/exports", label: "Export Hub", icon: CloudUpload },
];

export function Navbar() {
  const pathname = usePathname();
  const { openCreate } = useExpenseActions();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
              <Wallet className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-base font-semibold tracking-tight text-slate-900">Spendwise</span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
            {LINKS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <SyncStatusPill />
            <Button onClick={openCreate} icon={<Plus className="h-4 w-4" aria-hidden />} className="hidden sm:inline-flex">
              Add expense
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      >
        <div className="grid grid-cols-4">
          {LINKS.slice(0, 2).map(({ href, label, icon: Icon }) => (
            <MobileLink key={href} href={href} label={label} Icon={Icon} active={pathname === href} />
          ))}
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={openCreate}
              className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/30 transition active:scale-95"
              aria-label="Add expense"
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>
          {LINKS.slice(2).map(({ href, label, icon: Icon }) => (
            <MobileLink key={href} href={href} label={label} Icon={Icon} active={pathname === href} />
          ))}
        </div>
      </nav>
    </>
  );
}

function MobileLink({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: typeof Wallet;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${active ? "text-brand-600" : "text-slate-500"}`}
    >
      <Icon className="h-5 w-5" aria-hidden />
      {label}
    </Link>
  );
}
