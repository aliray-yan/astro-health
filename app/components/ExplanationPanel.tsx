"use client";

import { X, Sparkles, Loader2, TriangleAlert } from "lucide-react";
import type { Flag, Explanation } from "@/lib/types";
import { urgencyCopy } from "@/lib/indicators";

interface ExplanationPanelProps {
  flag: Flag;
  explanation: Explanation | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

export default function ExplanationPanel({ flag, explanation, loading, error, onClose }: ExplanationPanelProps) {
  return (
    <div className="explanation-enter rounded-2xl border border-signal-teal/30 bg-hull-850 p-5 shadow-glow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-signal-teal">
          <Sparkles size={16} />
          <h3 className="text-sm font-semibold">
            {flag.label} — day {flag.day}
          </h3>
        </div>
        <button
          onClick={onClose}
          aria-label="Close explanation"
          className="rounded-md p-1 text-hull-400 hover:bg-hull-800 hover:text-hull-100"
        >
          <X size={16} />
        </button>
      </div>

      <p className="mt-1 text-xs text-hull-400">
        {flag.value.toFixed(2)} {flag.unit}
        {flag.expected_value !== null &&
          ` — personal baseline expected ${flag.expected_value.toFixed(2)} ${flag.unit}`}
        {flag.injected_anomaly && ` — simulated event: ${flag.injected_anomaly}`}
      </p>

      <div className="mt-4">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-hull-300">
            <Loader2 size={16} className="animate-spin" />
            Generating a plain-language explanation…
          </div>
        )}

        {!loading && error && (
          <div className="flex items-start gap-2 rounded-lg border border-signal-amber/30 bg-signal-amber/10 p-3 text-sm text-signal-amber">
            <TriangleAlert size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && explanation && (
          <div className="space-y-3">
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                urgencyCopy(explanation.urgency).className
              }`}
            >
              {urgencyCopy(explanation.urgency).label}
            </span>
            <p className="text-sm leading-relaxed text-hull-100">{explanation.explanation}</p>
            <div className="rounded-lg bg-hull-800/80 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-hull-400">Suggested action</p>
              <p className="mt-1 text-sm text-hull-200">{explanation.suggested_action}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
