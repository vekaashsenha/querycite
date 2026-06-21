export type EmailTemplate = {
  subject: string;
  html: string;
  text: string;
};

type LeadTemplateData = {
  name?: string | null;
  email?: string | null;
  company?: string | null;
  websiteUrl?: string | null;
  reportUrl?: string | null;
  marketingConsent?: boolean;
  source?: string | null;
};

type FeedbackTemplateData = {
  name?: string | null;
  email?: string | null;
  company?: string | null;
  websiteUrl?: string | null;
  message?: string | null;
  source?: string | null;
};

type PaymentTemplateData = {
  email?: string | null;
  planName?: string | null;
  subscriptionId?: string | null;
  paymentId?: string | null;
  status?: string | null;
  amount?: string | null;
  nextBillingDate?: string | null;
  reportUrl?: string | null;
  hasFullReportAccess?: boolean;
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function ctaButton(href: string | null | undefined, label: string) {
  if (!href) return "";
  return `<p style="margin:22px 0 8px;"><a href="${escapeHtml(href)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:999px;padding:13px 18px;font-size:14px;font-weight:700;">${escapeHtml(label)}</a></p>`;
}

function shell(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;color:#0f172a;"><div style="max-width:640px;margin:0 auto;padding:32px 20px;"><div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;padding:28px;"><p style="margin:0 0 12px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#6d28d9;font-weight:700;">QueryCite</p><h1 style="margin:0 0 16px;font-size:26px;line-height:1.2;">${escapeHtml(title)}</h1><div style="font-size:15px;line-height:1.7;color:#334155;">${body}</div></div><p style="margin:16px 0 0;font-size:12px;color:#64748b;">QueryCite helps brands audit AI visibility, find AEO/GEO gaps, and generate ready-to-use fixes.</p></div></body></html>`;
}

function textLines(lines: Array<string | null | undefined>) {
  return lines.filter(Boolean).join("\n");
}

export function leadCapturedUserTemplate(data: LeadTemplateData): EmailTemplate {
  const subject = "Your QueryCite AI Visibility Report";
  const title = "Your free AI Visibility Report is ready";
  const reportUrl = data.reportUrl ?? null;
  const html = shell(
    title,
    `<p>Hi ${escapeHtml(data.name || "there")},</p><p>Your free AI Visibility Report for <strong>${escapeHtml(data.websiteUrl || "your website")}</strong> is ready. You can view it online and download your limited PDF report.</p><p>This free report includes basic scores, top findings, and limited export options.</p>${ctaButton(reportUrl, "View & Download Free Report")}`,
  );
  const text = textLines([
    `Hi ${data.name || "there"},`,
    `Your free AI Visibility Report for ${data.websiteUrl || "your website"} is ready. You can view it online and download your limited PDF report.`,
    "This free report includes basic scores, top findings, and limited export options.",
    reportUrl ? `View & Download Free Report: ${reportUrl}` : null,
  ]);
  return { subject, html, text };
}

export function leadCapturedAdminTemplate(data: LeadTemplateData): EmailTemplate {
  const subject = "New QueryCite free audit lead";
  const title = "New free audit lead";
  const rows = [
    ["Name", data.name],
    ["Email", data.email],
    ["Company", data.company],
    ["Website", data.websiteUrl],
    ["Report URL", data.reportUrl],
    ["Marketing consent", data.marketingConsent ? "Yes" : "No"],
    ["Source", data.source],
  ];
  const html = shell(title, `<ul>${rows.map(([label, value]) => `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value || "-")}</li>`).join("")}</ul>`);
  const text = textLines(rows.map(([label, value]) => `${label}: ${value || "-"}`));
  return { subject, html, text };
}

export function feedbackReceivedUserTemplate(data: FeedbackTemplateData): EmailTemplate {
  const subject = "Thanks for your QueryCite feedback";
  const title = "Thanks for your feedback";
  const html = shell(title, `<p>Hi ${escapeHtml(data.name || "there")},</p><p>Thanks for sharing feedback with QueryCite. We have received your note and will review it as part of private beta improvements.</p>`);
  const text = textLines([`Hi ${data.name || "there"},`, "Thanks for sharing feedback with QueryCite. We have received your note and will review it as part of private beta improvements."]);
  return { subject, html, text };
}

