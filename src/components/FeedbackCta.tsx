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
