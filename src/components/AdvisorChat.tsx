"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AdvisorMarkdown } from "@/components/AdvisorMarkdown";
import { FeedbackCta } from "@/components/FeedbackCta";
import { StatusPill } from "@/components/ui";
import { advisorActionCosts, planLimits, type AdvisorActionType, type PaidPlanName } from "@/lib/plans";

const quickActions: Array<{ label: string; prompt: string; actionType: AdvisorActionType }> = [
  { label: "What should I fix first?", prompt: "What should I fix first based on this report?", actionType: "chat" },
  { label: "Platform strategy", prompt: "What all platforms should I target to rank?", actionType: "chat" },
  { label: "Create llms.txt", prompt: "Create llms.txt for me.", actionType: "fix_pack" },
  { label: "Write website schema", prompt: "Write schema for my website.", actionType: "fix_pack" },
  { label: "Generate blog ideas", prompt: "Generate blog ideas based on this report.", actionType: "blog_brief" },
  { label: "Developer fix plan", prompt: "What should my developer fix first?", actionType: "fix_pack" },
  { label: "Content team plan", prompt: "What should my content team do first?", actionType: "fix_pack" },
  { label: "Copy-paste fixes", prompt: "Give me copy-paste fixes.", actionType: "fix_pack" },
];

const maxMessageLength = 900;
const normalUserErrorCopy = "AI Visibility Advisor is temporarily busy. Your report and recommended fixes are still available.";

type AdvisorMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type UsageState = {
  creditsUsed: number;
  blogBriefsUsed: number;
  fixPacksUsed: number;
  competitorAdviceUsed: number;
};

type AdvisorError = {
  code?: string;
  message?: string;
  retryable?: boolean;
};

type AdvisorDiagnostics = {
  status: "ready" | "error";
  geminiKey: "configured" | "missing";
  reportContext: "found" | "missing";
  accessState: "admin" | "paid" | "free";
  lastError: string | null;
  providerStatus: number | null;
  retryCount: number;
  responseLength: number;
  responseComplete: boolean;
  finishReason: string | null;
  modelUsed: string;
  finalFailureReason: string | null;
};

type AdvisorApiResponse = {
  reply?: string;
  error?: string | AdvisorError;
  usage?: UsageState;
  resetDate?: string | null;
  diagnostics?: AdvisorDiagnostics;
  diagnosticMessage?: string;
};

type AdvisorChatProps = {
  currentReportData?: unknown;
  companyProfile?: unknown;
  competitorData?: unknown;
  planType: PaidPlanName;
  subscriptionId?: string | null;
  reportId?: string | null;
  resetDate?: string | null;
};

function createMessage(role: AdvisorMessage["role"], content: string): AdvisorMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
  };
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Not scheduled";
}

function hasReportData(value: unknown) {
  return Boolean(value && typeof value === "object" && Object.keys(value).length > 0);
}

function wouldExceedLimit(usage: UsageState, planType: PaidPlanName, actionType: AdvisorActionType) {
  const limits = planLimits[planType];
  const cost = advisorActionCosts[actionType];
  return usage.creditsUsed + cost.credits > limits.advisorCredits || usage.blogBriefsUsed + cost.blogBriefs > limits.blogBriefs || usage.fixPacksUsed + cost.fixPacks > limits.fixPacks || usage.competitorAdviceUsed + cost.competitorAdvice > limits.competitorAdvice;
}

function nextLocalUsage(usage: UsageState, actionType: AdvisorActionType): UsageState {
  const cost = advisorActionCosts[actionType];
  return {
    creditsUsed: usage.creditsUsed + cost.credits,
    blogBriefsUsed: usage.blogBriefsUsed + cost.blogBriefs,
    fixPacksUsed: usage.fixPacksUsed + cost.fixPacks,
    competitorAdviceUsed: usage.competitorAdviceUsed + cost.competitorAdvice,
  };
}