export function feedbackReceivedAdminTemplate(data: FeedbackTemplateData): EmailTemplate {
  const subject = "New QueryCite feedback received";
  const title = "New feedback received";
  const rows = [
    ["Name", data.name],
    ["Email", data.email],
    ["Company", data.company],
    ["Website", data.websiteUrl],
    ["Source", data.source],
    ["Message", data.message],
  ];
  const html = shell(title, `<ul>${rows.map(([label, value]) => `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value || "-")}</li>`).join("")}</ul>`);
  const text = textLines(rows.map(([label, value]) => `${label}: ${value || "-"}`));
  return { subject, html, text };
}

export function paymentSuccessUserTemplate(data: PaymentTemplateData): EmailTemplate {
  const subject = "QueryCite payment received";
  const title = data.hasFullReportAccess ? "Your full report access is ready" : "Payment test received";
  const accessCopy = data.hasFullReportAccess
    ? "Your payment was verified for full report access. You can view the report online and download the full PDF when opening the protected report page."
    : "This payment test validates checkout, webhook, Supabase records, and email flow. It does not unlock long-term full report access.";
  const html = shell(title, `<p>${escapeHtml(accessCopy)}</p><p><strong>Plan:</strong> ${escapeHtml(data.planName || "-")}<br/><strong>Payment ID:</strong> ${escapeHtml(data.paymentId || "-")}</p>${data.hasFullReportAccess ? ctaButton(data.reportUrl, "View & Download Full Report") : ""}`);
  const text = textLines([
    accessCopy,
    `Plan: ${data.planName || "-"}`,
    `Payment ID: ${data.paymentId || "-"}`,
    data.hasFullReportAccess && data.reportUrl ? `View & Download Full Report: ${data.reportUrl}` : null,
  ]);
  return { subject, html, text };
}

export function paymentFailedUserTemplate(data: PaymentTemplateData): EmailTemplate {
  const subject = "QueryCite payment could not be completed";
  const title = "Payment could not be completed";
  const html = shell(title, `<p>A QueryCite payment event failed in test mode.</p><p><strong>Plan:</strong> ${escapeHtml(data.planName || "-")}<br/><strong>Status:</strong> ${escapeHtml(data.status || "failed")}</p><p>You can try again or contact QueryCite support.</p>`);
  const text = textLines(["A QueryCite payment event failed in test mode.", `Plan: ${data.planName || "-"}`, `Status: ${data.status || "failed"}`, "You can try again or contact QueryCite support."]);
  return { subject, html, text };
}

export function subscriptionActiveUserTemplate(data: PaymentTemplateData): EmailTemplate {
  const subject = "Your QueryCite subscription is active";
  const title = "Subscription test status is active";
  const html = shell(title, `<p>Your QueryCite subscription event was verified in test mode.</p><p><strong>Plan:</strong> ${escapeHtml(data.planName || "-")}<br/><strong>Subscription ID:</strong> ${escapeHtml(data.subscriptionId || "-")}<br/><strong>Next billing date:</strong> ${escapeHtml(data.nextBillingDate || "-")}</p>${ctaButton(data.reportUrl, "View & Download Full Report")}`);
  const text = textLines(["Your QueryCite subscription event was verified in test mode.", `Plan: ${data.planName || "-"}`, `Subscription ID: ${data.subscriptionId || "-"}`, `Next billing date: ${data.nextBillingDate || "-"}`, data.reportUrl ? `View & Download Full Report: ${data.reportUrl}` : null]);
  return { subject, html, text };
}

export function subscriptionStatusChangedUserTemplate(data: PaymentTemplateData): EmailTemplate {
  const subject = "Your QueryCite subscription status changed";
  const title = "Subscription status changed";
  const html = shell(title, `<p>Your QueryCite subscription status changed in test mode.</p><p><strong>Status:</strong> ${escapeHtml(data.status || "-")}<br/><strong>Plan:</strong> ${escapeHtml(data.planName || "-")}<br/><strong>Subscription ID:</strong> ${escapeHtml(data.subscriptionId || "-")}</p>`);
  const text = textLines(["Your QueryCite subscription status changed in test mode.", `Status: ${data.status || "-"}`, `Plan: ${data.planName || "-"}`, `Subscription ID: ${data.subscriptionId || "-"}`]);
  return { subject, html, text };
}