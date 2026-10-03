"use client";

import { useState } from "react";
import { FastForward, Zap, RotateCcw, ChevronDown, Rocket, Play, Pause } from "lucide-react";
import type { MissionStatus, DataProfileOption } from "@/lib/types";

interface MissionControlsProps {
  status: MissionStatus | null;
  profiles: DataProfileOption[];
  busy: boolean;
  liveMode: boolean;
  onToggleLive: () => void;
  indicatorKeys: string[];
  indicatorLabels: Record<string, string>;
  onAdvance: (days: number) => void;
  onInjectAnomaly: (indicator: string | undefined) => void;
  onReset: (astronautName: string, dataProfile: string | null) => void;
}

export default function MissionControls({
  status,
  profiles,
  busy,
  liveMode,
  onToggleLive,
  indicatorKeys,
  indicatorLabels,
  onAdvance,
  onInjectAnomaly,
  onReset,
}: MissionControlsProps) {
  const [showReset, setShowReset] = useState(false);
  const [name, setName] = useState(status?.astronaut_name ?? "Commander Rayyan");
  const [profile, setProfile] = useState<string>(status?.data_profile ?? "");
  const [anomalyTarget, setAnomalyTarget] = useState<string>("");

  const baselineEstablished = status?.baseline_established ?? false;
  const day = status?.current_day ?? 0;
  const required = status?.baseline_days_required ?? 7;
  const manualDisabled = busy || liveMode;

  return (
    <div className="rounded-2xl border border-hull-700 bg-hull-850/80 p-5 shadow-panel">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-signal-teal/15 text-signal-teal">
            <Rocket size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-hull-100">
              {status?.astronaut_name ?? "No mission yet"}
            </p>
            <p className="tabular flex items-center gap-1.5 text-xs text-hull-400">
              {liveMode && <span className="h-1.5 w-1.5 animate-pulseSlow rounded-full bg-signal-teal" />}
              <span>
                Mission day {day}
                {liveMode && " · monitoring automatically…"}
                {!liveMode &&
                  !baselineEstablished &&
                  ` · personal baseline in ${Math.max(0, required - day)} more day(s)`}
                {!liveMode && baselineEstablished && " · baseline established"}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onToggleLive}
            disabled={busy}
            title={
              liveMode
                ? "Pause automatic monitoring"
                : "Let the system advance and watch itself — pauses and explains the moment it finds something"
            }
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-50 ${
              liveMode
                ? "bg-signal-rose/15 text-signal-rose hover:bg-signal-rose/25"
                : "bg-signal-teal text-hull-950 hover:brightness-110"
            }`}
          >
            {liveMode ? <Pause size={15} /> : <Play size={15} />}
            {liveMode ? "Pause monitoring" : "Start monitoring"}
          </button>

          <div className="h-6 w-px bg-hull-700" />

          <button
            onClick={() => onAdvance(1)}
            disabled={manualDisabled}
            title={liveMode ? "Pause live monitoring to step manually" : undefined}
            className="flex items-center gap-1.5 rounded-lg border border-hull-600 bg-hull-800 px-3 py-2 text-sm font-medium text-hull-100 transition hover:bg-hull-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FastForward size={15} />
            +1 day
          </button>
          <button
            onClick={() => onAdvance(7)}
            disabled={manualDisabled}
            title={liveMode ? "Pause live monitoring to step manually" : undefined}
            className="flex items-center gap-1.5 rounded-lg border border-hull-600 bg-hull-800 px-3 py-2 text-sm font-medium text-hull-100 transition hover:bg-hull-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FastForward size={15} />
            +7 days
          </button>

          <div className="flex items-center gap-1.5">
            <select
              value={anomalyTarget}
              onChange={(e) => setAnomalyTarget(e.target.value)}
              disabled={manualDisabled || !baselineEstablished}
              className="rounded-lg border border-hull-600 bg-hull-800 px-2 py-2 text-base text-hull-100 disabled:opacity-50 sm:text-sm"
              aria-label="Indicator to inject an anomaly into"
            >
              <option value="">Random indicator</option>
              {indicatorKeys.map((k) => (
                <option key={k} value={k}>
                  {indicatorLabels[k] ?? k}
                </option>
              ))}
            </select>
            <button
              onClick={() => onInjectAnomaly(anomalyTarget || undefined)}
              disabled={manualDisabled || !baselineEstablished}
              title={
                liveMode
                  ? "Pause live monitoring first"
                  : baselineEstablished
                    ? "Guarantee an anomaly right now, for precise demo timing"
                    : `Available once the personal baseline is established (day ${required}+)`
              }
              className="flex items-center gap-1.5 rounded-lg border border-signal-rose/30 bg-signal-rose/10 px-3 py-2 text-sm font-medium text-signal-rose transition hover:bg-signal-rose/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Zap size={15} />
              Inject anomaly
            </button>
          </div>

          <button
            onClick={() => setShowReset((v) => !v)}
            disabled={liveMode}
            className="flex items-center gap-1.5 rounded-lg border border-hull-600 px-3 py-2 text-sm font-medium text-hull-300 transition hover:bg-hull-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw size={15} />
            New mission
            <ChevronDown size={14} className={`transition-transform ${showReset ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {showReset && (
        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-hull-700 pt-4">
          <div>
            <label className="mb-1 block text-xs text-hull-400">Astronaut name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              enterKeyHint="done"
              autoComplete="off"
              className="w-48 rounded-lg border border-hull-600 bg-hull-800 px-3 py-2 text-base text-hull-100 sm:text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-hull-400">Real-data noise profile</label>
            <select
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              className="w-56 rounded-lg border border-hull-600 bg-hull-800 px-3 py-2 text-base text-hull-100 sm:text-sm"
            >
              <option value="">Literature average (no real-data profile)</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} — real Inspiration4 crew member
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => {
              onReset(name || "Commander Rayyan", profile || null);
              setShowReset(false);
            }}
            disabled={busy}
            className="rounded-lg bg-signal-teal px-4 py-2 text-sm font-semibold text-hull-950 transition hover:brightness-110 disabled:opacity-50"
          >
            Start new mission
          </button>
        </div>
      )}
    </div>
  );
}
