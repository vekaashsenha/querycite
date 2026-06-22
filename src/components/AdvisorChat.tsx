"use client";

import { FormEvent, useMemo, useState } from "react";
import { StatusPill } from "@/components/ui";
import { advisorActionCosts, planLimits, type AdvisorActionType, type PaidPlanName } from "@/lib/plans";

const quickActions: Array<{ label: string; prompt: string; actionType: AdvisorActionType }> = [
  { label: "Explain my score", prompt: "Explain my AI Visibility Score and what is helping or hurting it.", actionType: "chat" },
  { label: "What should I fix first?", prompt: "What should I fix first based on effort and impact?", actionType: "chat" },
  { label: "Generate AEO/GEO fix plan", prompt: "Generate a practical AEO/GEO fix plan from this report.", actionType: "fix_pack" },
  { label: "Generate blog ideas from gaps", prompt: "Generate blog and content brief ideas from the gaps in this report.", actionType: "blog_brief" },
  { label: "Create developer action notes", prompt: "Create developer action notes from this report.", actionType: "fix_pack" },
  { label: "Compare me with competitors", prompt: "Compare my site with saved competitors and identify the strongest gaps.", actionType: "competitor_advice" },
  { label: "Create 30-day visibility plan", prompt: "Create a 30-day AI visibility readiness action plan.", actionType: "chat" },
];

const maxMessageLength = 900;
const advisorErrorCopy = "AI Advisor could not respond right now. Please try again.";

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

function splitResponse(content: string) {
  return content.split(/\n{2,}|\n-/).map((part) => part.trim()).filter(Boolean);
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
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

function UsageMeter({ label, used, total }: { label: string; used: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 100;
  return (
    <div className="rounded-2xl border border-violet-100 bg-white p-3">
      <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-600">
        <span>{label}</span>
        <span>{used} / {total}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-violet-600" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function AdvisorChat({ currentReportData, companyProfile, competitorData, planType, subscriptionId, reportId, resetDate }: AdvisorChatProps) {
  const [messages, setMessages] = useState<AdvisorMessage[]>([
    createMessage(
      "assistant",
      "I am QueryCite AI Visibility Advisor. I can help explain this report, prioritize AEO/GEO fixes, generate developer notes, and turn gaps into next steps.",
    ),
  ]);
  const [input, setInput] = useState("");
  const [usage, setUsage] = useState<UsageState>({ creditsUsed: 0, blogBriefsUsed: 0, fixPacksUsed: 0, competitorAdviceUsed: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const limits = planLimits[planType] || planLimits.free;
  const isFree = planType === "free";
  const isAdminQa = planType === "adminQa";
  const hasData = hasReportData(currentReportData);
  const remainingCharacters = maxMessageLength - input.length;

  const chatHistory = useMemo(
    () => messages.slice(-8).map((message) => ({ role: message.role, content: message.content })),
    [messages],
  );

  if (!hasData) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-6 shadow-lg">
        <StatusPill tone="amber">AI Visibility Advisor</StatusPill>
        <h3 className="mt-4 text-2xl font-semibold text-slate-950">Run an audit first to activate AI Advisor.</h3>
        <p className="mt-2 text-sm leading-6 text-slate-700">Advisor answers are report-specific and do not work without current audit data.</p>
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
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">Unlock AI Visibility Advisor to ask report-specific questions and generate AEO/GEO fixes.</p>
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
      setError("You have used all Advisor credits for this billing period.");
      return;
    }

    const userMessage = createMessage("user", trimmed);
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setError("");
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

      const data = (await response.json()) as { reply?: string; error?: string; usage?: UsageState };
      if (!response.ok || !data.reply) {
        throw new Error(data.error || advisorErrorCopy);
      }

      setMessages((current) => [...current, createMessage("assistant", data.reply ?? advisorErrorCopy)]);
      setUsage(data.usage ?? nextLocalUsage(usage, actionType));
    } catch (advisorError) {
      const message = advisorError instanceof Error ? advisorError.message : advisorErrorCopy;
      setError(message);
      setMessages((current) => [...current, createMessage("assistant", message)]);
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
          <p className="mt-2 text-sm leading-6 text-slate-600">Report-specific Advisor for AEO/GEO fixes, crawler readiness, competitor gaps, content improvements, developer notes, and next steps.</p>
        </div>
        <StatusPill tone={isAdminQa ? "cyan" : "violet"}>{isAdminQa ? "Admin QA mode" : planType === "betaFullReport" ? "Beta preview" : "Paid access"}</StatusPill>
      </div>

      {isAdminQa ? <p className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-semibold leading-6 text-cyan-900">Admin QA mode: usage limits relaxed for testing.</p> : null}

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <UsageMeter label="Advisor credits" used={usage.creditsUsed} total={limits.advisorCredits} />
        <UsageMeter label="Blog briefs" used={usage.blogBriefsUsed} total={limits.blogBriefs} />
        <UsageMeter label="Fix packs" used={usage.fixPacksUsed} total={limits.fixPacks} />
        <div className="rounded-2xl border border-violet-100 bg-white p-3 text-xs font-semibold leading-5 text-slate-600">
          <p>Resets on</p>
          <p className="mt-1 text-sm text-slate-950">{formatDate(resetDate)}</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-violet-100 bg-white p-4">
        <p className="text-sm font-semibold text-slate-950">Quick actions</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <button
              key={action.label}
              type="button"
              disabled={isLoading || wouldExceedLimit(usage, planType, action.actionType)}
              onClick={() => void sendMessage(action.prompt, action.actionType)}
              className="rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5 text-left text-xs font-semibold text-violet-800 transition hover:border-violet-300 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid max-h-[420px] gap-3 overflow-y-auto pr-1">
        {messages.map((message) => (
          <div key={message.id} className={`rounded-2xl border p-4 ${message.role === "assistant" ? "border-slate-200 bg-white" : "border-violet-100 bg-violet-100/70"}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{message.role === "assistant" ? "Advisor" : "You"}</p>
            <div className="mt-2 grid gap-2 text-sm leading-6 text-slate-700">
              {splitResponse(message.content).map((part) => (
                <p key={part}>{part}</p>
              ))}
            </div>
          </div>
        ))}
        {isLoading ? <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-600">AI Advisor is reviewing this report...</div> : null}
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
            placeholder="Ask about AEO/GEO fixes, competitor gaps, or next steps"
            className="min-h-12 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-100 disabled:text-slate-500"
          />
          <button type="submit" disabled={isLoading || input.trim().length === 0 || usage.creditsUsed >= limits.advisorCredits} className="min-h-12 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300">
            {isLoading ? "Sending..." : "Send"}
          </button>
        </div>
        <p className={`text-xs font-semibold ${remainingCharacters < 80 ? "text-amber-700" : "text-slate-500"}`}>{remainingCharacters} characters remaining</p>
      </form>

      <p className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-xs font-semibold leading-5 text-slate-600">
        AI Advisor can only help with this report, AEO/GEO fixes, competitor gaps, content improvements, developer notes, and next steps. It does not guarantee AI citations, rankings, traffic, revenue, or search positions.
      </p>
    </div>
  );
}