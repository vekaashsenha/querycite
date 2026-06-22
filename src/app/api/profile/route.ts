import { NextResponse } from "next/server";
import { getPaidAccessContextForUser } from "@/lib/paid-foundation";
import { getCurrentUser, syncAuthenticatedUser } from "@/lib/auth/server";
import { insertSupabaseRow, isSupabaseAdminConfigured, selectSupabaseRows, updateSupabaseRows } from "@/lib/supabase/admin";
import { normalizeWebsiteUrl } from "@/lib/url";

export const runtime = "nodejs";

type ProfileRequest = {
  name?: string;
  company_name?: string;
  role_designation?: string;
  company_website?: string;
  industry?: string;
  company_size?: string;
  target_market?: string;
  primary_product_service?: string;
  target_audience?: string;
  main_keywords?: string;
  primary_geography?: string;
  tone_of_voice?: string;
};

type CompanyProfileRow = Record<string, unknown> & { id?: string; subscription_id?: string | null; owner_user_id?: string | null };

function clean(value: unknown, max = 500) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function domainFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "querycite-customer.local";
  }
}

async function getCompanyProfile(userId: string, subscriptionId: string | null) {
  const byOwner = await selectSupabaseRows<CompanyProfileRow>("company_profiles", {
    select: "*",
    owner_user_id: `eq.${userId}`,
    limit: "1",
  });
  if (byOwner[0]) return byOwner[0];

  if (!subscriptionId) return null;
  const bySubscription = await selectSupabaseRows<CompanyProfileRow>("company_profiles", {
    select: "*",
    subscription_id: `eq.${subscriptionId}`,
    limit: "1",
  });
  return bySubscription[0] ?? null;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in to continue." }, { status: 401 });
  await syncAuthenticatedUser(user);
  const access = await getPaidAccessContextForUser(user);

  if (!access.verifiedPaidAccess) {
    return NextResponse.json({ error: "Verified paid access is required to load profile settings." }, { status: 403 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Profile storage is temporarily unavailable." }, { status: 503 });
  }

  const profile = await getCompanyProfile(user.id, access.subscriptionId);
  return NextResponse.json({ profile, email: access.email ?? user.email, planName: access.rawPlanName ?? access.planName });
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Please log in to continue." }, { status: 401 });
    await syncAuthenticatedUser(user);
    const access = await getPaidAccessContextForUser(user);

    if (!access.verifiedPaidAccess) {
      return NextResponse.json({ error: "Verified paid access is required to save profile settings." }, { status: 403 });
    }

    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: "Profile storage is temporarily unavailable." }, { status: 503 });
    }

    const body = (await request.json()) as ProfileRequest;
    const websiteUrl = normalizeWebsiteUrl(body.company_website || access.websiteUrl || "") || access.websiteUrl || "https://example.com";
    const now = new Date().toISOString();
    const row = {
      owner_user_id: user.id,
      email: access.email ?? user.email,
      subscription_id: access.subscriptionId,
      company_name: clean(body.company_name, 180) || null,
      contact_name: clean(body.name, 180) || user.name || null,
      role_designation: clean(body.role_designation, 180) || null,
      primary_domain: domainFromUrl(websiteUrl),
      website_url: websiteUrl,
      industry: clean(body.industry, 180) || null,
      company_size: clean(body.company_size, 80) || null,
      primary_market: clean(body.target_market, 180) || null,
      primary_product_service: clean(body.primary_product_service, 300) || null,
      target_audience: clean(body.target_audience, 300) || null,
      main_keywords: clean(body.main_keywords, 500) || null,
      primary_geography: clean(body.primary_geography, 180) || null,
      tone_of_voice: clean(body.tone_of_voice, 180) || null,
      updated_at: now,
    };

    const existing = await getCompanyProfile(user.id, access.subscriptionId);
    if (existing?.id) {
      const updated = await updateSupabaseRows("company_profiles", { id: `eq.${existing.id}` }, row);
      return NextResponse.json({ profile: updated[0] ?? { ...existing, ...row } });
    }

    const inserted = await insertSupabaseRow("company_profiles", {
      ...row,
      business_type: null,
      company_description: null,
      icp_customer_type: clean(body.target_audience, 300) || null,
      positioning_notes: null,
      created_at: now,
    });

    return NextResponse.json({ profile: inserted[0] ?? row });
  } catch (error) {
    console.error("Profile save failed", error);
    return NextResponse.json({ error: "Profile could not be saved right now." }, { status: 500 });
  }
}

