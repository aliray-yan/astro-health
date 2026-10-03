"use client";

import type { Indicator } from "@/lib/types";
import { visualFor } from "@/lib/indicators";

function scrollToIndicator(key: string) {
  document.getElementById(`indicator-${key}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function regionFill(ind: Indicator | undefined): string {
  if (!ind) return "#1e2740";
  return ind.flagged ? visualFor(ind.key).hex : "#2c3654";
}

export default function HazardBodyMap({ indicators }: { indicators: Indicator[] }) {
  const byKey = Object.fromEntries(indicators.map((i) => [i.key, i]));
  const sleep = byKey["sleep"];
  const cardio = byKey["cardio_hr"];
  const bone = byKey["bone_density"];
  const radiation = byKey["radiation"];
  const immune = byKey["immune_risk"];

  const RegionButton = ({
    ind,
    children,
    label,
  }: {
    ind: Indicator | undefined;
    children: React.ReactNode;
    label: string;
  }) => (
    <g onClick={() => ind && scrollToIndicator(ind.key)} className={ind ? "cursor-pointer" : ""}>
      <title>
        {label}: {ind ? (ind.flagged ? "flagged" : "nominal") : "no data"}
      </title>
      <g className={ind?.flagged ? "animate-pulseSlow" : ""}>{children}</g>
    </g>
  );

  return (
    <div className="flex flex-col items-center rounded-2xl border border-hull-700 bg-hull-850/70 p-5 shadow-panel">
      <p className="mb-3 self-start text-xs font-semibold uppercase tracking-wide text-hull-400">Crew health map</p>
      <svg viewBox="0 0 260 300" width="100%" height="260" className="max-w-[220px]">
        {/* connecting leader lines for systemic (whole-body) indicators */}
        <line x1={58} y1={130} x2={95} y2={122} stroke="#2c3654" strokeWidth={1.5} />
        <line x1={202} y1={130} x2={165} y2={122} stroke="#2c3654" strokeWidth={1.5} />

        {/* legs (decorative, complete the silhouette) */}
        <rect x={98} y={210} width={24} height={82} rx={11} fill="#141a2b" />
        <rect x={138} y={210} width={24} height={82} rx={11} fill="#141a2b" />

        {/* hips / pelvis -> bone density */}
        <RegionButton ind={bone} label="Bone density">
          <rect x={95} y={168} width={70} height={44} rx={14} fill={regionFill(bone)} />
        </RegionButton>

        {/* arms (decorative) */}
        <rect x={62} y={78} width={18} height={80} rx={9} fill="#141a2b" />
        <rect x={180} y={78} width={18} height={80} rx={9} fill="#141a2b" />

        {/* torso -> cardiovascular */}
        <RegionButton ind={cardio} label="Cardiovascular">
          <rect x={90} y={72} width={80} height={98} rx={18} fill={regionFill(cardio)} />
        </RegionButton>

        {/* head -> sleep */}
        <RegionButton ind={sleep} label="Sleep">
          <circle cx={130} cy={40} r={26} fill={regionFill(sleep)} />
        </RegionButton>

        {/* systemic badges */}
        <RegionButton ind={radiation} label="Radiation (whole-body)">
          <circle cx={40} cy={130} r={18} fill={regionFill(radiation)} stroke="#1e2740" strokeWidth={1.5} />
        </RegionButton>
        <RegionButton ind={immune} label="Immune (whole-body)">
          <circle cx={220} cy={130} r={18} fill={regionFill(immune)} stroke="#1e2740" strokeWidth={1.5} />
        </RegionButton>
      </svg>

      <div className="mt-3 grid w-full grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] text-hull-400 sm:grid-cols-3">
        {[
          { label: "Sleep", ind: sleep },
          { label: "Cardiovascular", ind: cardio },
          { label: "Bone density", ind: bone },
          { label: "Radiation", ind: radiation },
          { label: "Immune", ind: immune },
        ].map(({ label, ind }) => (
          <button
            key={label}
            onClick={() => ind && scrollToIndicator(ind.key)}
            className="flex items-center gap-1.5 text-left hover:text-hull-200"
          >
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: ind ? regionFill(ind) : "#1e2740" }}
            />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
