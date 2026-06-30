"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type HeaderUser = {
  email: string;
  name?: string | null;
  isAdmin?: boolean;
} | null;

const workspaceRoutes = ["/dashboard", "/reports", "/profile", "/billing", "/account"];

const navItems = [
  ["Product", "/#product"],
  ["How It Works", "/#how-it-works"],
  ["Pricing", "/pricing"],
  ["Integrations", "/integrations"],
  ["Resources", "/resources"],
  ["Contact", "/contact"],
];

function isWorkspacePath(pathname: string) {
  return workspaceRoutes.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function AccountMenu({ user, onNavigate }: { user: HeaderUser; onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login" onClick={onNavigate} className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-slate-950">
          Log in
        </Link>
        <Link href="/signup" onClick={onNavigate} className="hidden min-h-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800 transition hover:border-slate-950 sm:inline-flex">
          Sign up
        </Link>
      </div>
    );
  }

  const displayName = user.name || user.email.split("@")[0];

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-left text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-300"
      >
        <span className="grid size-7 place-items-center rounded-full bg-slate-950 text-[10px] font-black text-white">QC</span>
        <span className="hidden max-w-28 truncate sm:block">{displayName}</span>
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-3 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/15">
          <div className="border-b border-slate-100 p-4">
            <p className="text-sm font-semibold text-slate-950">{displayName}</p>
            <p className="mt-1 truncate text-xs font-medium text-slate-500">{user.email}</p>
            {user.isAdmin ? <p className="mt-2 inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-800">Admin</p> : null}
          </div>
          <div className="grid p-2 text-sm font-semibold text-slate-700">
            {[
              ["Account", "/account"],
              ["Dashboard", "/dashboard"],
              ["Profile", "/profile"],
              ["Billing", "/billing"],
              ["Support", "/contact"],
            ].map(([label, href]) => (
              <Link key={label} href={href} onClick={() => { setOpen(false); onNavigate?.(); }} className="rounded-xl px-3 py-2.5 hover:bg-slate-50">
                {label}
              </Link>
            ))}
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="w-full rounded-xl px-3 py-2.5 text-left font-semibold text-slate-700 hover:bg-slate-50">
                Logout
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function Header({ user = null }: { user?: HeaderUser }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const isHomePage = pathname === "/";

  if (isWorkspacePath(pathname)) return null;

  return (
    <header className={`${isHomePage ? "marketing-header-light " : ""}sticky top-0 z-50 border-b border-slate-900/5 bg-white/88 backdrop-blur-xl`}>
      <div className="mx-auto flex min-h-18 w-full max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="QueryCite home">
          <span className="grid size-10 place-items-center rounded-2xl bg-slate-950 text-sm font-black text-white shadow-lg shadow-slate-950/12">QC</span>
          <span>
            <span className="block text-lg font-semibold tracking-normal text-slate-950">QueryCite</span>
            <span className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:block">AI visibility audit</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-5 lg:flex" aria-label="Main navigation">
          {navItems.map(([label, href]) => (
            <Link key={label} href={href} className="text-sm font-semibold text-slate-600 transition hover:text-slate-950">
              {label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <AccountMenu user={user} />
          <Link href="/#audit" className="inline-flex min-h-11 items-center rounded-full bg-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700">
            Scan your website free
          </Link>
        </div>

        <button
          type="button"
          aria-expanded={isOpen}
          aria-label="Toggle navigation menu"
          onClick={() => setIsOpen((value) => !value)}
          className="grid size-11 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-sm lg:hidden"
        >
          <span className="grid gap-1.5" aria-hidden="true">
            <span className={`block h-0.5 w-5 rounded-full bg-slate-950 transition ${isOpen ? "translate-y-2 rotate-45" : ""}`} />
            <span className={`block h-0.5 w-5 rounded-full bg-slate-950 transition ${isOpen ? "opacity-0" : ""}`} />
            <span className={`block h-0.5 w-5 rounded-full bg-slate-950 transition ${isOpen ? "-translate-y-2 -rotate-45" : ""}`} />
          </span>
        </button>
      </div>

      {isOpen ? (
        <div className="border-t border-slate-100 bg-white px-5 py-4 shadow-xl lg:hidden">
          <nav className="grid gap-2" aria-label="Mobile navigation">
            {navItems.map(([label, href]) => (
              <Link key={label} href={href} onClick={() => setIsOpen(false)} className="rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                {label}
              </Link>
            ))}
            <div className="mt-2 rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <AccountMenu user={user} onNavigate={() => setIsOpen(false)} />
            </div>
            <Link href="/#audit" onClick={() => setIsOpen(false)} className="mt-2 inline-flex min-h-12 items-center justify-center rounded-full bg-blue-600 px-5 text-sm font-semibold text-white">
              Scan your website free
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
