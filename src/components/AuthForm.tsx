"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { ClayCard, StatusPill } from "@/components/ui";

type AuthMode = "login" | "signup";

function authErrorFromParam(value: string | null) {
  if (value === "session_expired") return "Please log in to continue.";
  if (value === "unauthorized") return "Please log in with the right account to continue.";
  return "";
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
        setSuccess(data.message || "Check your email to confirm your QueryCite account, then log in.");
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
    <main className="px-5 py-16 sm:px-8">
      <section className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
        <div>
          <StatusPill tone="violet">QueryCite account</StatusPill>
          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-normal text-slate-950 sm:text-5xl">
            {isSignup ? "Create your QueryCite account" : "Log in to QueryCite"}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
            {isSignup
              ? "Use your work email to save report history, manage competitor context, and prepare for full report access. Email confirmation is required."
              : "Access your dashboard, profile, billing status, saved reports, competitor settings, and verified paid features."}
          </p>
          <div className="mt-7 grid gap-3 text-sm font-semibold text-slate-700 sm:grid-cols-2">
            {["Saved report history", "Profile and competitor setup", "Billing status from Supabase", "AI Advisor access when eligible"].map((item) => (
              <div key={item} className="rounded-2xl border border-white/75 bg-white/80 p-4 shadow-sm">{item}</div>
            ))}
          </div>
        </div>

        <ClayCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">{isSignup ? "Sign up" : "Welcome back"}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Email/password access only. Google login and magic links are not enabled yet.</p>
            </div>
            <StatusPill tone={isSignup ? "green" : "slate"}>{isSignup ? "Private beta" : "Secure login"}</StatusPill>
          </div>

          <form onSubmit={submit} className="mt-7 grid gap-4">
            {isSignup ? (
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Name
                <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" />
              </label>
            ) : null}
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Work email
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Password
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete={isSignup ? "new-password" : "current-password"} className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" />
            </label>

            {error ? <p className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold leading-6 text-rose-700">{error}</p> : null}
            {success ? <p className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-800">{success}</p> : null}

            <button type="submit" disabled={isLoading} className="min-h-12 rounded-full bg-slate-950 px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">
              {isLoading ? (isSignup ? "Creating account..." : "Logging in...") : (isSignup ? "Create account" : "Log in")}
            </button>
          </form>

          <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            {isSignup ? (
              <p>Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-violet-700">Log in</Link>.</p>
            ) : (
              <p>New to QueryCite? <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold text-violet-700">Create an account</Link>.</p>
            )}
          </div>
        </ClayCard>
      </section>
    </main>
  );
}

export function AuthForm(props: { mode: AuthMode }) {
  return (
    <Suspense fallback={<main className="px-5 py-16 sm:px-8"><ClayCard className="mx-auto max-w-xl text-center"><StatusPill tone="violet">Loading</StatusPill><p className="mt-4 text-sm font-semibold text-slate-600">Preparing account access...</p></ClayCard></main>}>
      <AuthFormInner {...props} />
    </Suspense>
  );
}
