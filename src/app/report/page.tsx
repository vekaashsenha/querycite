import { ReportExperience } from "@/components/ReportExperience";
import { getCurrentUser, syncAuthenticatedUser } from "@/lib/auth/server";
import { getPaidAccessContextForUser } from "@/lib/paid-foundation";

type ReportPageProps = {
  searchParams?: Promise<{ demo?: string | string[]; reportId?: string | string[] }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ReportPage({ searchParams }: ReportPageProps) {
  const params = searchParams ? await searchParams : {};
  const demoParam = params.demo;
  const isFullDemo = Array.isArray(demoParam) ? demoParam.includes("full") : demoParam === "full";
  const reportId = firstParam(params.reportId) ?? null;
  const user = await getCurrentUser();
  const paidAccess = user ? await getPaidAccessContextForUser(user) : null;

  if (user) {
    await syncAuthenticatedUser(user);
  }

  return <ReportExperience isFullDemo={isFullDemo} reportId={reportId} subscriptionId={paidAccess?.subscriptionId ?? null} hasVerifiedFullAccess={Boolean(paidAccess?.verifiedPaidAccess)} isAdminPreview={Boolean(paidAccess?.qaAccess)} paidPlanName={paidAccess?.planName ?? "free"} />;
}
