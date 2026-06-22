import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

export type Tone = "violet" | "green" | "amber" | "slate" | "rose" | "cyan";

const toneClasses: Record<Tone, string> = {
  violet: "border-violet-200 bg-violet-50 text-violet-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  slate: "border-slate-200 bg-slate-100 text-slate-700",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
  cyan: "border-cyan-200 bg-cyan-50 text-cyan-800",
};

export function SectionHeader({ eyebrow, title, description, align = "center" }: { eyebrow: string; title: string; description: string; align?: "center" | "left" }) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-normal text-slate-950 sm:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-slate-600">{description}</p>
    </div>
  );
}

export function PageIntro({ eyebrow, title, description, align = "center" }: { eyebrow: string; title: string; description: string; align?: "center" | "left" }) {
  return (
    <div className={align === "center" ? "mx-auto max-w-4xl text-center" : "max-w-4xl"}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">{eyebrow}</p>
      <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-normal text-slate-950 sm:text-5xl">{title}</h1>
      <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">{description}</p>
    </div>
  );
}

export function ClayCard({ children, className = "", ...props }: ComponentPropsWithoutRef<"div">) {
  return <div {...props} className={`rounded-[1.35rem] border border-slate-200/80 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur ${className}`}>{children}</div>;
}

export function AppCard({ children, className = "", ...props }: ComponentPropsWithoutRef<"div">) {
  return <div {...props} className={`rounded-[1.1rem] border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

export function StatusPill({ children, tone = "violet" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold leading-5 ${toneClasses[tone]}`}>{children}</span>;
}

export function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200">
      {children}
    </Link>
  );
}

export function SecondaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-950 focus:outline-none focus:ring-4 focus:ring-slate-100">
      {children}
    </Link>
  );
}

export function ActionButton({ children, disabled, type = "button", onClick, variant = "primary", className = "" }: { children: ReactNode; disabled?: boolean; type?: "button" | "submit"; onClick?: () => void; variant?: "primary" | "secondary" | "soft"; className?: string }) {
  const variants = {
    primary: "bg-slate-950 text-white shadow-[0_12px_30px_rgba(15,23,42,0.16)] hover:bg-slate-800 disabled:bg-slate-300",
    secondary: "border border-slate-300 bg-white text-slate-900 shadow-sm hover:border-slate-950 disabled:text-slate-400",
    soft: "border border-violet-100 bg-violet-50 text-violet-800 hover:border-violet-300 disabled:text-violet-300",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:translate-y-0 ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

export function LockedPanel({ title, description, cta = "Unlock full report" }: { title: string; description: string; cta?: string }) {
  return (
    <div className="relative overflow-hidden rounded-[1.1rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="select-none opacity-80 blur-[2px]">
        <div className="h-3 w-28 rounded-full bg-slate-200" />
        <div className="mt-4 h-8 w-40 rounded-full bg-slate-300" />
        <div className="mt-4 grid gap-2">
          <div className="h-3 rounded-full bg-slate-200" />
          <div className="h-3 w-4/5 rounded-full bg-slate-200" />
        </div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/72 px-4 text-center backdrop-blur-[1px]">
        <div>
          <StatusPill tone="slate">Locked</StatusPill>
          <h3 className="mt-3 text-base font-semibold leading-6 text-slate-950">{title}</h3>
          <p className="mt-1 max-w-sm text-sm leading-6 text-slate-600">{description}</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">{cta}</p>
        </div>
      </div>
    </div>
  );
}

export function ScoreRing({ label, score, tone }: { label: string; score: number; tone: string }) {
  return (
    <div className="rounded-[1.15rem] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium leading-5 text-slate-500">{label}</p>
      <div className="mt-4 flex items-end gap-2">
        <span className="text-5xl font-semibold leading-none text-slate-950">{score}</span>
        <span className="pb-1 text-sm font-medium text-slate-500">/ 100</span>
      </div>
      <div className="mt-5 h-2.5 rounded-full bg-slate-100">
        <div className={`h-2.5 rounded-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
      </div>
    </div>
  );
}

export function MetricCard({ label, value, detail, tone = "slate" }: { label: string; value: ReactNode; detail?: ReactNode; tone?: Tone }) {
  return (
    <AppCard>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
        <span className={`mt-0.5 size-2.5 rounded-full ${tone === "green" ? "bg-emerald-500" : tone === "violet" ? "bg-violet-600" : tone === "amber" ? "bg-amber-400" : tone === "rose" ? "bg-rose-500" : tone === "cyan" ? "bg-cyan-500" : "bg-slate-400"}`} />
      </div>
      <div className="mt-3 text-2xl font-semibold leading-8 text-slate-950">{value}</div>
      {detail ? <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p> : null}
    </AppCard>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="rounded-[1.15rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <div className="mx-auto grid size-11 place-items-center rounded-full border border-slate-200 bg-white" aria-hidden="true">
        <span className="size-2.5 rounded-full bg-violet-600" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function AlertBox({ children, tone = "slate" }: { children: ReactNode; tone?: Tone }) {
  return <div className={`rounded-[1.1rem] border p-4 text-sm font-semibold leading-6 ${toneClasses[tone]}`}>{children}</div>;
}

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="animate-pulse rounded-[1.1rem] border border-slate-200 bg-white p-5">
      <div className="h-4 w-36 rounded-full bg-slate-200" />
      <div className="mt-5 grid gap-3">
        {Array.from({ length: rows }).map((_, index) => <div key={index} className="h-3 rounded-full bg-slate-100" />)}
      </div>
    </div>
  );
}

export function FormField({ label, children, helper }: { label: string; children: ReactNode; helper?: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      {label}
      {children}
      {helper ? <span className="text-xs font-medium leading-5 text-slate-500">{helper}</span> : null}
    </label>
  );
}