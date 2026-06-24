import Link from "next/link";
import { PolicyPage } from "@/components/PolicyPage";

export default function TermsPage() {
  return (
    <PolicyPage
      title="Terms of Service"
      description="The terms that apply when you use QueryCite audits, reports, paid beta access, and AI-assisted recommendations."
      sections={[
        {
          title: "Service scope",
          content: (
            <p>QueryCite provides AI visibility readiness audits, AEO/GEO recommendations, report exports, competitor-gap workflows, and AI-assisted guidance for planning and implementation.</p>
          ),
        },
        {
          title: "No guaranteed outcomes",
          content: (
            <p>QueryCite does not guarantee rankings, traffic, revenue, AI citations, ChatGPT citations, or any search position. Results depend on many factors outside QueryCite&apos;s control, and recommendations should be reviewed before implementation.</p>
          ),
        },
        {
          title: "Paid beta and coupon access",
          content: (
            <p>Paid beta access begins only after successful payment confirmation. Coupon offers may be limited by cohort, time, redemption count, account, or email and may not be transferred, combined, or reused. Access duration and included usage limits are shown at checkout or in the applicable offer.</p>
          ),
        },
        {
          title: "Fair use",
          content: (
            <p>You may not abuse, disrupt, reverse engineer, resell without permission, automate excessive requests, bypass access controls, or use QueryCite for unlawful, deceptive, defamatory, or spam activity. We may restrict access to protect users and service reliability.</p>
          ),
        },
        {
          title: "Responsibility and liability",
          content: (
            <p>You are responsible for reviewing generated recommendations, structured data, website copy, and implementation notes. To the maximum extent permitted by law, QueryCite is not liable for indirect, incidental, special, consequential, or lost-profit damages arising from use of the service.</p>
          ),
        },
        {
          title: "Support",
          content: (
            <p>
              Questions about these terms may be sent to{" "}
              <Link href="mailto:hello@querycite.com" className="font-semibold text-violet-700">hello@querycite.com</Link> or through the{" "}
              <Link href="/contact" className="font-semibold text-violet-700">contact page</Link>.
            </p>
          ),
        },
      ]}
    />
  );
}
