"use client";

import { FormEvent, useEffect, useState } from "react";
import { ClayCard, StatusPill } from "@/components/ui";

type ProfileSettingsProps = {
  subscriptionId: string;
  email: string | null;
  planName: string;
};

type ProfileState = {
  name: string;
  company_name: string;
  role_designation: string;
  company_website: string;
  industry: string;
  company_size: string;
  target_market: string;
  primary_product_service: string;
  target_audience: string;
  main_keywords: string;
  primary_geography: string;
  tone_of_voice: string;
};

type CompetitorState = {
  slot_number: number;
  competitor_name: string;
  competitor_url: string;
  competitor_type: "Direct" | "Indirect" | "Aspirational";
};

type CompetitorResponse = {
  competitors?: Array<Partial<CompetitorState> & { id?: string }>;
  changesUsed?: number;
  changeLimit?: number;
  changesLeft?: number;
  resetDate?: string;
  error?: string;
};

const blankProfile: ProfileState = {
  name: "",
  company_name: "",
  role_designation: "",
  company_website: "",
  industry: "",
  company_size: "",
  target_market: "",
  primary_product_service: "",
  target_audience: "",
  main_keywords: "",
  primary_geography: "",
  tone_of_voice: "",
};

const blankCompetitors: CompetitorState[] = [1, 2, 3].map((slot) => ({ slot_number: slot, competitor_name: "", competitor_url: "", competitor_type: "Direct" }));

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
}

