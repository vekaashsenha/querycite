import { NextResponse } from "next/server";
import { getCurrentUser, syncAuthenticatedUser } from "@/lib/auth/server";
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
  reportId?: string;
  source?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  privacyTermsAccepted?: boolean;
  marketingConsent?: boolean;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const transientSchemaErrorPattern = /column|schema cache|foreign key|violates|constraint|relationship|not found/i;

function compactText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function getAppBaseUrl(request: Request) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configuredUrl) return configuredUrl;

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") || "https";
  return host ? `${protocol}://${host}` : "http://localhost:3000";
}

function buildReportUrl(request: Request, reportId: string) {
  return `${getAppBaseUrl(request)}/report?reportId=${encodeURIComponent(reportId)}`;
}

function safeLeadLog(label: string, payload: Record<string, unknown>) {
  console.error(`[QueryCite leads] ${label}`, payload);
}

function safeErrorSummary(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown lead capture error.";
  return message
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}/gi, "[uuid]")
    .slice(0, 500);
}

async function insertLeadWithSchemaFallback(table: string, fullPayload: Record<string, unknown>, basePayload: Record<string, unknown>) {
  try {
    return await insertSupabaseRow(table, fullPayload);
  } catch (error) {
    const reason = safeErrorSummary(error);
    const canRetry = transientSchemaErrorPattern.test(reason);
    safeLeadLog("full_insert_failed", {
      reason,
      hasUserId: Boolean(fullPayload.user_id),
      hasReportId: Boolean(fullPayload.report_id),
      usedFallback: canRetry,
    });

    if (!canRetry) {
      throw error;
    }

    return insertSupabaseRow(table, basePayload);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (user) await syncAuthenticatedUser(user);
    const body = (await request.json()) as LeadRequest;
    const fullName = compactText(body.fullName);
    const email = compactText(body.email).toLowerCase();
    const companyName = compactText(body.companyName);
    const role = compactText(body.role);
    const websiteUrl = normalizeWebsiteUrl(body.websiteUrl ?? "");
    const auditUrl = normalizeWebsiteUrl(body.auditUrl ?? body.websiteUrl ?? "");
    const reportId = uuidPattern.test(compactText(body.reportId)) ? compactText(body.reportId) : null;
    const reportUrl = reportId ? buildReportUrl(request, reportId) : `${getAppBaseUrl(request)}/report`;

    if (!fullName) {
      return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
    }

    if (!emailPattern.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
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

    const baseLeadPayload = {
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
    };

    const rows = await insertLeadWithSchemaFallback("leads", {
      ...baseLeadPayload,
      user_id: user?.id ?? null,
      report_id: reportId,
    }, baseLeadPayload);
    const leadId = typeof rows[0]?.id === "string" ? rows[0].id : null;
    const templateData = {
      name: fullName,
      email,
      company: companyName,
      websiteUrl,
      reportUrl,
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
    safeLeadLog("request_failed", { reason: safeErrorSummary(error) });
    return NextResponse.json({ error: "We could not save your details right now. Please try again or contact hello@querycite.com." }, { status: 500 });
  }
}