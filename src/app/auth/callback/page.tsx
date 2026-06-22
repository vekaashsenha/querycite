"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ClayCard, StatusPill } from "@/components/ui";

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Completing your QueryCite login...");
  const [error, setError] = useState("");
  const next = useMemo(() => {
    const value = searchParams.get("next");
    return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
  }, [searchParams]);

  useEffect(() => {
    async function completeSession() {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const queryError = searchParams.get("error_description") || searchParams.get("error");
      const accessToken = hash.get("access_token") || searchParams.get("access_token");
      const refreshToken = hash.get("refresh_token") || searchParams.get("refresh_token") || "";
      const expiresIn = Number(hash.get("expires_in") || searchParams.get("expires_in") || 3600);

      if (queryError) {
        setError(queryError);
        setStatus("Email confirmation could not be completed.");
        return;
      }

      if (!accessToken) {
        setStatus("Email confirmed. Please log in to continue.");
        window.setTimeout(() => router.replace(`/login?confirmed=true&next=${encodeURIComponent(next)}`), 900);
        return;
      }

      try {
        const response = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn, next }),
        });
        const data = await response.json() as { error?: string; next?: string };
        if (!response.ok) throw new Error(data.error || "Session could not be completed.");
        router.replace(data.next || next);
        router.refresh();
      } catch (callbackError) {
        setError(callbackError instanceof Error ? callbackError.message : "Session could not be completed. Please log in.");
        setStatus("Please log in again.");
      }
    }

    void completeSession();
  }, [next, router, searchParams]);

  return (
    <main className="px-5 py-16 sm:px-8">
      <ClayCard className="mx-auto max-w-xl text-center">
        <StatusPill tone={error ? "amber" : "violet"}>{error ? "Action needed" : "Auth callback"}</StatusPill>
        <h1 className="mt-4 text-3xl font-semibold text-slate-950">{status}</h1>
        {error ? <p className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold leading-6 text-rose-700">{error}</p> : null}
        <div className="mt-7 flex justify-center gap-3">
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white">Go to login</Link>
        </div>
      </ClayCard>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<main className="px-5 py-16 sm:px-8"><ClayCard className="mx-auto max-w-xl text-center"><StatusPill tone="violet">Loading</StatusPill><p className="mt-4 text-sm font-semibold text-slate-600">Completing account access...</p></ClayCard></main>}>
      <CallbackInner />
    </Suspense>
  );
}
