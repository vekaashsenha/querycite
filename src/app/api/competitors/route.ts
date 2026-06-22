import { NextResponse } from "next/server";
import { getPaidAccessContextForUser } from "@/lib/paid-foundation";
import { getCurrentUser, syncAuthenticatedUser } from "@/lib/auth/server";
import { insertSupabaseRow, isSupabaseAdminConfigured, selectSupabaseRows, updateSupabaseRows } from "@/lib/supabase/admin";
import { normalizeWebsiteUrl } from "@/lib/url";

export const runtime = "nodejs";

type CompetitorInput = {
  slot_number?: number;
  competitor_name?: string;
  competitor_url?: string;
  competitor_type?: "Direct" | "Indirect" | "Aspirational";
};

type CompetitorsRequest = {
  competitors?: CompetitorInput[];
};

type CompanyProfileRow = { id?: string; subscription_id?: string | null; website_url?: string | null; primary_domain?: string | null; owner_user_id?: string | null };
type CompetitorRow = Record<string, unknown> & { id?: string; slot_number?: number; competitor_url?: string | null; is_active?: boolean | null };
type LimitRow = Record<string, unknown> & { id?: string; change_count?: number | null; billing_cycle_start?: string | null; billing_cycle_end?: string | null };

function clean(value: unknown, max = 300) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function domainFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function periodStart(accessStart: string | null) {
  return accessStart || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
}

function periodEnd(accessEnd: string | null) {
  return accessEnd || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString();
}

async function authenticatedAccess() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Please log in to continue." }, { status: 401 }) };
  await syncAuthenticatedUser(user);
  const access = await getPaidAccessContextForUser(user);
  if (!access.verifiedPaidAccess && !access.qaAccess) return { error: NextResponse.json({ error: "Verified paid access is required to manage competitors." }, { status: 403 }) };
  const subscriptionId = access.subscriptionId || `admin-qa-${user.id}`;
  if (!isSupabaseAdminConfigured()) return { error: NextResponse.json({ error: "Competitor storage is temporarily unavailable." }, { status: 503 }) };
  return { user, access, subscriptionId };
}

async function getCompanyProfile(userId: string, subscriptionId: string) {
  const rows = await selectSupabaseRows<CompanyProfileRow>("company_profiles", {
    select: "id,subscription_id,website_url,primary_domain,owner_user_id",
    or: `(owner_user_id.eq.${userId},subscription_id.eq.${subscriptionId})`,
    limit: "1",
  });
  return rows[0] ?? null;
}

async function ensureCompanyProfile(userId: string, subscriptionId: string, email: string | null, websiteUrl: string | null) {
  const existing = await getCompanyProfile(userId, subscriptionId);
  if (existing?.id) {
    if (existing.owner_user_id !== userId) {
      await updateSupabaseRows("company_profiles", { id: `eq.${existing.id}` }, { owner_user_id: userId, email, subscription_id: subscriptionId, updated_at: new Date().toISOString() });
    }
    return existing;
  }

  const normalized = normalizeWebsiteUrl(websiteUrl || "") || "https://example.com";
  const inserted = await insertSupabaseRow("company_profiles", {
    owner_user_id: userId,
    email,
    subscription_id: subscriptionId,
    company_name: null,
    primary_domain: domainFromUrl(normalized) || "querycite-customer.local",
    website_url: normalized,
    created_at: new Date().toISOString(),
  });

  return inserted[0] as CompanyProfileRow;
}

async function getCompetitors(userId: string, subscriptionId: string) {
  return selectSupabaseRows<CompetitorRow>("competitors", {
    select: "id,competitor_name,competitor_url,domain,competitor_type,slot_number,is_active,created_at,updated_at",
    or: `(user_id.eq.${userId},subscription_id.eq.${subscriptionId})`,
    is_active: "eq.true",
    order: "slot_number.asc",
    limit: "10",
  });
}

async function getOrCreateLimit(userId: string, subscriptionId: string, access: Awaited<ReturnType<typeof getPaidAccessContextForUser>>, companyProfileId: string) {
  const start = periodStart(access.currentPeriodStart);
  const end = periodEnd(access.currentPeriodEnd);
  const existingRows = await selectSupabaseRows<LimitRow>("competitor_change_limits", {
    select: "*",
    or: `(user_id.eq.${userId},subscription_id.eq.${subscriptionId})`,
    limit: "1",
  });
  const existing = existingRows[0];

  if (existing?.id) {
    const existingStart = existing.billing_cycle_start ? Date.parse(existing.billing_cycle_start) : 0;
    const nextStart = Date.parse(start);
    if (nextStart > existingStart) {
      const updated = await updateSupabaseRows("competitor_change_limits", { id: `eq.${existing.id}` }, {
        user_id: userId,
        billing_cycle_start: start,
        billing_cycle_end: end,
        change_count: 0,
        change_limit: access.limits.competitorChanges,
        reset_date: end,
        updated_at: new Date().toISOString(),
      });
      return updated[0] as LimitRow;
    }
    return existing;
  }

  const inserted = await insertSupabaseRow("competitor_change_limits", {
    company_profile_id: companyProfileId,
    user_id: userId,
    email: access.email,
    subscription_id: subscriptionId,
    billing_cycle_start: start,
    billing_cycle_end: end,
    change_count: 0,
    change_limit: access.limits.competitorChanges,
    reset_date: end,
    created_at: new Date().toISOString(),
  });
  return inserted[0] as LimitRow;
}

