"use client";

import Link from "next/link";
import { useState } from "react";

const navItems = [
  ["Product", "/#product"],
  ["How It Works", "/#how-it-works"],
  ["Use Cases", "/use-cases"],
  ["Pricing", "/pricing"],
  ["Resources", "/resources"],
  ["Integrations", "/integrations"],
  ["Contact", "/contact"],
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-900/5 bg-white/86 backdrop-blur-xl">
      <div className="mx-auto flex h-18 w-full max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="QueryCite home">
          <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-slate-950 via-violet-700 to-teal-500 text-sm font-black text-white shadow-lg shadow-violet-900/15">QC</span>
          <span className="text-lg font-semibold tracking-normal text-slate-950">QueryCite</span>
        </Link>

        <nav className="hidden items-center gap-4 xl:gap-5 lg:flex" aria-label="Main navigation">
          {navItems.map(([label, href]) => (
            <Link key={label} href={href} className="text-[13px] font-semibold text-slate-600 transition hover:text-slate-950 xl:text-sm">
              {label}
            </Link>
          ))}
        </nav>

        <Link href="/#audit" className="hidden min-h-11 items-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-slate-800 lg:inline-flex">
          Run Free Audit
        </Link>

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
            <Link href="/#audit" onClick={() => setIsOpen(false)} className="mt-2 inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white">
              Run Free Audit
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}