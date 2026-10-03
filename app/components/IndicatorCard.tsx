"use client";

import { Sparkles } from "lucide-react";
import type { Indicator, Flag } from "@/lib/types";
import { visualFor, formatValue } from "@/lib/indicators";
import TrendChart from "./TrendChart";
import FlagBadge from "./FlagBadge";

interface IndicatorCardProps {
  indicator: Indicator;
  flag: Flag | null;
  onExplain: (flag: Flag) => void;
  explainLoading: boolean;
}

export default function IndicatorCard({ indicator, flag, onExplain, explainLoading }: IndicatorCardProps) {
  const visual = visualFor(indicator.key);
  const Icon = visual.icon;
  const canExplain = indicator.flagged && flag !== null;

  return (
    <div
      id={`indicator-${indicator.key}`}
      className={`scroll-mt-24 rounded-2xl border bg-hull-850/80 p-5 shadow-panel transition-colors ${
        indicator.flagged ? "border-signal-rose/40" : "border-hull-700"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${visual.hex}20`, color: visual.hex }}
          >
            <Icon size={20} strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-hull-100">{indicator.label}</h3>
            <p className="text-xs text-hull-400">{indicator.hazard_short}</p>
          </div>
        </div>
        <FlagBadge flagged={indicator.flagged} />
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="tabular text-3xl font-semibold text-hull-100">
          {formatValue(indicator.latest_value, "")}
        </span>
        <span className="text-sm text-hull-400">{indicator.unit}</span>
        {indicator.latest_day !== null && (
          <span className="ml-auto text-xs text-hull-500">day {indicator.latest_day}</span>
        )}
      </div>

      <div className="mt-3">
        <TrendChart history={indicator.history} unit={indicator.unit} color={visual.hex} />
      </div>

      {!indicator.baseline_established && (
        <p className="mt-2 text-xs text-hull-500">
          Personal baseline still establishing — detection activates once enough days are logged.
        </p>
      )}

      {indicator.context_limit !== null && (
        <p className="mt-2 text-xs text-hull-500">{indicator.context_limit_label}</p>
      )}

      {canExplain && (
        <button
          onClick={() => onExplain(flag!)}
          disabled={explainLoading}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-signal-rose/30 bg-signal-rose/10 px-3 py-2 text-sm font-medium text-signal-rose transition hover:bg-signal-rose/20 disabled:cursor-wait disabled:opacity-60"
        >
          <Sparkles size={15} />
          {explainLoading ? "Asking flight surgeon…" : "Explain this flag"}
        </button>
      )}
    </div>
  );
}
