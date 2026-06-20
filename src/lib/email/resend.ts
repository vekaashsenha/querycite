export type ResendEmailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export function getEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const replyTo = process.env.EMAIL_REPLY_TO;
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;

  if (!apiKey || !from) return null;
  return { apiKey, from, replyTo, adminEmail };
}

export function getAdminNotificationEmail() {
  return process.env.ADMIN_NOTIFICATION_EMAIL || "hello@querycite.com";
}

export async function sendResendEmail(payload: ResendEmailPayload) {
  const config = getEmailConfig();
  if (!config) {
    return { skipped: true, id: null, error: "Resend environment variables are not configured." };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      reply_to: payload.replyTo || config.replyTo,
    }),
  });

  const data = (await response.json().catch(() => ({}))) as { id?: string; message?: string; error?: string };

  if (!response.ok) {
    return { skipped: false, id: null, error: data.message || data.error || "Resend email request failed." };
  }

  return { skipped: false, id: data.id ?? null, error: null };
}