export function ProfileSettings({ subscriptionId, email, planName }: ProfileSettingsProps) {
  const [profile, setProfile] = useState<ProfileState>(blankProfile);
  const [competitors, setCompetitors] = useState<CompetitorState[]>(blankCompetitors);
  const [changesUsed, setChangesUsed] = useState(0);
  const [changeLimit, setChangeLimit] = useState(3);
  const [changesLeft, setChangesLeft] = useState(3);
  const [resetDate, setResetDate] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadSettings() {
      try {
        const [profileResponse, competitorsResponse] = await Promise.all([
          fetch("/api/profile"),
          fetch("/api/competitors"),
        ]);
        const profileData = (await profileResponse.json()) as { profile?: Record<string, unknown>; error?: string };
        const competitorData = (await competitorsResponse.json()) as CompetitorResponse;

        if (!profileResponse.ok) throw new Error(profileData.error || "Profile could not be loaded.");
        if (!competitorsResponse.ok) throw new Error(competitorData.error || "Competitors could not be loaded.");
        if (!isActive) return;

        const row = profileData.profile || {};
        setProfile({
          name: text(row.contact_name),
          company_name: text(row.company_name),
          role_designation: text(row.role_designation),
          company_website: text(row.website_url),
          industry: text(row.industry),
          company_size: text(row.company_size),
          target_market: text(row.primary_market),
          primary_product_service: text(row.primary_product_service),
          target_audience: text(row.target_audience) || text(row.icp_customer_type),
          main_keywords: text(row.main_keywords),
          primary_geography: text(row.primary_geography),
          tone_of_voice: text(row.tone_of_voice),
        });

        const nextCompetitors = blankCompetitors.map((slot) => {
          const row = competitorData.competitors?.find((item) => item.slot_number === slot.slot_number);
          const competitorType: CompetitorState["competitor_type"] = row?.competitor_type === "Indirect" || row?.competitor_type === "Aspirational" ? row.competitor_type : "Direct";
          return row ? {
            slot_number: slot.slot_number,
            competitor_name: text(row.competitor_name),
            competitor_url: text(row.competitor_url),
            competitor_type: competitorType,
          } : slot;
        });
        setCompetitors(nextCompetitors);
        setChangesUsed(competitorData.changesUsed ?? 0);
        setChangeLimit(competitorData.changeLimit ?? 3);
        setChangesLeft(competitorData.changesLeft ?? 3);
        setResetDate(competitorData.resetDate ?? "");
      } catch (loadError) {
        if (!isActive) return;
        setError(loadError instanceof Error ? loadError.message : "Settings could not be loaded.");
      }
    }

    void loadSettings();
    return () => {
      isActive = false;
    };
  }, [subscriptionId]);

  function updateProfile(key: keyof ProfileState, value: string) {
    setProfile((current) => ({ ...current, [key]: value }));
    setStatus("");
    setError("");
  }

  function updateCompetitor(index: number, key: keyof CompetitorState, value: string) {
    setCompetitors((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
    setStatus("");
    setError("");
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus("");
    setError("");

    try {
      const profileResponse = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const profileData = (await profileResponse.json()) as { error?: string };
      if (!profileResponse.ok) throw new Error(profileData.error || "Profile could not be saved.");

      const competitorPayload = competitors.filter((item) => item.competitor_url.trim().length > 0);
      const competitorResponse = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitors: competitorPayload }),
      });
      const competitorData = (await competitorResponse.json()) as CompetitorResponse;
      if (!competitorResponse.ok) throw new Error(competitorData.error || "Competitors could not be saved.");

      setChangesUsed(competitorData.changesUsed ?? changesUsed);
      setChangeLimit(competitorData.changeLimit ?? changeLimit);
      setChangesLeft(competitorData.changesLeft ?? changesLeft);
      setResetDate(competitorData.resetDate ?? resetDate);
      setStatus("Profile and competitor settings saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Settings could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={saveSettings} className="mx-auto mt-10 grid max-w-7xl gap-6 lg:grid-cols-[1fr_0.85fr]">
      <ClayCard>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">Profile details</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">This context will later improve report history, Advisor answers, and competitor recommendations.</p>
          </div>
          <StatusPill tone="green">{planName}</StatusPill>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-slate-700">Name<input value={profile.name} onChange={(event) => updateProfile("name", event.target.value)} className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">Email<input value={email || ""} readOnly className="min-h-12 rounded-2xl border border-slate-200 bg-slate-100 px-4 text-sm text-slate-500" /></label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">Company name<input value={profile.company_name} onChange={(event) => updateProfile("company_name", event.target.value)} className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">Role/designation<input value={profile.role_designation} onChange={(event) => updateProfile("role_designation", event.target.value)} className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">Company website<input value={profile.company_website} onChange={(event) => updateProfile("company_website", event.target.value)} placeholder="byldgroup.com" className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">Industry<input value={profile.industry} onChange={(event) => updateProfile("industry", event.target.value)} className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">Company size<input value={profile.company_size} onChange={(event) => updateProfile("company_size", event.target.value)} className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">Target market<input value={profile.target_market} onChange={(event) => updateProfile("target_market", event.target.value)} className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700 md:col-span-2">Primary product/service<input value={profile.primary_product_service} onChange={(event) => updateProfile("primary_product_service", event.target.value)} className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700 md:col-span-2">Target audience<textarea value={profile.target_audience} onChange={(event) => updateProfile("target_audience", event.target.value)} className="min-h-24 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">Main keywords<input value={profile.main_keywords} onChange={(event) => updateProfile("main_keywords", event.target.value)} className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">Primary geography<input value={profile.primary_geography} onChange={(event) => updateProfile("primary_geography", event.target.value)} className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700 md:col-span-2">Tone of voice<input value={profile.tone_of_voice} onChange={(event) => updateProfile("tone_of_voice", event.target.value)} className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></label>
        </div>
      </ClayCard>

      <div className="grid gap-6">
        <ClayCard>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">Competitor settings</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Changing one competitor URL counts as one change.</p>
            </div>
            <StatusPill tone={changesLeft > 0 ? "green" : "amber"}>Changes left: {changesLeft} / {changeLimit}</StatusPill>
          </div>
          <p className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs font-semibold leading-5 text-slate-600">Reset date: {formatDate(resetDate)}. Starter MVP allows 3 competitors; Pro and Agency limits are planned after full account tiers are active.</p>
          <div className="mt-5 grid gap-4">
            {competitors.map((competitor, index) => (
              <div key={competitor.slot_number} className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-950">Competitor {competitor.slot_number}</p>
                <input value={competitor.competitor_name} onChange={(event) => updateCompetitor(index, "competitor_name", event.target.value)} placeholder="Competitor name" className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none" />
                <input value={competitor.competitor_url} onChange={(event) => updateCompetitor(index, "competitor_url", event.target.value)} placeholder="competitor.com" className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none" />
                <select value={competitor.competitor_type} onChange={(event) => updateCompetitor(index, "competitor_type", event.target.value as CompetitorState["competitor_type"])} className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none">
                  <option>Direct</option>
                  <option>Indirect</option>
                  <option>Aspirational</option>
                </select>
              </div>
            ))}
          </div>
        </ClayCard>

        <ClayCard>
          <h3 className="text-xl font-semibold text-slate-950">Competitor comparison fields</h3>
          <div className="mt-4 grid gap-2 text-sm font-semibold text-slate-700">
            {["AI Visibility Score", "AI Crawler Readiness Score", "Schema Readiness", "Content Clarity", "llms.txt status", "Top gaps", "Priority recommendations"].map((item) => <div key={item} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">{item}</div>)}
          </div>
        </ClayCard>

        {error ? <p className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</p> : null}
        {status ? <p className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{status}</p> : null}
        <button type="submit" disabled={isSaving} className="min-h-12 rounded-full bg-slate-950 px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">
          {isSaving ? "Saving settings..." : "Save profile and competitors"}
        </button>
      </div>
    </form>
  );
}