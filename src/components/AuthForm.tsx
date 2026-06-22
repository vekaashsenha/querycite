"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { AppCard, StatusPill } from "@/components/ui";

type AuthMode = "login" | "signup";

const inputClass = "min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100";

function authErrorFromParam(value: string | null) {
  if (value === "session_expired") return "Please log in to continue.";
  if (value === "unauthorized") return "Please log in with the right account to continue.";
  return "";
}

function AuthShell({ mode, children }: { mode: AuthMode; children: React.ReactNode }) {
  const isSignup = mode === "signup";
  return (
    <main className="px-5 py-16 sm:px-8">
      <section className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <Link href="/" className="inline-flex items-center gap-3" aria-label="QueryCite home">
            <span className="grid size-11 place-items-center rounded-2xl bg-slate-950 text-sm font-black text-white">QC</span>
            <span className="text-xl font-semibold text-slate-950">QueryCite</span>
          </Link>
          <div className="mt-8"><StatusPill tone="violet">Secure account access</StatusPill></div>
          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-normal text-slate-950 sm:text-5xl">
            {isSignup ? "Create your QueryCite workspace" : "Log in to your QueryCite workspace"}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
            {isSignup
              ? "Save report history, prepare competitor context, and keep full-report workflows connected to your work email."
              : "Access saved reports, profile settings, billing status, and full-report workflows when your access is verified."}
          </p>
          <div className="mt-7 grid gap-3 text-sm font-semibold text-slate-700 sm:grid-cols-2">
            {["Saved report history", "Profile and competitor setup", "Billing status", "AI Advisor when eligible"].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">{item}</div>
            ))}
          </div>
          <p className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 text-xs font-semibold leading-5 text-slate-600">
            QueryCite improves AI visibility readiness. It does not guarantee rankings, traffic, or AI citations.
          </p>
        </div>
        <AppCard className="p-6 sm:p-8">{children}</AppCard>
      </section>
    </main>
  );
}

function AuthFormInner({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = useMemo(() => {
    const value = searchParams.get("next");
    return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
  }, [searchParams]);
  const confirmed = searchParams.get("confirmed") === "true";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(authErrorFromParam(searchParams.get("error")));
  const [success, setSuccess] = useState(confirmed ? "Email confirmed. You can log in now." : "");
  const [isLoading, setIsLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, next }),
      });
      const data = await response.json() as { error?: string; message?: string; confirmationRequired?: boolean; next?: string };
      if (!response.ok) throw new Error(data.error || "Authentication failed.");

      if (mode === "signup" && data.confirmationRequired) {
        setSuccess(data.message || "If this email is already registered, please login or reset your password.");
        setPassword("");
        return;
      }

      router.push(data.next || next);
      router.refresh();
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const isSignup = mode === "signup";

  return (
    <AuthShell mode={mode}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">{isSignup ? "Sign up" : "Welcome back"}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Use your work email and password.</p>
        </div>
        <StatusPill tone={isSignup ? "green" : "slate"}>{isSignup ? "Private beta" : "Secure login"}</StatusPill>
      </div>

      <form onSubmit={submit} className="mt-7 grid gap-4">
        {isSignup ? (
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className={inputClass} />
          </label>
        ) : null}
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Work email
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" className={inputClass} />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Password
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete={isSignup ? "new-password" : "current-password"} className={inputClass} />
        </label>
        {!isSignup ? <Link href="/forgot-password" className="w-fit text-sm font-semibold text-violet-700 transition hover:text-violet-900">Forgot password?</Link> : null}

        {error ? <p className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold leading-6 text-rose-700">{error}</p> : null}
        {success ? <p className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-800">{success}</p> : null}

        <button type="submit" disabled={isLoading} className="min-h-12 rounded-full bg-slate-950 px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">
          {isLoading ? (isSignup ? "Creating account..." : "Logging in...") : (isSignup ? "Create account" : "Log in")}
        </button>
      </form>

      <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
        {isSignup ? (
          <p>Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-violet-700">Login</Link>.</p>
        ) : (
          <p>Don&apos;t have an account? <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold text-violet-700">Sign up</Link>.</p>
        )}
      </div>
    </AuthShell>
  );
}

export function AuthForm(props: { mode: AuthMode }) {
  return (
    <Suspense fallback={<main className="px-5 py-16 sm:px-8"><AppCard className="mx-auto max-w-xl text-center"><StatusPill tone="violet">Loading</StatusPill><p className="mt-4 text-sm font-semibold text-slate-600">Preparing account access...</p></AppCard></main>}>
      <AuthFormInner {...props} />
    </Suspense>
  );
}