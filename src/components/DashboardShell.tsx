"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";

type DashboardUser = {
  email: string;
  name?: string | null;
  isAdmin?: boolean;
};

type NavItem = {
  label: string;
  href: string;
};

const primaryItems: NavItem[] = [
  { label: "Overview", href: "/dashboard" },
  { label: "Reports", href: "/reports" },
  { label: "AI Advisor", href: "/dashboard#adviser" },
  { label: "Competitors", href: "/profile#competitors" },
  { label: "Profile", href: "/profile" },
  { label: "Billing", href: "/billing" },
  { label: "Settings", href: "/profile#preferences" },
  { label: "Support", href: "/contact" },
];

const lowerItems: NavItem[] = [
  { label: "Usage", href: "/billing#usage" },
  { label: "Docs / Help", href: "/resources" },
];

function NavGlyph({ active }: { active: boolean }) {
  return (
    <span className={`relative grid size-7 shrink-0 place-items-center rounded-lg border ${active ? "border-violet-300 bg-violet-100" : "border-white/10 bg-white/5"}`} aria-hidden="true">
      <span className={`size-2 rounded-full ${active ? "bg-violet-600" : "bg-slate-400"}`} />
    </span>
  );
}

function navIsActive(pathname: string, href: string) {
  const path = href.split("#")[0];
  if (path === "/dashboard") return pathname === "/dashboard";
  return pathname === path || pathname.startsWith(`${path}/`);
}

function SidebarLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <>
      <div className="grid gap-1">
        {primaryItems.map((item) => {
          const active = navIsActive(pathname, item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              className={`flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${active ? "bg-white text-slate-950 shadow-sm" : "text-slate-300 hover:bg-white/8 hover:text-white"}`}
            >
              <NavGlyph active={active} />
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className="mt-6 border-t border-white/10 pt-5">
        <div className="grid gap-1">
          {lowerItems.map((item) => {
            const active = navIsActive(pathname, item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onNavigate}
                className={`flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${active ? "bg-white text-slate-950 shadow-sm" : "text-slate-300 hover:bg-white/8 hover:text-white"}`}
              >
                <NavGlyph active={active} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

function AccountMenu({ user }: { user: DashboardUser }) {
  const [open, setOpen] = useState(false);
  const displayName = user.name || user.email.split("@")[0];

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-11 items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-left shadow-sm transition hover:border-slate-300"
      >
        <span className="grid size-8 place-items-center rounded-full bg-slate-950 text-xs font-semibold text-white">QC</span>
        <span className="hidden leading-tight sm:block">
          <span className="block text-sm font-semibold text-slate-950">{displayName}</span>
          <span className="block max-w-48 truncate text-xs font-medium text-slate-500">{user.email}</span>
        </span>
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-3 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/15">
          <div className="border-b border-slate-100 p-4">
            <p className="text-sm font-semibold text-slate-950">{displayName}</p>
            <p className="mt-1 truncate text-xs font-medium text-slate-500">{user.email}</p>
            {user.isAdmin ? <p className="mt-2 inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-800">Admin QA</p> : null}
          </div>
          <div className="grid p-2 text-sm font-semibold text-slate-700">
            {[
              ["Account", "/account"],
              ["Dashboard", "/dashboard"],
              ["Profile", "/profile"],
              ["Billing", "/billing"],
              ["Support", "/contact"],
            ].map(([label, href]) => (
              <Link key={label} href={href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 hover:bg-slate-50">
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

export function DashboardShell({ user, title, description, children, badge }: { user: DashboardUser; title: string; description: string; children: ReactNode; badge?: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <main className="bg-slate-100/70 px-3 py-4 sm:px-5 sm:py-6">
      <div className="mx-auto grid max-w-[1500px] gap-5 lg:grid-cols-[280px_1fr]">
        <aside className="hidden min-h-[calc(100vh-8rem)] rounded-[1.35rem] border border-slate-900/80 bg-slate-950 p-4 text-white shadow-2xl shadow-slate-950/16 lg:sticky lg:top-24 lg:block">
          <Link href="/dashboard" className="flex items-center gap-3 px-2 py-2" aria-label="QueryCite dashboard">
            <span className="grid size-10 place-items-center rounded-2xl bg-white text-sm font-black text-slate-950">QC</span>
            <span>
              <span className="block text-base font-semibold">QueryCite</span>
              <span className="block text-xs font-medium text-slate-400">AI visibility workspace</span>
            </span>
          </Link>
          <div className="mt-6">
            <SidebarLinks pathname={pathname} />
          </div>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Access</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-white">Free reports stay available. Full Advisor tools require verified access.</p>
          </div>
          <form action="/api/auth/logout" method="post" className="mt-5">
            <button type="submit" className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-300 transition hover:bg-white/8 hover:text-white">
              <NavGlyph active={false} />
              Logout
            </button>
          </form>
        </aside>

        <section className="min-w-0">
          <div className="mb-5 rounded-[1.15rem] border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <button type="button" onClick={() => setMobileOpen(true)} className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-950 lg:hidden" aria-label="Open workspace navigation">
                  <span className="grid gap-1.5" aria-hidden="true"><span className="h-0.5 w-5 rounded-full bg-slate-950" /><span className="h-0.5 w-5 rounded-full bg-slate-950" /><span className="h-0.5 w-5 rounded-full bg-slate-950" /></span>
                </button>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-xl font-semibold text-slate-950 sm:text-2xl">{title}</h1>
                    {badge || null}
                  </div>
                  <p className="mt-1 hidden max-w-3xl text-sm leading-6 text-slate-600 sm:block">{description}</p>
                </div>
              </div>
              <AccountMenu user={user} />
            </div>
          </div>

          {mobileOpen ? (
            <div className="fixed inset-0 z-50 bg-slate-950/50 p-4 backdrop-blur-sm lg:hidden">
              <div className="h-full max-w-sm rounded-[1.35rem] border border-slate-900 bg-slate-950 p-4 text-white shadow-2xl">
                <div className="flex items-center justify-between gap-3">
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-2xl bg-white text-sm font-black text-slate-950">QC</span>
                    <span className="font-semibold">QueryCite</span>
                  </Link>
                  <button type="button" onClick={() => setMobileOpen(false)} className="grid size-10 place-items-center rounded-xl border border-white/10 text-sm font-semibold text-white" aria-label="Close workspace navigation">Close</button>
                </div>
                <div className="mt-6"><SidebarLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} /></div>
              </div>
            </div>
          ) : null}

          <div className="grid gap-6">{children}</div>
        </section>
      </div>
    </main>
  );
}

export function WorkspaceSection({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`grid gap-5 ${className}`}>{children}</section>;
}

export function WorkspaceHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-slate-950 sm:text-3xl">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
