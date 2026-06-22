"use client";

import { FormEvent, useEffect, useState } from "react";
import { ActionButton, AlertBox, AppCard, FormField, StatusPill } from "@/components/ui";

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

const inputClass = "min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-100 disabled:text-slate-500";
const textareaClass = "min-h-28 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100";

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
    <form onSubmit={saveSettings} className="grid gap-6 xl:grid-cols-[1fr_0.42fr]">
      <div className="grid gap-6">
        <AppCard className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">Personal details</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Account contact</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Your email is locked for now. Use account recovery if password access is lost.</p>
            </div>
            <StatusPill tone="green">{planName}</StatusPill>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <FormField label="Name"><input value={profile.name} onChange={(event) => updateProfile("name", event.target.value)} className={inputClass} /></FormField>
            <FormField label="Work email" helper="Email change is not available yet."><input value={email || ""} readOnly className={inputClass} /></FormField>
            <FormField label="Role/designation"><input value={profile.role_designation} onChange={(event) => updateProfile("role_designation", event.target.value)} className={inputClass} /></FormField>
          </div>
        </AppCard>

        <AppCard className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">Company profile</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Company and market</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <FormField label="Company name"><input value={profile.company_name} onChange={(event) => updateProfile("company_name", event.target.value)} className={inputClass} /></FormField>
            <FormField label="Company website"><input value={profile.company_website} onChange={(event) => updateProfile("company_website", event.target.value)} placeholder="byldgroup.com" className={inputClass} /></FormField>
            <FormField label="Industry"><input value={profile.industry} onChange={(event) => updateProfile("industry", event.target.value)} className={inputClass} /></FormField>
            <FormField label="Company size"><input value={profile.company_size} onChange={(event) => updateProfile("company_size", event.target.value)} className={inputClass} /></FormField>
            <FormField label="Target market"><input value={profile.target_market} onChange={(event) => updateProfile("target_market", event.target.value)} className={inputClass} /></FormField>
            <FormField label="Primary geography"><input value={profile.primary_geography} onChange={(event) => updateProfile("primary_geography", event.target.value)} className={inputClass} /></FormField>
          </div>
        </AppCard>

        <AppCard className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">Brand context</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Positioning and content signals</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <FormField label="Primary product/service"><input value={profile.primary_product_service} onChange={(event) => updateProfile("primary_product_service", event.target.value)} className={inputClass} /></FormField>
            <FormField label="Main keywords"><input value={profile.main_keywords} onChange={(event) => updateProfile("main_keywords", event.target.value)} className={inputClass} /></FormField>
            <div className="md:col-span-2"><FormField label="Target audience"><textarea value={profile.target_audience} onChange={(event) => updateProfile("target_audience", event.target.value)} className={textareaClass} /></FormField></div>
          </div>
        </AppCard>

        <AppCard className="p-6" id="competitors">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">Competitors</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Competitor context</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Up to 3 competitors can be used for comparison context in this beta foundation.</p>
            </div>
            <StatusPill tone={changesLeft > 0 ? "green" : "amber"}>Changes left: {changesLeft} / {changeLimit}</StatusPill>
          </div>
          <p className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-600">Competitor changes left this billing period: {changesLeft} / {changeLimit}. Reset date: {formatDate(resetDate)}.</p>
          <div className="mt-5 grid gap-4">
            {competitors.map((competitor, index) => (
              <div key={competitor.slot_number} className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 lg:grid-cols-[0.95fr_1fr_0.7fr]">
                <FormField label={`Competitor ${competitor.slot_number} name`}><input value={competitor.competitor_name} onChange={(event) => updateCompetitor(index, "competitor_name", event.target.value)} placeholder="Competitor name" className={inputClass} /></FormField>
                <FormField label="Website"><input value={competitor.competitor_url} onChange={(event) => updateCompetitor(index, "competitor_url", event.target.value)} placeholder="competitor.com" className={inputClass} /></FormField>
                <FormField label="Type"><select value={competitor.competitor_type} onChange={(event) => updateCompetitor(index, "competitor_type", event.target.value as CompetitorState["competitor_type"])} className={inputClass}><option>Direct</option><option>Indirect</option><option>Aspirational</option></select></FormField>
              </div>
            ))}
          </div>
        </AppCard>

        <AppCard className="p-6" id="preferences">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">Preferences</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Advisor tone</h2>
          <div className="mt-6"><FormField label="Tone of voice"><input value={profile.tone_of_voice} onChange={(event) => updateProfile("tone_of_voice", event.target.value)} placeholder="Clear, analytical, practical" className={inputClass} /></FormField></div>
        </AppCard>
      </div>

      <aside className="grid h-fit gap-6 xl:sticky xl:top-32">
        <AppCard className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">Save changes</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">Profile completion</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">These inputs shape saved reports and report-specific Advisor context when full access is verified.</p>
          <div className="mt-5 grid gap-2 text-sm font-semibold text-slate-700">
            {["Personal details", "Company profile", "Brand context", "Competitors", "Preferences"].map((item) => <div key={item} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">{item}</div>)}
          </div>
          {error ? <div className="mt-4"><AlertBox tone="rose">{error}</AlertBox></div> : null}
          {status ? <div className="mt-4"><AlertBox tone="green">{status}</AlertBox></div> : null}
          <ActionButton type="submit" disabled={isSaving} className="mt-5 w-full">
            {isSaving ? "Saving settings..." : "Save profile and competitors"}
          </ActionButton>
        </AppCard>

        <AppCard className="p-6">
          <h3 className="text-xl font-semibold text-slate-950">Comparison fields</h3>
          <div className="mt-4 grid gap-2 text-sm font-semibold text-slate-700">
            {["AI Visibility Score", "AI Crawler Readiness", "Schema Readiness", "Content Clarity", "llms.txt status", "Top gaps", "Priority recommendations"].map((item) => <div key={item} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">{item}</div>)}
          </div>
        </AppCard>
      </aside>
    </form>
  );
}