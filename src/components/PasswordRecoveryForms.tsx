"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { AppCard, StatusPill } from "@/components/ui";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const forgotSuccess = "If an account exists for this email, we have sent a password reset link.";
const resetSuccess = "Password updated. Please log in again.";
const expiredResetLinkMessage = "This password reset link has expired or was already used. Please request a new one.";
const inputClass = "min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100";

type ResetStatus = "checking" | "ready" | "invalid" | "success";

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

function passwordResetRedirectUrl() {
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const appUrl = configuredAppUrl || (typeof window !== "undefined" ? window.location.origin : "");
  return `${appUrl}/reset-password`;
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
      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error("Password reset is temporarily unavailable.");

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: passwordResetRedirectUrl(),
      });

      if (resetError) {
        console.error("Password reset email request failed", resetError);
      }

      setSuccess(forgotSuccess);
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

function getTokenParams(searchParams: URLSearchParams) {
  const hash = typeof window !== "undefined" ? new URLSearchParams(window.location.hash.replace(/^#/, "")) : new URLSearchParams();
  return {
    accessToken: hash.get("access_token") || searchParams.get("access_token") || "",
    code: searchParams.get("code") || hash.get("code") || "",
    queryError: searchParams.get("error_description") || searchParams.get("error") || hash.get("error_description") || hash.get("error") || "",
    refreshToken: hash.get("refresh_token") || searchParams.get("refresh_token") || "",
    tokenHash: searchParams.get("token_hash") || hash.get("token_hash") || searchParams.get("token") || hash.get("token") || "",
  };
}

function cleanResetUrl() {
  if (typeof window !== "undefined") {
    window.history.replaceState(null, "", "/reset-password");
  }
}

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<ResetStatus>("checking");

  useEffect(() => {
    let isCancelled = false;

    async function verifyResetLink() {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        if (!isCancelled) {
          setError("Password reset is temporarily unavailable.");
          setStatus("invalid");
        }
        return;
      }

      setError("");
      setStatus("checking");

      try {
        const params = getTokenParams(searchParams);
        if (params.queryError) throw new Error(params.queryError);

        if (params.code) {
          const { error: codeError } = await supabase.auth.exchangeCodeForSession(params.code);
          if (codeError) throw codeError;
        } else if (params.accessToken && params.refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: params.accessToken,
            refresh_token: params.refreshToken,
          });
          if (sessionError) throw sessionError;
        } else if (params.tokenHash) {
          const { error: otpError } = await supabase.auth.verifyOtp({
            token_hash: params.tokenHash,
            type: "recovery",
          });
          if (otpError) throw otpError;
        } else {
          const { data } = await supabase.auth.getSession();
          if (!data.session) throw new Error("No recovery session found.");
        }

        if (!isCancelled) {
          cleanResetUrl();
          setStatus("ready");
        }
      } catch (verifyError) {
        console.error("Password reset link verification failed", verifyError);
        if (!isCancelled) {
          setError(expiredResetLinkMessage);
          setStatus("invalid");
        }
      }
    }

    void verifyResetLink();

    return () => {
      isCancelled = true;
    };
  }, [searchParams]);

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

    if (status !== "ready") {
      setError(expiredResetLinkMessage);
      return;
    }

    setIsLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error("Password reset is temporarily unavailable.");

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      await supabase.auth.signOut().catch(() => null);
      await fetch("/api/auth/logout?next=/login", { method: "POST" }).catch(() => null);

      setStatus("success");
      setSuccess(resetSuccess);
      setNewPassword("");
      setConfirmPassword("");
      window.setTimeout(() => router.replace("/login?reset=success"), 1200);
    } catch (resetError) {
      console.error("Password update failed", resetError);
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
        <StatusPill tone={status === "invalid" ? "amber" : "green"}>Recovery</StatusPill>
      </div>

      {status === "checking" ? (
        <div className="mt-7 rounded-2xl border border-violet-100 bg-violet-50 p-4 text-sm font-semibold leading-6 text-violet-900" aria-live="polite">
          Verifying reset link...
        </div>
      ) : null}

      {status === "invalid" ? (
        <div className="mt-7 grid gap-4">
          <p className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold leading-6 text-rose-700">{error || expiredResetLinkMessage}</p>
          <Link href="/forgot-password" className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:bg-slate-800">
            Request new reset link
          </Link>
        </div>
      ) : null}

      {status === "ready" ? (
        <form onSubmit={submit} className="mt-7 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            New password
            <input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} type="password" autoComplete="new-password" className={inputClass} />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Confirm new password
            <input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" autoComplete="new-password" className={inputClass} />
          </label>
          {error ? <p className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold leading-6 text-rose-700">{error}</p> : null}
          <button type="submit" disabled={isLoading} className="min-h-12 rounded-full bg-slate-950 px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">
            {isLoading ? "Updating password..." : "Update password"}
          </button>
        </form>
      ) : null}

      {status === "success" ? (
        <div className="mt-7 grid gap-4">
          <p className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-800">{success || resetSuccess}</p>
          <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:bg-slate-800">
            Go to login
          </Link>
        </div>
      ) : null}

      {status !== "invalid" ? (
        <p className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          Need a fresh link? <Link href="/forgot-password" className="font-semibold text-violet-700">Request a new reset link</Link>.
        </p>
      ) : null}
    </PageShell>
  );
}

export function ResetPasswordForm() {
  return (
    <Suspense fallback={<main className="px-5 py-16 sm:px-8"><AppCard className="mx-auto max-w-xl text-center"><StatusPill tone="violet">Loading</StatusPill><p className="mt-4 text-sm font-semibold text-slate-600">Verifying reset link...</p></AppCard></main>}>
      <ResetPasswordInner />
    </Suspense>
  );
}
