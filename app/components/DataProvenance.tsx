"use client";

import { useState } from "react";
import { ChevronDown, Database, ExternalLink, CheckCircle2, Eye, XCircle } from "lucide-react";
import type { DataProvenance as DataProvenanceType, DatasetCitation } from "@/lib/types";

function DatasetRow({ d, icon, iconClass }: { d: DatasetCitation; icon: React.ReactNode; iconClass: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-hull-700 bg-hull-800/60 p-3">
      <div className={`mt-0.5 shrink-0 ${iconClass}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-hull-100">
          {d.dataset} — {d.title}
        </p>
        {d.used_for && <p className="mt-1 text-xs text-signal-teal">Used for: {d.used_for}</p>}
        {d.reason && <p className="mt-1 text-xs text-hull-400">{d.reason}</p>}
        {d.doi && (
          <a
            href={`https://doi.org/${d.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs text-hull-500 hover:text-signal-teal"
          >
            doi.org/{d.doi} <ExternalLink size={11} />
          </a>
        )}
      </div>
    </div>
  );
}

export default function DataProvenance({ provenance }: { provenance: DataProvenanceType | null }) {
  const [open, setOpen] = useState(false);
  if (!provenance) return null;
  const { citation, group_preflight_to_R1_pct_change } = provenance;

  return (
    <div className="rounded-2xl border border-hull-700 bg-hull-850/60 shadow-panel">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <Database size={18} className="text-signal-teal" />
          <div>
            <p className="text-sm font-semibold text-hull-100">Data sources — real NASA OSDR data</p>
            <p className="text-xs text-hull-400">
              {citation.integrated_datasets.length} dataset(s) calibrate this simulator · {citation.mission},{" "}
              {citation.mission_dates}
            </p>
          </div>
        </div>
        <ChevronDown size={18} className={`shrink-0 text-hull-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="space-y-5 border-t border-hull-700 p-4">
          <p className="text-sm leading-relaxed text-hull-300">{citation.note}</p>

          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-signal-teal">
              <CheckCircle2 size={13} /> Numerically integrated
            </h4>
            <div className="space-y-2">
              {citation.integrated_datasets.map((d) => (
                <DatasetRow key={d.dataset} d={d} icon={<CheckCircle2 size={15} />} iconClass="text-signal-teal" />
              ))}
            </div>
          </div>

          {citation.reviewed_not_integrated.length > 0 && (
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-signal-amber">
                <Eye size={13} /> Reviewed, not numerically integrated
              </h4>
              <div className="space-y-2">
                {citation.reviewed_not_integrated.map((d) => (
                  <DatasetRow key={d.dataset} d={d} icon={<Eye size={15} />} iconClass="text-signal-amber" />
                ))}
              </div>
            </div>
          )}

          {citation.related_not_obtained.length > 0 && (
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-hull-400">
                <XCircle size={13} /> Related studies, same mission, not obtained
              </h4>
              <div className="space-y-2">
                {citation.related_not_obtained.map((d) => (
                  <DatasetRow key={d.dataset} d={d} icon={<XCircle size={15} />} iconClass="text-hull-500" />
                ))}
              </div>
            </div>
          )}

          {Object.keys(group_preflight_to_R1_pct_change).length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-hull-400">
                Real observed preflight → immediate-postflight change (n=4 crew)
              </h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(group_preflight_to_R1_pct_change).map(([k, v]) => (
                  <span
                    key={k}
                    className="tabular rounded-full border border-hull-600 bg-hull-800 px-2.5 py-1 text-xs text-hull-300"
                  >
                    {k}: {v > 0 ? "+" : ""}
                    {v}%
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs text-hull-500">
                Illustrative only (n=4, one short mission) — not used as a trend source, only quoted here for
                context.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
