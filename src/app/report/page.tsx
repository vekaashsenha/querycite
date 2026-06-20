import { ReportExperience } from "@/components/ReportExperience";

type ReportPageProps = {
  searchParams?: Promise<{ demo?: string | string[] }>;
};

export default async function ReportPage({ searchParams }: ReportPageProps) {
  const params = searchParams ? await searchParams : {};
  const demoParam = params.demo;
  const isFullDemo = Array.isArray(demoParam) ? demoParam.includes("full") : demoParam === "full";

  return <ReportExperience isFullDemo={isFullDemo} />;
}
