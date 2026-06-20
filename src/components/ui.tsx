import Link from "next/link";
import type { ReactNode } from "react";

export function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-normal text-slate-950 sm:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-slate-600">{description}</p>
    </div>
  );
}

export function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mx-auto max-w-4xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">{eyebrow}</p>
      <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-normal text-slate-950 sm:text-5xl">{title}</h1>
      <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600">{description}</p>
    </div>
  );
}

export function ClayCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-white/75 bg-white/85 p-6 shadow-[0_22px_70px_rgba(25,31,61,0.09)] backdrop-blur ${className}`}>{children}</div>;
}

export function StatusPill({ children, tone = "violet" }: { children: ReactNode; tone?: "violet" | "green" | "amber" | "slate" }) {
  const tones = {
    violet: "border-violet-200 bg-violet-50 text-violet-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    slate: "border-slate-200 bg-slate-100 text-slate-700",
  };

  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold leading-5 ${tones[tone]}`}>{children}</span>;
}

export function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-800">
      {children}
    </Link>
  );
}

export function LockedPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="blur-[2px] select-none">
        <div className="h-3 w-28 rounded-full bg-slate-200" />
        <div className="mt-4 h-8 w-40 rounded-full bg-slate-300" />
        <div className="mt-4 grid gap-2">
          <div className="h-3 rounded-full bg-slate-200" />
          <div className="h-3 w-4/5 rounded-full bg-slate-200" />
        </div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/58 px-4 text-center backdrop-blur-[1px]">
        <div>
          <StatusPill tone="slate">Locked</StatusPill>
          <h3 className="mt-3 text-base font-semibold leading-6 text-slate-950">{title}</h3>
          <p className="mt-1 max-w-sm text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
    </div>
  );
}

export function ScoreRing({ label, score, tone }: { label: string; score: number; tone: string }) {
  return (
    <div className="rounded-3xl border border-white/75 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium leading-5 text-slate-500">{label}</p>
      <div className="mt-4 flex items-end gap-2">
        <span className="text-5xl font-semibold leading-none text-slate-950">{score}</span>
        <span className="pb-1 text-sm font-medium text-slate-500">/ 100</span>
      </div>
      <div className="mt-5 h-3 rounded-full bg-slate-100">
        <div className={`h-3 rounded-full ${tone}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}