import Link from "next/link";

const groups = [
  { title: "Product", links: [["Product", "/#product"], ["How It Works", "/#how-it-works"], ["Pricing", "/pricing"], ["Integrations", "/integrations"]] },
  { title: "Use Cases", links: [["Use Cases", "/use-cases"], ["SaaS Brands", "/use-cases"], ["Agencies", "/use-cases"], ["SEO Teams", "/use-cases"]] },
  { title: "Resources", links: [["Resources", "/resources"], ["Report Preview", "/report"], ["AI Search Glossary", "/resources"], ["Templates", "/resources"]] },
  { title: "Company", links: [["Contact", "/contact"], ["Privacy Policy", "/privacy-policy"], ["Terms of Service", "/terms"]] },
];

const socialLinks = [
  { label: "LinkedIn", href: "https://example.com/linkedin", mark: "in" },
  { label: "X/Twitter", href: "https://example.com/twitter", mark: "X" },
  { label: "YouTube", href: "https://example.com/youtube", mark: "YT" },
];

export function Footer() {
  return (
    <footer className="border-t border-slate-900/10 bg-slate-950 text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.05fr_2fr]">
        <div>
          <Link href="/" className="flex items-center gap-3" aria-label="QueryCite home">
            <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 via-teal-400 to-amber-300 text-sm font-black text-slate-950">QC</span>
            <span className="text-lg font-semibold">QueryCite</span>
          </Link>
          <p className="mt-5 max-w-sm text-sm leading-6 text-slate-300">
            QueryCite helps brands audit AI visibility, find AEO/GEO gaps, and generate ready-to-use fixes for AI search readiness.
          </p>
          <div className="mt-7 flex items-center gap-3">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                aria-label={social.label}
                className="grid size-10 place-items-center rounded-full border border-white/15 bg-white/5 text-xs font-bold text-slate-100 transition hover:-translate-y-0.5 hover:border-white/35 hover:bg-white/10"
                target="_blank"
                rel="noreferrer"
              >
                {social.mark}
              </a>
            ))}
          </div>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {groups.map((group) => (
            <div key={group.title}>
              <h2 className="text-sm font-semibold text-white">{group.title}</h2>
              <div className="mt-4 grid gap-3">
                {group.links.map(([label, href]) => (
                  <Link key={label} href={href} className="text-sm leading-5 text-slate-300 transition hover:text-white">
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10 px-5 py-5 text-center text-xs leading-5 text-slate-400">
        AI search readiness guidance for teams improving citation clarity, answer coverage, and AEO/GEO gaps.
      </div>
    </footer>
  );
}
