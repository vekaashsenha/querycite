"use client";

import { FormEvent, useState } from "react";

const feedbackEmail = "hello@querycite.com";
const successCopy = "Thanks. Your feedback has been received.";
const failureCopy = "We could not submit your feedback right now. Please email hello@querycite.com.";

type SubmitState = "idle" | "submitting" | "success" | "error";

export function ContactForm() {
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [statusMessage, setStatusMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    setSubmitState("submitting");
    setStatusMessage("");

    const payload = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      company: String(form.get("company") ?? ""),
      website_url: String(form.get("website_url") ?? ""),
      message: String(form.get("message") ?? ""),
      source: "contact_page",
    };

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        throw new Error(result.error || failureCopy);
      }

      setSubmitState("success");
      setStatusMessage(result.message || successCopy);
      formElement.reset();
    } catch (error) {
      setSubmitState("error");
      setStatusMessage(error instanceof Error ? error.message : failureCopy);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-3xl border border-white/70 bg-white/85 p-6 shadow-lg">
      {[
        ["Name", "name", "text", true],
        ["Work email", "email", "email", true],
        ["Company", "company", "text", true],
        ["Website URL", "website_url", "text", false],
      ].map(([label, name, type, required]) => (
        <label key={String(name)} className="grid gap-2 text-sm font-semibold text-slate-700">
          {label}
          <input name={String(name)} required={Boolean(required)} type={String(type)} className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100" />
        </label>
      ))}
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Message
        <textarea name="message" required rows={5} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100" />
      </label>
      <button type="submit" disabled={submitState === "submitting"} className="min-h-13 rounded-2xl bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">
        {submitState === "submitting" ? "Submitting..." : "Contact QueryCite"}
      </button>
      {statusMessage ? (
        <p className={`rounded-2xl border p-4 text-sm font-semibold leading-6 ${submitState === "success" ? "border-emerald-100 bg-emerald-50 text-emerald-900" : "border-amber-100 bg-amber-50 text-amber-900"}`}>
          {statusMessage} {submitState === "error" ? <a className="underline" href={`mailto:${feedbackEmail}`}>{feedbackEmail}</a> : null}
        </p>
      ) : null}
      <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs font-semibold leading-5 text-slate-600">
        Feedback is saved to the private beta backend when Supabase environment variables are configured. If submission fails, use the email fallback.
      </p>
    </form>
  );
}