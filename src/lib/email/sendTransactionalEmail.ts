import { insertSupabaseRow, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { sendResendEmail } from "@/lib/email/resend";

export type TransactionalEmailType =
  | "lead_captured_user"
  | "lead_captured_admin"
  | "feedback_received_user"
  | "feedback_received_admin"
  | "payment_success_user"
  | "payment_failed_user"
  | "subscription_active_user"
  | "subscription_status_changed_user";

export type SendTransactionalEmailInput = {
  to: string | string[];
  type: TransactionalEmailType;
  subject: string;
  html: string;
  text?: string;
  relatedEntityType?: string;
  relatedEntityId?: string | null;
};

async function logEmailEvent(input: SendTransactionalEmailInput, status: string, providerMessageId: string | null, errorMessage: string | null) {
  if (!isSupabaseAdminConfigured()) return;

  try {
    await insertSupabaseRow("email_events", {
      recipient_email: Array.isArray(input.to) ? input.to.join(",") : input.to,
      email_type: input.type,
      subject: input.subject,
      status,
      provider_message_id: providerMessageId,
      error_message: errorMessage,
      related_entity_type: input.relatedEntityType || null,
      related_entity_id: input.relatedEntityId || null,
    });
  } catch (error) {
    console.error("Email event logging failed", error);
  }
}

export async function sendTransactionalEmail(input: SendTransactionalEmailInput) {
  try {
    const result = await sendResendEmail({
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    if (result.skipped) {
      await logEmailEvent(input, "skipped", null, result.error);
      return result;
    }

    if (result.error) {
      await logEmailEvent(input, "failed", null, result.error);
      console.error("Transactional email failed", result.error);
      return result;
    }

    await logEmailEvent(input, "sent", result.id, null);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transactional email failed.";
    await logEmailEvent(input, "failed", null, message);
    console.error("Transactional email failed", error);
    return { skipped: false, id: null, error: message };
  }
}