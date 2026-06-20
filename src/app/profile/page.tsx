import { ClayCard, PageIntro, StatusPill } from "@/components/ui";

const fields = [
  "User details",
  "Company profile",
  "Primary website",
  "Industry",
  "Business type",
  "Primary market",
  "Company description",
  "Primary product/service",
  "ICP/customer type",
];

export default function ProfilePage() {
  return (
    <main className="px-5 py-14 sm:px-8">
      <PageIntro
        eyebrow="Profile foundation"
        title="Company context for better AI visibility reports"
        description="Login will be required to save profile details during private beta. These fields are prepared for the Supabase profile and company tables."
      />
      <section className="mx-auto mt-10 max-w-4xl">
        <ClayCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-slate-950">Profile details</h2>
            <StatusPill tone="amber">Login required to save</StatusPill>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {fields.map((field) => (
              <label key={field} className="grid gap-2 text-sm font-semibold text-slate-700">
                {field}
                <input disabled placeholder="Available after beta login is enabled" className="min-h-12 rounded-2xl border border-slate-200 bg-slate-100 px-4 text-sm text-slate-500" />
              </label>
            ))}
          </div>
        </ClayCard>
      </section>
    </main>
  );
}