function normalizeCompetitor(input: CompetitorInput) {
  const slot = Number(input.slot_number);
  const competitorUrl = normalizeWebsiteUrl(input.competitor_url || "");
  if (!Number.isInteger(slot) || slot < 1 || slot > 3 || !competitorUrl) return null;
  return {
    slot_number: slot,
    competitor_name: clean(input.competitor_name, 160) || null,
    competitor_url: competitorUrl,
    domain: domainFromUrl(competitorUrl),
    competitor_type: input.competitor_type === "Indirect" || input.competitor_type === "Aspirational" ? input.competitor_type : "Direct",
  };
}

export async function GET() {
  const auth = await authenticatedAccess();
  if (auth.error) return auth.error;
  const { user, access } = auth;
  const subscriptionId = auth.subscriptionId;
  const companyProfile = await ensureCompanyProfile(user.id, subscriptionId, access.email ?? user.email, access.websiteUrl);
  const limit = await getOrCreateLimit(user.id, subscriptionId, access, companyProfile.id as string);
  const competitors = await getCompetitors(user.id, subscriptionId);

  return NextResponse.json({
    competitors,
    changeLimit: limit.change_limit ?? access.limits.competitorChanges,
    changesUsed: limit.change_count ?? 0,
    changesLeft: Math.max(0, (limit.change_limit as number ?? access.limits.competitorChanges) - (limit.change_count ?? 0)),
    resetDate: limit.reset_date ?? periodEnd(access.currentPeriodEnd),
    maxCompetitors: 3,
  });
}

export async function POST(request: Request) {
  try {
    const auth = await authenticatedAccess();
    if (auth.error) return auth.error;
    const { user, access } = auth;
    const subscriptionId = auth.subscriptionId;
    const body = (await request.json()) as CompetitorsRequest;
    const incoming = (body.competitors || []).map(normalizeCompetitor).filter(Boolean) as Array<ReturnType<typeof normalizeCompetitor> & Record<string, unknown>>;

    if (incoming.length > 3) {
      return NextResponse.json({ error: "Current competitor setup allows up to 3 competitors." }, { status: 400 });
    }

    const companyProfile = await ensureCompanyProfile(user.id, subscriptionId, access.email ?? user.email, access.websiteUrl);
    const existingCompetitors = await getCompetitors(user.id, subscriptionId);
    const limit = await getOrCreateLimit(user.id, subscriptionId, access, companyProfile.id as string);
    const changesUsed = limit.change_count ?? 0;
    const changeLimit = (limit.change_limit as number | null) ?? access.limits.competitorChanges;

    const changed = incoming.filter((item) => {
      const existing = existingCompetitors.find((row) => row.slot_number === item.slot_number);
      return !existing || existing.competitor_url !== item.competitor_url;
    });

    if (changesUsed + changed.length > changeLimit) {
      return NextResponse.json({ error: "You have used all competitor changes for this billing period." }, { status: 429 });
    }

    const now = new Date().toISOString();
    for (const item of incoming) {
      const existing = existingCompetitors.find((row) => row.slot_number === item.slot_number);
      const row = {
        company_profile_id: companyProfile.id,
        user_id: user.id,
        email: access.email ?? user.email,
        subscription_id: subscriptionId,
        is_active: true,
        updated_at: now,
        ...item,
      };

      if (existing?.id) {
        await updateSupabaseRows("competitors", { id: `eq.${existing.id}` }, row);
      } else {
        await insertSupabaseRow("competitors", { ...row, created_at: now });
      }
    }

    if (changed.length > 0 && limit.id) {
      await updateSupabaseRows("competitor_change_limits", { id: `eq.${limit.id}` }, {
        user_id: user.id,
        change_count: changesUsed + changed.length,
        change_limit: changeLimit,
        reset_date: limit.reset_date ?? periodEnd(access.currentPeriodEnd),
        updated_at: now,
      });
    }

    const competitors = await getCompetitors(user.id, subscriptionId);
    return NextResponse.json({
      competitors,
      changeLimit,
      changesUsed: changesUsed + changed.length,
      changesLeft: Math.max(0, changeLimit - (changesUsed + changed.length)),
      resetDate: limit.reset_date ?? periodEnd(access.currentPeriodEnd),
      maxCompetitors: 3,
    });
  } catch (error) {
    console.error("Competitor save failed", error);
    return NextResponse.json({ error: "Competitors could not be saved right now." }, { status: 500 });
  }
}
