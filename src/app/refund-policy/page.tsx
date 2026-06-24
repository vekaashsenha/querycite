import Link from "next/link";
import { PolicyPage } from "@/components/PolicyPage";

export default function RefundPolicyPage() {
  return (
    <PolicyPage
      title="Refund Policy"
      description="QueryCite is a digital SaaS and report product. This policy explains the limited cases in which a payment may be refunded."
      sections={[
        {
          title: "Eligible refund cases",
          content: (
            <p>Refunds may be considered for a duplicate payment, a technical failure where paid access was not provided, or an incorrect charge. Change-of-mind requests or dissatisfaction with rankings, traffic, revenue, or citation outcomes are not eligible because those outcomes are not guaranteed.</p>
          ),
        },
        {
          title: "Request window",
          content: (
            <p>Submit your request within 7 days of the charge. Include the payment ID, account email, amount, and a short description of the issue so the payment and access record can be reviewed.</p>
          ),
        },
        {
          title: "Processing time",
          content: (
            <p>Approved refunds are returned to the original payment method. They are usually processed in 5–7 business days, although the final posting time depends on your bank or payment provider.</p>
          ),
        },
        {
          title: "Contact billing",
          content: (
            <p>
              Send refund requests to{" "}
              <Link href="mailto:billing@querycite.com" className="font-semibold text-violet-700">billing@querycite.com</Link> or{" "}
              <Link href="mailto:hello@querycite.com" className="font-semibold text-violet-700">hello@querycite.com</Link>.
            </p>
          ),
        },
      ]}
    />
  );
}
