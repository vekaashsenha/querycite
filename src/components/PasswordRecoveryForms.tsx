"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { AppCard, StatusPill } from "@/components/ui";

const forgotSuccess = "If an account exists for this email, we have sent a password reset link.";
const resetSuccess = "Your password has been updated. Please login again.";
const inputClass = "min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100";

function PageShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <main className="px-5 py-16 sm:px-8">
      <section className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <Link href="/" className="inline-flex items-center gap-3" aria-label="QueryCite home">
            <span className="grid size-11 place-items-center rounded-2xl bg-slate-950 text-sm font-black text-white">QC</span>
            <span className="text-xl font-semibold text-slate-950">QueryCite</span>
          </Link>
          <div className="mt-8"><StatusPill tone="violet">{eyebrow}</StatusPill></div>
          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-normal text-slate-950 sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">{description}</p>
          <div className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 text-sm font-semibold leading-6 text-slate-700 shadow-sm">
            QueryCite never reveals whether an email is registered. Account recovery uses secure password reset links.
          </div>
        </div>
        <AppCard className="p-6 sm:p-8">{children}</AppCard>
      </section>
    </main>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error || "Password reset is temporarily unavailable.");
      setSuccess(data.message || forgotSuccess);
    } catch (forgotError) {
      setError(forgotError instanceof Error ? forgotError.message : "Password reset is temporarily unavailable.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <PageShell eyebrow="Account recovery" title="Reset your QueryCite password" description="Enter your email and we will send a secure password reset link if an account exists for that email.">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">Forgot password?</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Use the same email you used for QueryCite.</p>
        </div>
        <StatusPill tone="slate">Secure reset</StatusPill>
      </div>
      <form onSubmit={submit} className="mt-7 grid gap-4">
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" className={inputClass} />
        </label>
        {error ? <p className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold leading-6 text-rose-700">{error}</p> : null}
        {success ? <p className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-800">{success}</p> : null}
        <button type="submit" disabled={isLoading} className="min-h-12 rounded-full bg-slate-950 px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">
          {isLoading ? "Sending reset link..." : "Send reset link"}
        </button>
      </form>
      <p className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
        Remembered it? <Link href="/login" className="font-semibold text-violet-700">Back to login</Link>.
      </p>
    </PageShell>
  );
}

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(searchParams.get("updated") === "true" ? resetSuccess : "");
  const [isLoading, setIsLoading] = useState(false);

  const resetLink = useMemo(() => {
    const queryError = searchParams.get("error_description") || searchParams.get("error") || "";
    if (queryError) return { accessToken: "", error: queryError };
    if (typeof window === "undefined") return { accessToken: "", error: "" };

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hash.get("access_token") || searchParams.get("access_token") || "";
    return {
      accessToken,
      error: accessToken ? "" : "Reset link is invalid or expired. Please request a new password reset link.",
    };
  }, [searchParams]);
  const accessToken = resetLink.accessToken;
  const visibleError = error || (success ? "" : resetLink.error);

  useEffect(() => {
    if (accessToken && typeof window !== "undefined" && window.location.hash) {
      window.history.replaceState(null, "", "/reset-password");
    }
  }, [accessToken]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!accessToken) {
      setError("Reset link is invalid or expired. Please request a new password reset link.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: accessToken, password: newPassword }),
      });
      const data = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error || "Password could not be updated. Please request a new reset link.");
      setSuccess(data.message || resetSuccess);
      setNewPassword("");
      setConfirmPassword("");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Password could not be updated. Please request a new reset link.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <PageShell eyebrow="Password reset" title="Create a new password" description="Set a new password from your secure recovery link. After updating it, log in again with your new password.">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">New password</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Use at least 8 characters.</p>
        </div>
        <StatusPill tone="green">Recovery</StatusPill>
      </div>
      <form onSubmit={submit} className="mt-7 grid gap-4">
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          New password
          <input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} type="password" autoComplete="new-password" className={inputClass} />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Confirm new password
          <input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" autoComplete="new-password" className={inputClass} />
        </label>
        {visibleError ? <p className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold leading-6 text-rose-700">{visibleError}</p> : null}
        {success ? <p className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-800">{success}</p> : null}
        <button type="submit" disabled={isLoading || !accessToken || Boolean(success)} className="min-h-12 rounded-full bg-slate-950 px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">
          {isLoading ? "Updating password..." : "Update password"}
        </button>
      </form>
      <p className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
        {success ? <Link href="/login" className="font-semibold text-violet-700">Go to login</Link> : <Link href="/forgot-password" className="font-semibold text-violet-700">Request a new reset link</Link>}
      </p>
    </PageShell>
  );
}

export function ResetPasswordForm() {
  return (
    <Suspense fallback={<main className="px-5 py-16 sm:px-8"><AppCard className="mx-auto max-w-xl text-center"><StatusPill tone="violet">Loading</StatusPill><p className="mt-4 text-sm font-semibold text-slate-600">Preparing password reset...</p></AppCard></main>}>
      <ResetPasswordInner />
    </Suspense>
  );
}