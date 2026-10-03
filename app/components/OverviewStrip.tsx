"use client";

import { LineChart, Line, ResponsiveContainer } from "recharts";
import type { Indicator } from "@/lib/types";
import { visualFor, formatValue } from "@/lib/indicators";
import FlagBadge from "./FlagBadge";

function scrollToIndicator(key: string) {
  document.getElementById(`indicator-${key}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
}

export default function OverviewStrip({ indicators }: { indicators: Indicator[] }) {
  if (indicators.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {indicators.map((ind, i) => {
        const visual = visualFor(ind.key);
        const Icon = visual.icon;
        const sparkData = ind.history.slice(-20).map((r) => ({ value: r.value }));
        return (
          <button
            key={ind.key}
            onClick={() => scrollToIndicator(ind.key)}
            style={{ animationDelay: `${i * 50}ms` }}
            className={`flex animate-fadeInUp flex-col items-start rounded-xl border bg-hull-850/70 p-3 text-left transition hover:border-hull-500 ${
              ind.flagged ? "border-signal-rose/40" : "border-hull-700"
            }`}
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${visual.hex}20`, color: visual.hex }}>
                <Icon size={14} />
              </div>
              <FlagBadge flagged={ind.flagged} compact />
            </div>
            <p className="mt-2 truncate text-[11px] text-hull-400">{ind.label}</p>
            <p className="tabular text-lg font-semibold text-hull-100">
              {formatValue(ind.latest_value, "")}
              <span className="ml-1 text-xs font-normal text-hull-500">{ind.unit.split(" ")[0]}</span>
            </p>
            {sparkData.length > 1 && (
              <div className="mt-1 h-8 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparkData}>
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={visual.hex}
                      strokeWidth={1.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
