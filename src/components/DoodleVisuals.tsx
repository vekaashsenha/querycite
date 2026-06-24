type FeatureVisualKind = "audit" | "insight" | "intelligence" | "output";
type WorkflowVisualKind = "url" | "scan" | "fix";

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  strokeWidth: 2.4,
};

export function FeatureClusterVisual({ kind }: { kind: FeatureVisualKind }) {
  if (kind === "audit") {
    return (
      <div className="relative h-44 overflow-hidden rounded-2xl bg-violet-100/80 text-violet-800" aria-hidden="true">
        <svg viewBox="0 0 320 176" className="h-full w-full">
          <path d="M28 31c31-13 79-18 120-8" {...strokeProps} strokeDasharray="5 8" opacity=".45" />
          <rect x="34" y="36" width="252" height="112" rx="18" fill="white" stroke="currentColor" strokeWidth="2.4" />
          <path d="M34 65h252" {...strokeProps} opacity=".55" />
          <circle cx="54" cy="51" r="3.5" fill="currentColor" opacity=".35" />
          <circle cx="67" cy="51" r="3.5" fill="currentColor" opacity=".55" />
          <circle cx="80" cy="51" r="3.5" fill="currentColor" opacity=".8" />
          <circle cx="99" cy="105" r="27" fill="#ede9fe" stroke="currentColor" strokeWidth="3" />
          <path d="M99 78a27 27 0 0 1 23 41" {...strokeProps} strokeWidth="6" />
          <text x="99" y="111" textAnchor="middle" fontSize="18" fontWeight="700" fill="currentColor">78</text>
          <path d="M151 89h92M151 108h72M151 127h101" {...strokeProps} opacity=".28" />
          <path d="M151 89h68M151 108h46M151 127h82" {...strokeProps} strokeWidth="7" />
          <path d="M253 26c18 5 29 15 35 31" {...strokeProps} strokeDasharray="4 7" />
          <path d="m283 49 5 8 7-6" {...strokeProps} />
        </svg>
        <span className="absolute bottom-3 left-4 rounded-full border border-violet-200 bg-white/90 px-3 py-1 text-[11px] font-semibold text-violet-900">4 readiness signals</span>
      </div>
    );
  }

  if (kind === "insight") {
    return (
      <div className="relative h-44 overflow-hidden rounded-2xl bg-amber-100/80 text-amber-900" aria-hidden="true">
        <svg viewBox="0 0 320 176" className="h-full w-full">
          <path d="M46 25c48-15 105-10 146 1" {...strokeProps} strokeDasharray="4 8" opacity=".38" />
          <path d="M72 28h126l34 34v86H72z" fill="white" stroke="currentColor" strokeWidth="2.4" />
          <path d="M198 28v34h34M98 82h91M98 103h73M98 124h84" {...strokeProps} opacity=".32" />
          <path d="M98 82h58M98 103h45M98 124h67" {...strokeProps} strokeWidth="7" />
          <path d="m230 111 23-23 13 13-23 23-18 5z" fill="#fef3c7" stroke="currentColor" strokeWidth="2.4" />
          <path d="m252 89 8-8 13 13-8 8" {...strokeProps} />
          <path d="M245 42c17 3 29 12 36 27" {...strokeProps} strokeDasharray="4 7" />
          <path d="m277 61 4 8 8-5" {...strokeProps} />
        </svg>
        <span className="absolute bottom-3 left-4 rounded-full border border-amber-200 bg-white/90 px-3 py-1 text-[11px] font-semibold text-amber-950">Issue → fix → owner</span>
      </div>
    );
  }

  if (kind === "intelligence") {
    return (
      <div className="relative h-44 overflow-hidden rounded-2xl bg-cyan-100/80 text-cyan-900" aria-hidden="true">
        <svg viewBox="0 0 320 176" className="h-full w-full">
          <rect x="31" y="52" width="95" height="78" rx="15" fill="white" stroke="currentColor" strokeWidth="2.4" />
          <rect x="194" y="52" width="95" height="78" rx="15" fill="white" stroke="currentColor" strokeWidth="2.4" />
          <path d="M49 76h57M49 94h42M49 112h63M212 76h57M212 94h53M212 112h39" {...strokeProps} opacity=".35" />
          <path d="M135 77c16-13 34-13 49 0M184 105c-15 13-33 13-49 0" {...strokeProps} strokeDasharray="5 6" />
          <path d="m176 70 8 7-9 5M143 100l-8 5 8 7" {...strokeProps} />
          <path d="M113 29h92c9 0 16 7 16 16v8c0 9-7 16-16 16h-39l-16 12 3-12h-40c-9 0-16-7-16-16v-8c0-9 7-16 16-16z" fill="#ecfeff" stroke="currentColor" strokeWidth="2.4" />
          <circle cx="135" cy="49" r="3" fill="currentColor" /><circle cx="151" cy="49" r="3" fill="currentColor" /><circle cx="167" cy="49" r="3" fill="currentColor" />
          <path d="M232 142c22-4 38-13 49-28" {...strokeProps} strokeDasharray="4 7" opacity=".6" />
        </svg>
        <span className="absolute bottom-3 left-4 rounded-full border border-cyan-200 bg-white/90 px-3 py-1 text-[11px] font-semibold text-cyan-950">Compare, ask, prioritize</span>
      </div>
    );
  }

  return (
    <div className="relative h-44 overflow-hidden rounded-2xl bg-emerald-100/80 text-emerald-900" aria-hidden="true">
      <svg viewBox="0 0 320 176" className="h-full w-full">
        <path d="M43 36h112v104H43z" fill="white" stroke="currentColor" strokeWidth="2.4" />
        <path d="M64 63h69M64 82h52M64 101h65M64 120h43" {...strokeProps} opacity=".4" />
        <path d="M178 59h99v81h-99z" fill="#ecfdf5" stroke="currentColor" strokeWidth="2.4" />
        <path d="M199 84h57M199 103h41M199 122h50" {...strokeProps} opacity=".4" />
        <path d="M161 35v57" {...strokeProps} strokeDasharray="4 6" />
        <path d="m151 82 10 10 10-10" {...strokeProps} />
        <path d="M212 35c20 0 37 8 49 22" {...strokeProps} strokeDasharray="5 7" />
        <path d="m253 50 8 7-10 4" {...strokeProps} />
        <circle cx="278" cy="37" r="11" fill="white" stroke="currentColor" strokeWidth="2.4" />
        <path d="m273 37 4 4 7-8" {...strokeProps} />
      </svg>
      <span className="absolute bottom-3 left-4 rounded-full border border-emerald-200 bg-white/90 px-3 py-1 text-[11px] font-semibold text-emerald-950">Export-ready handoff</span>
    </div>
  );
}

