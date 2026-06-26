"use client";

type FeedbackCtaVariant = "button" | "card" | "inline";

const placeholderFeedbackUrl = "YOUR_GOOGLE_FORM_LINK_HERE";

function getFeedbackFormUrl() {
  const value = process.env.NEXT_PUBLIC_FEEDBACK_FORM_URL?.trim();

  if (!value || value === placeholderFeedbackUrl) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

export function FeedbackCta({ variant = "button", className = "" }: { variant?: FeedbackCtaVariant; className?: string }) {
  const feedbackUrl = getFeedbackFormUrl();

  if (!feedbackUrl) {
    return null;
  }

  if (variant === "inline") {
    return (
      <p className={`text-xs font-semibold leading-5 text-slate-500 ${className}`}>
        Was this answer useful?{" "}
        <a href={feedbackUrl} target="_blank" rel="noreferrer" className="text-violet-700 underline-offset-4 hover:underline">
          Share feedback.
        </a>
      </p>
    );
  }

  const link = (
    <a
      href={feedbackUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-10 items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200"
      aria-label="Give Feedback on QueryCite"
    >
      Give Feedback
    </a>
  );

  if (variant === "card") {
    return (
      <div className={`rounded-2xl border border-violet-100 bg-violet-50/80 p-4 ${className}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950">Give Feedback</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">Help us improve QueryCite before public launch.</p>
          </div>
          {link}
        </div>
      </div>
    );
  }

  return <span className={className}>{link}</span>;
}
export function FloatingFeedbackButton() {
  const feedbackUrl = getFeedbackFormUrl();

  if (!feedbackUrl) {
    return null;
  }

  return (
    <a
      href={feedbackUrl}
      target="_blank"
      rel="noreferrer"
      aria-label="Give feedback about QueryCite"
      className="qc-surface fixed bottom-24 right-4 z-40 inline-flex min-h-10 items-center gap-2 rounded-full border border-violet-200 px-3.5 text-xs font-semibold text-slate-950 shadow-[0_14px_40px_rgba(15,23,42,0.16)] backdrop-blur transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50 focus:outline-none focus:ring-4 focus:ring-violet-100 sm:bottom-6 sm:right-6 sm:min-h-11 sm:px-4 sm:text-sm"
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none">
        <path d="M5.4 14.1 4.5 17l2.9-.9 7.8-7.8a1.7 1.7 0 0 0 0-2.4l-1.1-1.1a1.7 1.7 0 0 0-2.4 0l-7.8 7.8Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
        <path d="m10.8 5.7 3.5 3.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
      </svg>
      Feedback
    </a>
  );
}
