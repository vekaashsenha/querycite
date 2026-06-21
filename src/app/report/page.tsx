import { ReportExperience } from "@/components/ReportExperience";
import { getPaidAccessContext } from "@/lib/paid-foundation";

type ReportPageProps = {
  searchParams?: Promise<{ demo?: string | string[]; reportId?: string | string[]; subscription_id?: string | string[] }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ReportPage({ searchParams }: ReportPageProps) {
  const params = searchParams ? await searchParams : {};
  const demoParam = params.demo;
  const isFullDemo = Array.isArray(demoParam) ? demoParam.includes("full") : demoParam === "full";
  const reportId = firstParam(params.reportId) ?? null;
  const subscriptionId = firstParam(params.subscription_id) ?? null;
  const paidAccess = subscriptionId ? await getPaidAccessContext(subscriptionId) : null;

  return <ReportExperience isFullDemo={isFullDemo} reportId={reportId} subscriptionId={subscriptionId} hasVerifiedFullAccess={Boolean(paidAccess?.verifiedPaidAccess)} paidPlanName={paidAccess?.planName ?? "free"} />;
}