export function WorkflowDoodle({ kind }: { kind: WorkflowVisualKind }) {
  if (kind === "url") {
    return (
      <svg viewBox="0 0 220 150" className="h-36 w-full text-violet-800" aria-hidden="true">
        <rect x="18" y="31" width="184" height="94" rx="18" fill="white" stroke="currentColor" strokeWidth="2.6" />
        <path d="M18 59h184" {...strokeProps} />
        <circle cx="37" cy="45" r="3" fill="currentColor" opacity=".4" /><circle cx="49" cy="45" r="3" fill="currentColor" opacity=".65" />
        <rect x="42" y="76" width="136" height="28" rx="12" fill="#ede9fe" stroke="currentColor" strokeWidth="2.2" />
        <path d="M60 90h80" {...strokeProps} opacity=".45" />
        <path d="M169 19c18 4 29 14 34 29" {...strokeProps} strokeDasharray="4 7" />
        <path d="m198 41 5 7 7-6" {...strokeProps} />
      </svg>
    );
  }

  if (kind === "scan") {
    return (
      <svg viewBox="0 0 220 150" className="h-36 w-full text-cyan-900" aria-hidden="true">
        <path d="M34 34h105v89H34z" fill="white" stroke="currentColor" strokeWidth="2.6" />
        <path d="M55 59h62M55 79h49M55 99h67" {...strokeProps} opacity=".38" />
        <circle cx="146" cy="87" r="30" fill="#cffafe" stroke="currentColor" strokeWidth="3" />
        <path d="m168 109 25 25" {...strokeProps} strokeWidth="7" />
        <path d="M147 72v30M132 87h30" {...strokeProps} />
        <path d="M65 23c28-10 59-9 82 0" {...strokeProps} strokeDasharray="4 8" opacity=".55" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 220 150" className="h-36 w-full text-emerald-900" aria-hidden="true">
      <path d="M42 26h113l27 27v77H42z" fill="white" stroke="currentColor" strokeWidth="2.6" />
      <path d="M155 26v27h27M66 69h72M66 89h59M66 109h76" {...strokeProps} opacity=".35" />
      <path d="m139 93 21-21 13 13-21 21-18 5z" fill="#d1fae5" stroke="currentColor" strokeWidth="2.4" />
      <path d="M31 112c13 10 28 15 45 15" {...strokeProps} strokeDasharray="4 7" />
      <path d="m68 121 8 6-8 6" {...strokeProps} />
      <path d="m185 27 4 9 10 1-8 7 3 10-9-5-9 5 3-10-8-7 10-1z" fill="#fef3c7" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function DoodleConnector({ direction = "horizontal" }: { direction?: "horizontal" | "vertical" }) {
  if (direction === "vertical") {
    return (
      <svg viewBox="0 0 40 70" className="h-14 w-8 text-slate-400" aria-hidden="true">
        <path d="M19 4c8 15-7 30 1 48" {...strokeProps} strokeDasharray="5 7" />
        <path d="m11 46 9 8 8-10" {...strokeProps} />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 90 40" className="h-10 w-16 text-slate-400 lg:w-20" aria-hidden="true">
      <path d="M4 21c22-13 48 11 70-3" {...strokeProps} strokeDasharray="5 7" />
      <path d="m68 10 8 8-9 7" {...strokeProps} />
    </svg>
  );
}
