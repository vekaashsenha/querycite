"use client";

import { FormEvent, useState } from "react";

const feedbackEmail = "hello@querycite.com";

export function ContactForm() {
  const [fallbackVisible, setFallbackVisible] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("Name") ?? "");
    const email = String(form.get("Work email") ?? "");
    const company = String(form.get("Company") ?? "");
    const website = String(form.get("Website URL") ?? "");
    const message = String(form.get("Message") ?? "");
    const subject = encodeURIComponent(`QueryCite private beta feedback from ${name || company || "beta user"}`);
    const body = encodeURIComponent([
      `Name: ${name}`,
      `Work email: ${email}`,
      `Company: ${company}`,
      `Website URL: ${website}`,
      "",
      "Feedback:",
      message,
    ].join("\n"));

    setFallbackVisible(true);
    window.location.href = `mailto:${feedbackEmail}?subject=${subject}&body=${body}`;
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-3xl border border-white/70 bg-white/85 p-6 shadow-lg">
      {[
        ["Name", "text", true],
        ["Work email", "email", true],
        ["Company", "text", true],
        ["Website URL", "text", false],
      ].map(([label, type, required]) => (
        <label key={String(label)} className="grid gap-2 text-sm font-semibold text-slate-700">
          {label}
          <input name={String(label)} required={Boolean(required)} type={String(type)} className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100" />
        </label>
      ))}
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Message
        <textarea name="Message" required rows={5} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100" />
      </label>
      <button type="submit" className="min-h-13 rounded-2xl bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800">Contact QueryCite</button>
      <p className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
        Email delivery is not connected in private beta. Email your feedback to <a className="underline" href={`mailto:${feedbackEmail}`}>{feedbackEmail}</a>.
      </p>
      {fallbackVisible ? (
        <p className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-900">
          Your email app should open with the feedback pre-filled. If it does not, email your feedback to <a className="underline" href={`mailto:${feedbackEmail}`}>{feedbackEmail}</a>.
        </p>
      ) : null}
    </form>
  );
}
