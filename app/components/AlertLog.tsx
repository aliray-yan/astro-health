"use client";

import { Sparkles, Zap, AlertTriangle } from "lucide-react";
import type { Flag } from "@/lib/types";
import { visualFor } from "@/lib/indicators";

export default function AlertLog({
  flags,
  onExplain,
  explainingDay,
}: {
  flags: Flag[];
  onExplain: (flag: Flag) => void;
  explainingDay: number | null;
}) {
  const sorted = [...flags].sort((a, b) => b.day - a.day);

  return (
    <div className="rounded-2xl border border-hull-700 bg-hull-850/70 shadow-panel">
      <div className="flex items-center justify-between border-b border-hull-700 p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-signal-rose" />
          <h3 className="text-sm font-semibold text-hull-100">Alert log</h3>
        </div>
        <span className="tabular rounded-full border border-hull-600 px-2 py-0.5 text-xs text-hull-400">
          {flags.length}
        </span>
      </div>

      {sorted.length === 0 ? (
        <p className="p-4 text-sm text-hull-500">
          No anomalies logged yet — advance the mission or use Inject anomaly to see one appear here.
        </p>
      ) : (
        <div className="max-h-80 divide-y divide-hull-800 overflow-y-auto overscroll-contain">
          {sorted.map((f) => {
            const visual = visualFor(f.indicator);
            return (
              <div key={`${f.indicator}-${f.day}`} className="flex items-center gap-3 p-3">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${visual.hex}20`, color: visual.hex }}
                >
                  <visual.icon size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-hull-100">{f.label}</p>
                  <p className="tabular text-xs text-hull-500">
                    day {f.day} · {f.value.toFixed(1)} {f.unit}
                    {f.injected_anomaly && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 text-signal-amber">
                        <Zap size={10} /> {f.injected_anomaly.replace(/_/g, " ")}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => onExplain(f)}
                  disabled={explainingDay === f.day}
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-hull-600 px-2.5 py-1.5 text-xs font-medium text-hull-300 transition hover:bg-hull-800 disabled:opacity-50"
                >
                  <Sparkles size={12} />
                  Explain
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