function errorDetails(data: AdvisorApiResponse) {
  if (typeof data.error === "string") {
    return { code: "request_error", message: data.error };
  }
  return {
    code: data.error?.code || "backend_error",
    message: data.error?.message || normalUserErrorCopy,
  };
}

function UsageMeter({ label, used, total }: { label: string; used: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 100;
  return (
    <div className="qc-surface rounded-2xl border border-violet-100 bg-white p-3">
      <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-600">
        <span>{label}</span>
        <span>{used} / {total}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-100" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={used}>
        <div className="h-2 rounded-full bg-violet-600 transition-[width]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function DiagnosticsPanel({ diagnostics, diagnosticMessage, hasData }: { diagnostics: AdvisorDiagnostics | null; diagnosticMessage: string; hasData: boolean }) {
  return (
    <details className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50/80 p-4">
      <summary className="cursor-pointer text-sm font-semibold text-cyan-950">AI Advisor diagnostics</summary>
      <div className="mt-4 grid gap-2 text-xs font-semibold text-slate-700 sm:grid-cols-2">
        {[
          ["AI Advisor status", diagnostics?.status || "checking"],
          ["Gemini key", diagnostics?.geminiKey || "checking"],
          ["Report context", hasData ? "found" : "missing"],
          ["Access state", diagnostics?.accessState || "admin"],
          ["Last error", diagnostics?.lastError || "none"],
          ["Provider status", diagnostics?.providerStatus ? String(diagnostics.providerStatus) : "none"],
          ["Retries used", String(diagnostics?.retryCount ?? 0)],
          ["Response complete", diagnostics?.responseComplete ? "true" : "false"],
          ["Response length", String(diagnostics?.responseLength ?? 0)],
          ["Finish reason", diagnostics?.finishReason || "not available"],
          ["Model used", diagnostics?.modelUsed || "checking"],
          ["Final failure", diagnostics?.finalFailureReason || "none"],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 rounded-xl border border-cyan-100 bg-white px-3 py-2">
            <span className="text-slate-500">{label}</span>
            <span className="break-all text-right text-slate-950">{value}</span>
          </div>
        ))}
      </div>
      {diagnosticMessage ? <p className="mt-3 rounded-xl border border-cyan-100 bg-white p-3 text-xs font-semibold leading-5 text-cyan-950">{diagnosticMessage}</p> : null}
    </details>
  );
}

export function AdvisorChat({ currentReportData, companyProfile, competitorData, planType, subscriptionId, reportId, resetDate }: AdvisorChatProps) {
  const [messages, setMessages] = useState<AdvisorMessage[]>([
    createMessage(
      "assistant",
      "Ask about AI platforms, content, schema, llms.txt, developer fixes, or what to do next. I will use this report and give you practical implementation steps.",
    ),
  ]);
  const [input, setInput] = useState("");
  const [usage, setUsage] = useState<UsageState>({ creditsUsed: 0, blogBriefsUsed: 0, fixPacksUsed: 0, competitorAdviceUsed: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [diagnostics, setDiagnostics] = useState<AdvisorDiagnostics | null>(null);
  const [diagnosticMessage, setDiagnosticMessage] = useState("");
  const [effectiveResetDate, setEffectiveResetDate] = useState(resetDate ?? null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const limits = planLimits[planType] || planLimits.free;
  const isFree = planType === "free";
  const isAdminQa = planType === "adminQa";
  const hasData = hasReportData(currentReportData);
  const remainingCharacters = maxMessageLength - input.length;

  const chatHistory = useMemo(
    () => messages.slice(-8).map((message) => ({ role: message.role, content: message.content })),
    [messages],
  );

  useEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isFree || planType === "betaFullReport") return;

    let active = true;
    fetch("/api/advisor/chat", { method: "GET" })
      .then(async (response) => {
        const data = (await response.json()) as AdvisorApiResponse;
        if (!active || !response.ok) return;
        if (data.usage) setUsage(data.usage);
        if (data.resetDate) setEffectiveResetDate(data.resetDate);
        if (data.diagnostics) {
          setDiagnostics({ ...data.diagnostics, reportContext: hasData ? "found" : "missing" });
        }
      })
      .catch(() => {
        if (active) {
          setDiagnostics({
            status: "error",
            geminiKey: "missing",
            reportContext: hasData ? "found" : "missing",
            accessState: "admin",
            lastError: "backend_error",
            providerStatus: null,
            retryCount: 0,
            responseLength: 0,
            responseComplete: false,
            finishReason: null,
            modelUsed: "unavailable",
            finalFailureReason: "Diagnostics endpoint could not be reached.",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [hasData, isAdminQa, isFree, planType]);

  if (!hasData) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-6 shadow-lg">
        <StatusPill tone="amber">AI Visibility Advisor</StatusPill>
        <h3 className="mt-4 text-2xl font-semibold text-slate-950">Run an audit first to activate AI Advisor.</h3>
        <p className="mt-2 text-sm leading-6 text-slate-700">Advisor answers use the current audit as their source of truth.</p>
      </div>
    );
  }

  if (isFree) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
        <div className="blur-[2px] select-none">
          <div className="h-4 w-40 rounded-full bg-slate-200" />
          <div className="mt-5 h-24 rounded-2xl bg-slate-100" />
          <div className="mt-4 grid gap-2"><div className="h-3 rounded-full bg-slate-200" /><div className="h-3 w-3/4 rounded-full bg-slate-200" /></div>
        </div>
        <div className="absolute inset-0 grid place-items-center bg-white/65 px-5 text-center backdrop-blur-[1px]">
          <div>
            <StatusPill tone="slate">Locked</StatusPill>
            <h3 className="mt-3 text-2xl font-semibold text-slate-950">AI Visibility Advisor</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">Unlock report-specific explanations, fix plans, developer notes, and competitor guidance.</p>
          </div>
        </div>
      </div>
    );
  }

  async function sendMessage(nextMessage: string, actionType: AdvisorActionType = "chat") {
    const trimmed = nextMessage.trim();
    if (!trimmed) {
      setError("Enter a question for AI Advisor.");
      return;
    }

    if (trimmed.length > maxMessageLength) {
      setError("Please keep your question under 900 characters.");
      return;
    }

    if (wouldExceedLimit(usage, planType, actionType)) {
      setError(`You have used this period's limit for this feature. Your paid access remains active until ${formatDate(effectiveResetDate)}.`);
      return;
    }

    const userMessage = createMessage("user", trimmed);
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setError("");
    setDiagnosticMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/advisor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          currentReportData,
          companyProfile,
          competitorData,
          planType,
          actionType,
          subscriptionId,
          reportId,
          chatHistory,
        }),
      });

      const data = (await response.json()) as AdvisorApiResponse;
      if (!response.ok || !data.reply) {
        const details = errorDetails(data);
        if (data.diagnostics) setDiagnostics(data.diagnostics);
        if (data.diagnosticMessage) setDiagnosticMessage(data.diagnosticMessage);
        throw new Error(isAdminQa ? `${details.code}: ${data.diagnosticMessage || details.message}` : details.message);
      }

      setMessages((current) => [...current, createMessage("assistant", data.reply || normalUserErrorCopy)]);
      setUsage((current) => data.usage ?? nextLocalUsage(current, actionType));
      if (data.resetDate) setEffectiveResetDate(data.resetDate);
      if (data.diagnostics) setDiagnostics(data.diagnostics);
      if (data.diagnosticMessage) setDiagnosticMessage(data.diagnosticMessage);
    } catch (advisorError) {
      const message = isAdminQa && advisorError instanceof Error ? advisorError.message : normalUserErrorCopy;
      setError(message);
      setMessages((current) => [...current, createMessage("assistant", normalUserErrorCopy)]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input, "chat");
  }

  return (
    <div className="rounded-3xl border border-violet-200 bg-violet-50/70 p-6 shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-2xl font-semibold text-slate-950">AI Visibility Advisor</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">Turn this audit into copy-paste fixes, beginner-friendly steps, content briefs, and platform priorities.</p>
        </div>
        <StatusPill tone={isAdminQa ? "cyan" : "violet"}>{isAdminQa ? "Admin" : planType === "betaFullReport" ? "Beta preview" : "Paid access"}</StatusPill>
      </div>

      {isAdminQa ? <DiagnosticsPanel diagnostics={diagnostics} diagnosticMessage={diagnosticMessage} hasData={hasData} /> : null}

      {isAdminQa ? (
        <p className="mt-5 inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-900">Admin access</p>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <UsageMeter label="Advisor credits" used={usage.creditsUsed} total={limits.advisorCredits} />
          <UsageMeter label="Blog briefs" used={usage.blogBriefsUsed} total={limits.blogBriefs} />
          <UsageMeter label="Fix packs" used={usage.fixPacksUsed} total={limits.fixPacks} />
          <div className="rounded-2xl border border-violet-100 bg-white p-3 text-xs font-semibold leading-5 text-slate-600">
            <p>Renews on</p>
            <p className="mt-1 text-sm text-slate-950">{formatDate(effectiveResetDate)}</p>
          </div>
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-violet-100 bg-white p-4">
        <p className="text-sm font-semibold text-slate-950">Quick actions</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => (
            <button
              key={action.label}
              type="button"
              disabled={isLoading || wouldExceedLimit(usage, planType, action.actionType)}
              onClick={() => void sendMessage(action.prompt, action.actionType)}
              className="rounded-2xl border border-violet-100 bg-violet-50 px-3 py-2.5 text-left text-xs font-semibold text-violet-900 transition hover:border-violet-300 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={chatContainerRef} className="mt-4 grid max-h-[640px] gap-3 overflow-y-auto overscroll-contain pr-1" aria-live="polite">
        {messages.map((message) => (
          <div key={message.id} className={`rounded-2xl border p-4 ${message.role === "assistant" ? "qc-surface border-slate-200 bg-white" : "border-violet-100 bg-violet-100/70"}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{message.role === "assistant" ? "Advisor" : "You"}</p>
            <div className="mt-2 min-w-0 max-w-full">
              {message.role === "assistant" ? <AdvisorMarkdown content={message.content} /> : <div className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{message.content}</div>}
            </div>
          </div>
        ))}
        {isLoading ? <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-600">AI Advisor is thinking...</div> : null}
      </div>

      {error ? <p className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}

      <form onSubmit={handleSubmit} className="mt-4 grid gap-2">
        <label htmlFor="advisor-input" className="text-sm font-semibold text-slate-700">Ask about this report</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="advisor-input"
            type="text"
            value={input}
            maxLength={maxMessageLength}
            disabled={isLoading || usage.creditsUsed >= limits.advisorCredits}
            onChange={(event) => {
              setInput(event.target.value);
              if (error) setError("");
            }}
            placeholder="Ask about AI platforms, schema, llms.txt, content, or developer fixes"
            className="min-h-12 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-100 disabled:text-slate-500"
          />
          <button type="submit" disabled={isLoading || input.trim().length === 0 || usage.creditsUsed >= limits.advisorCredits} className="min-h-12 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300">
            {isLoading ? "Thinking..." : "Send"}
          </button>
        </div>
        <p className={`text-xs font-semibold ${remainingCharacters < 80 ? "text-amber-700" : "text-slate-500"}`}>{remainingCharacters} characters remaining</p>
      </form>

      <FeedbackCta variant="inline" className="mt-4" />

      <p className="mt-4 text-xs font-semibold leading-5 text-slate-500">
        Recommendations improve AI visibility readiness; they do not guarantee citations, rankings, traffic, revenue, or search positions.
      </p>
    </div>
  );
}
