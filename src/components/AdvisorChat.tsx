"use client";

import { FormEvent, useMemo, useState } from "react";
import { StatusPill } from "@/components/ui";

const suggestedAdvisorQuestions = [
  "Why is my AI Visibility Score low?",
  "What should I fix first?",
  "How do I improve AEO readiness?",
  "How do I improve GEO readiness?",
  "What should my developer change?",
  "Where are competitors stronger?",
  "Give me a 7-day action plan.",
  "Give me a 30-day action plan.",
];

const maxMessageLength = 700;
const creditLimits = {
  free: 0,
  betaFullReport: 50,
  launchTrial: 30,
  starter: 50,
  pro: 200,
  agency: 500,
} as const;
const advisorErrorCopy = "AI Advisor could not respond right now. Please try again.";

type AdvisorMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type AdvisorChatProps = {
  currentReportData: unknown;
  planType: "betaFullReport" | "launchTrial" | "starter" | "pro" | "agency" | "free";
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

export function AdvisorChat({ currentReportData, planType }: AdvisorChatProps) {
  const [messages, setMessages] = useState<AdvisorMessage[]>([
    createMessage(
      "assistant",
      "Ask me about this report's scores, AEO/GEO gaps, competitor comparison, content fixes, schema, developer notes, or action plans.",
    ),
  ]);
  const [input, setInput] = useState("");
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const isFree = planType === "free";
  const creditLimit = creditLimits[planType];
  const isAtLimit = creditsUsed >= creditLimit;
  const remainingCharacters = maxMessageLength - input.length;

  const chatHistory = useMemo(
    () => messages.slice(-8).map((message) => ({ role: message.role, content: message.content })),
    [messages],
  );

  async function sendMessage(nextMessage: string) {
    const trimmed = nextMessage.trim();
    if (!trimmed) {
      setError("Enter a question for AI Advisor.");
      return;
    }

    if (trimmed.length > maxMessageLength) {
      setError("Please keep your question under 700 characters.");
      return;
    }

    if (isFree) {
      setError("AI Advisor is available in the full report preview.");
      return;
    }

    if (isAtLimit) {
      setError("Assistant credit limit reached for this beta preview.");
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
          planType,
          chatHistory,
        }),
      });

      const data = (await response.json()) as { reply?: string; error?: string };
      if (!response.ok || !data.reply) {
        throw new Error(data.error || advisorErrorCopy);
      }

      setMessages((current) => [...current, createMessage("assistant", data.reply ?? advisorErrorCopy)]);
      // TODO: Replace local credit tracking with database-backed monthly usage after auth/subscriptions are added.
      setCreditsUsed((current) => Math.min(creditLimit, current + 1));
    } catch (error) {
      const message = error instanceof Error ? error.message : advisorErrorCopy;
      setError(message);
      setMessages((current) => [...current, createMessage("assistant", message)]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <div className="rounded-3xl border border-violet-200 bg-violet-50/70 p-6 shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-2xl font-semibold text-slate-950">AI Visibility Advisor</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">AI Advisor is available in private beta and uses this report context to suggest next actions.</p>
        </div>
        <StatusPill tone="violet">Private beta</StatusPill>
      </div>

      <div className="mt-5 rounded-2xl border border-violet-100 bg-white p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-slate-950">Suggested questions</p>
          <p className="text-xs font-semibold text-violet-700">Assistant credits used: {creditsUsed}/{creditLimit}</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestedAdvisorQuestions.map((question) => (
            <button
              key={question}
              type="button"
              disabled={isLoading || isAtLimit}
              onClick={() => void sendMessage(question)}
              className="rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5 text-left text-xs font-semibold text-violet-800 transition hover:border-violet-300 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {question}
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
        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-600">AI Advisor is reviewing this report...</div>
        ) : null}
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
            disabled={isLoading || isFree || isAtLimit}
            onChange={(event) => {
              setInput(event.target.value);
              if (error) setError("");
            }}
            placeholder="Ask about AEO/GEO fixes, competitor gaps, or next steps"
            className="min-h-12 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-100 disabled:text-slate-500"
          />
          <button
            type="submit"
            disabled={isLoading || isFree || isAtLimit || input.trim().length === 0}
            className="min-h-12 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isLoading ? "Sending..." : "Send"}
          </button>
        </div>
        <p className={`text-xs font-semibold ${remainingCharacters < 80 ? "text-amber-700" : "text-slate-500"}`}>{remainingCharacters} characters remaining</p>
      </form>

      <p className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-xs font-semibold leading-5 text-slate-600">
        AI Advisor can only help with this report, AEO/GEO fixes, competitor gaps, content improvements, developer notes, and next steps. It does not guarantee AI citations, rankings, traffic, or revenue.
      </p>
    </div>
  );
}
