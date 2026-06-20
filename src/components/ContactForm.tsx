"use client";

import { FormEvent, useState } from "react";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900">
        <h2 className="text-2xl font-semibold">Thanks for contacting QueryCite.</h2>
        <p className="mt-3 text-sm leading-6">This is a mock success state for Phase 1. Form delivery is not connected yet.</p>
        <button type="button" onClick={() => setSubmitted(false)} className="mt-6 min-h-11 rounded-full bg-emerald-700 px-5 text-sm font-semibold text-white">Send another message</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-3xl border border-white/70 bg-white/85 p-6 shadow-lg">
      {["Name", "Work email", "Company", "Website URL"].map((label) => (
        <label key={label} className="grid gap-2 text-sm font-semibold text-slate-700">
          {label}
          <input required={label !== "Website URL"} type={label === "Work email" ? "email" : label === "Website URL" ? "url" : "text"} className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100" />
        </label>
      ))}
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Message
        <textarea required rows={5} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100" />
      </label>
      <button type="submit" className="min-h-13 rounded-2xl bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800">Contact QueryCite</button>
    </form>
  );
}