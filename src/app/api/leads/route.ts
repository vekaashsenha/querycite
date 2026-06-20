import { NextResponse } from "next/server";
import { insertSupabaseRow, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getAdminNotificationEmail } from "@/lib/email/resend";
import { leadCapturedAdminTemplate, leadCapturedUserTemplate } from "@/lib/email/templates";
import { sendTransactionalEmail } from "@/lib/email/sendTransactionalEmail";
import { normalizeWebsiteUrl } from "@/lib/url";

export const runtime = "nodejs";

type LeadRequest = {
  fullName?: string;
  email?: string;
  companyName?: string;
  role?: string;
  websiteUrl?: string;
  auditUrl?: string;
  source?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  privacyTermsAccepted?: boolean;
  marketingConsent?: boolean;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function compactText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LeadRequest;
    const fullName = compactText(body.fullName);
    const email = compactText(body.email).toLowerCase();
    const companyName = compactText(body.companyName);
    const role = compactText(body.role);
    const websiteUrl = normalizeWebsiteUrl(body.websiteUrl ?? "");
    const auditUrl = normalizeWebsiteUrl(body.auditUrl ?? body.websiteUrl ?? "");

    if (!fullName) {
      return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
    }

    if (!emailPattern.test(email)) {
      return NextResponse.json({ error: "Please enter a valid work email." }, { status: 400 });
    }

    if (!body.privacyTermsAccepted) {
      return NextResponse.json({ error: "Please accept the Privacy Policy and Terms of Use to view your report." }, { status: 400 });
    }

    if (!websiteUrl) {
      return NextResponse.json({ error: "Please enter a valid website, for example byldgroup.com" }, { status: 400 });
    }

    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: "Lead capture is temporarily unavailable. Please contact hello@querycite.com." }, { status: 503 });
    }

    const now = new Date().toISOString();
    const userAgent = request.headers.get("user-agent") ?? null;

    const rows = await insertSupabaseRow("leads", {
      full_name: fullName,
      email,
      company_name: companyName || null,
      role: role || null,
      website_url: websiteUrl,
      audit_url: auditUrl,
      source: compactText(body.source) || "free_audit_gate",
      utm_source: compactText(body.utmSource) || null,
      utm_medium: compactText(body.utmMedium) || null,
      utm_campaign: compactText(body.utmCampaign) || null,
      privacy_terms_accepted: true,
      marketing_consent: Boolean(body.marketingConsent),
      consent_timestamp: now,
      user_agent: userAgent,
    });
    const leadId = typeof rows[0]?.id === "string" ? rows[0].id : null;
    const templateData = {
      name: fullName,
      email,
      company: companyName,
      websiteUrl,
      marketingConsent: Boolean(body.marketingConsent),
      source: compactText(body.source) || "free_audit_gate",
    };
    const userEmail = leadCapturedUserTemplate(templateData);
    const adminEmail = leadCapturedAdminTemplate(templateData);

    await Promise.allSettled([
      sendTransactionalEmail({
        to: email,
        type: "lead_captured_user",
        relatedEntityType: "lead",
        relatedEntityId: leadId,
        ...userEmail,
      }),
      sendTransactionalEmail({
        to: getAdminNotificationEmail(),
        type: "lead_captured_admin",
        relatedEntityType: "lead",
        relatedEntityId: leadId,
        ...adminEmail,
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Lead capture failed", error);
    return NextResponse.json({ error: "We could not save your details right now. Please try again or contact hello@querycite.com." }, { status: 500 });
  }
}