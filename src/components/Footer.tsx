"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const workspaceRoutes = ["/dashboard", "/reports", "/profile", "/billing", "/account"];

const groups = [
  { title: "Product", links: [["Product", "/#product"], ["How It Works", "/#how-it-works"], ["Pricing", "/pricing"], ["Integrations", "/integrations"]] },
  { title: "Company", links: [["Contact", "/contact"], ["Use Cases", "/use-cases"], ["Dashboard", "/dashboard"], ["Reports", "/reports"]] },
  { title: "Resources", links: [["Resources", "/resources"], ["Sample Report", "/report?demo=full"], ["AI Search Glossary", "/resources"], ["Launch Notes", "/resources"]] },
  {
    title: "Legal",
    links: [
      ["Privacy Policy", "/privacy"],
      ["Terms", "/terms"],
      ["Refund Policy", "/refund-policy"],
      ["Digital Delivery Policy", "/digital-delivery-policy"],
      ["Contact", "/contact"],
    ],
  },
];

function isWorkspacePath(pathname: string) {
  return workspaceRoutes.some((path) => pathname === path || pathname.startsWith(`${path}/`));
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
            Audit AI visibility, find AEO/GEO gaps, and turn report signals into clear content and technical actions.
          </p>
          <div className="mt-6 grid gap-2 text-sm font-semibold text-slate-300">
            <a href="mailto:hello@querycite.com" className="transition hover:text-white">hello@querycite.com</a>
            <a href="mailto:support@querycite.com" className="transition hover:text-white">support@querycite.com</a>
          </div>
          <p className="mt-6 max-w-sm rounded-2xl border border-white/10 bg-white/5 p-4 text-xs leading-5 text-slate-300">
            QueryCite is in beta. We are collecting feedback on report clarity, UI/UX, and paid beta access flow.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {groups.map((group) => (
            <div key={group.title}>
              <h2 className="text-sm font-semibold text-white">{group.title}</h2>
              <div className="mt-4 grid gap-3">
                {group.links.map(([label, href]) => (
                  <Link key={`${group.title}-${label}`} href={href} className="text-sm leading-5 text-slate-300 transition hover:text-white">
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10 px-5 py-5 text-center text-xs leading-5 text-slate-400">
        QueryCite improves AI visibility readiness. It does not guarantee rankings, traffic, revenue, or AI citations.
      </div>
    </footer>
  );
}
