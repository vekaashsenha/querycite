import Link from "next/link";
import { PolicyPage } from "@/components/PolicyPage";

export default function PrivacyPage() {
  return (
    <PolicyPage
      title="Privacy Policy"
      description="How QueryCite collects and uses the information needed to provide AI visibility audits, reports, account access, payments, and support."
      sections={[
        {
          title: "Information we collect",
          content: (
            <>
              <p>We may collect your name, email address, website URL, audit inputs, report data, account details, payment metadata, support messages, and product usage data.</p>
              <p>Audit and report data may include publicly available website content and technical signals submitted or generated during a QueryCite audit.</p>
            </>
          ),
        },
        {
          title: "How we use information",
          content: (
            <p>We use this information to generate and deliver reports, provide account access, send transactional or consented emails, process payments, respond to support requests, protect the service, and improve product clarity and performance.</p>
          ),
        },
        {
          title: "Service providers",
          content: (
            <p>QueryCite uses third-party processors including Supabase for data and authentication, Resend for email, Razorpay for payments, Gemini/Google AI for AI-assisted report guidance, and Vercel for hosting and delivery. Their handling of data is governed by their own terms and privacy practices.</p>
          ),
        },
        {
          title: "Payment information",
          content: (
            <p>QueryCite does not store your card number, UPI credentials, or bank account details. Razorpay processes payment credentials. We may retain payment IDs, order IDs, amount, currency, status, coupon metadata, and access dates for billing and support.</p>
          ),
        },
        {
          title: "Choices and contact",
          content: (
            <p>
              You may request access, correction, or deletion of applicable personal information, or ask a privacy question, by emailing{" "}
              <Link href="mailto:hello@querycite.com" className="font-semibold text-violet-700">hello@querycite.com</Link> or{" "}
              <Link href="mailto:support@querycite.com" className="font-semibold text-violet-700">support@querycite.com</Link>.
            </p>
          ),
        },
      ]}
    />
  );
}
