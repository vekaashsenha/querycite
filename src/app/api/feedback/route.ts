import { NextResponse } from "next/server";
import { insertSupabaseRow, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getAdminNotificationEmail } from "@/lib/email/resend";
import { feedbackReceivedAdminTemplate, feedbackReceivedUserTemplate } from "@/lib/email/templates";
import { sendTransactionalEmail } from "@/lib/email/sendTransactionalEmail";

export const runtime = "nodejs";

const fallbackEmail = "hello@querycite.com";

type FeedbackRequest = {
  name?: string;
  email?: string;
  company?: string;
  website_url?: string;
  message?: string;
  source?: string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FeedbackRequest;
    const name = clean(body.name);
    const workEmail = clean(body.email);
    const company = clean(body.company);
    const websiteUrl = clean(body.website_url);
    const message = clean(body.message);
    const sourcePage = clean(body.source) || "contact_page";

    if (!workEmail || !isValidEmail(workEmail) || !message) {
      return NextResponse.json({ error: `We could not submit your feedback right now. Please email ${fallbackEmail}.` }, { status: 400 });
    }

    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: `We could not submit your feedback right now. Please email ${fallbackEmail}.`, fallbackEmail }, { status: 503 });
    }

    const rows = await insertSupabaseRow("feedback", {
      name: name || null,
      work_email: workEmail,
      company: company || null,
      website_url: websiteUrl || null,
      message,
      source_page: sourcePage,
      feedback_type: "private_beta",
      status: "received",
    });
    const feedbackId = typeof rows[0]?.id === "string" ? rows[0].id : null;
    const templateData = { name, email: workEmail, company, websiteUrl, message, source: sourcePage };
    const userEmail = feedbackReceivedUserTemplate(templateData);
    const adminEmail = feedbackReceivedAdminTemplate(templateData);

    await Promise.allSettled([
      sendTransactionalEmail({
        to: workEmail,
        type: "feedback_received_user",
        relatedEntityType: "feedback",
        relatedEntityId: feedbackId,
        ...userEmail,
      }),
      sendTransactionalEmail({
        to: getAdminNotificationEmail(),
        type: "feedback_received_admin",
        relatedEntityType: "feedback",
        relatedEntityId: feedbackId,
        ...adminEmail,
      }),
    ]);

    return NextResponse.json({ ok: true, message: "Thanks. Your feedback has been received.", feedbackId });
  } catch (error) {
    console.error("Feedback submission failed", error);
    return NextResponse.json({ error: `We could not submit your feedback right now. Please email ${fallbackEmail}.`, fallbackEmail }, { status: 500 });
  }
}