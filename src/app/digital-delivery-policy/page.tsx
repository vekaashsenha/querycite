import Link from "next/link";
import { PolicyPage } from "@/components/PolicyPage";

export default function DigitalDeliveryPolicyPage() {
  return (
    <PolicyPage
      title="Digital Delivery Policy"
      description="QueryCite delivers digital reports and SaaS access. No physical products are shipped."
      sections={[
        {
          title: "No physical shipping",
          content: (
            <p>QueryCite is a digital service. There are no physical goods, shipping fees, courier deliveries, or physical delivery addresses associated with QueryCite purchases.</p>
          ),
        },
        {
          title: "Free report delivery",
          content: (
            <p>Your free report becomes available after the website audit and required lead submission are completed. The report may also be delivered through a report-specific link sent to the submitted email address.</p>
          ),
        },
        {
          title: "Paid beta activation",
          content: (
            <p>Paid beta access is activated after Razorpay confirms the payment and QueryCite receives a successful payment capture or webhook event. IIMA coupon access is valid for 1 month after successful payment capture.</p>
          ),
        },
        {
          title: "Delivery timing",
          content: (
            <p>Digital delivery is usually instant, but payment confirmation and account synchronization may take a few minutes. Razorpay&apos;s confirmed payment status remains the source of truth for paid access.</p>
          ),
        },
        {
          title: "Delivery support",
          content: (
            <p>
              If access is not visible after payment, email{" "}
              <Link href="mailto:support@querycite.com" className="font-semibold text-violet-700">support@querycite.com</Link> with your payment ID and account email.
            </p>
          ),
        },
      ]}
    />
  );
}
