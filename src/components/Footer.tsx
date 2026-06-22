"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const workspaceRoutes = ["/dashboard", "/reports", "/profile", "/billing", "/account"];

const groups = [
  { title: "Product", links: [["Product", "/#product"], ["How It Works", "/#how-it-works"], ["Pricing", "/pricing"], ["Integrations", "/integrations"]] },
  { title: "Company", links: [["Contact", "/contact"], ["Use Cases", "/use-cases"], ["Dashboard", "/dashboard"], ["Reports", "/reports"]] },
  { title: "Resources", links: [["Resources", "/resources"], ["Sample Report", "/report?demo=full"], ["AI Search Glossary", "/resources"], ["Launch Notes", "/resources"]] },
  { title: "Legal", links: [["Privacy Policy", "/privacy-policy"], ["Terms of Service", "/terms"]] },
];

const socialLinks = [
  { label: "LinkedIn", href: "https://example.com/linkedin", icon: "linkedin" },
  { label: "X/Twitter", href: "https://example.com/twitter", icon: "x" },
  { label: "YouTube", href: "https://example.com/youtube", icon: "youtube" },
];

function isWorkspacePath(pathname: string) {
  return workspaceRoutes.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function SocialIcon({ icon }: { icon: string }) {
  if (icon === "linkedin") {
    return (
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6.5 10v8" /><path d="M6.5 6.5v.1" /><path d="M11 18v-8" /><path d="M11 13.5c0-2.2 1.3-3.7 3.3-3.7 1.9 0 3.2 1.3 3.2 3.8V18" />
      </svg>
    );
  }
  if (icon === "youtube") {
    return (
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="7" width="18" height="10" rx="3" /><path d="m10 10 5 2-5 2v-4Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 5 14 14" /><path d="M19 5 5 19" />
    </svg>
  );
}

export function Footer() {
  const pathname = usePathname();
  if (isWorkspacePath(pathname)) return null;

  return (
    <footer className="border-t border-slate-900/10 bg-slate-950 text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.05fr_2fr]">
        <div>
          <Link href="/" className="flex items-center gap-3" aria-label="QueryCite home">
            <span className="grid size-11 place-items-center rounded-2xl bg-white text-sm font-black text-slate-950">QC</span>
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
                className="grid size-10 place-items-center rounded-full border border-white/15 bg-white/5 text-slate-100 transition hover:-translate-y-0.5 hover:border-white/35 hover:bg-white/10"
                target="_blank"
                rel="noreferrer"
              >
                <SocialIcon icon={social.icon} />
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
        QueryCite improves AI visibility readiness. It does not guarantee rankings, traffic, or AI citations.
      </div>
    </footer>
  );
}