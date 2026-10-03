"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertOctagon, Info } from "lucide-react";
import type {
  Indicator,
  Flag,
  MissionStatus,
  DataProvenance as DataProvenanceType,
  Explanation,
  AdvanceResult,
  InjectAnomalyResult,
} from "@/lib/types";
import TopBar from "./components/TopBar";
import Sidebar from "./components/Sidebar";
import MissionControls from "./components/MissionControls";
import OverviewStrip from "./components/OverviewStrip";
import HazardBodyMap from "./components/HazardBodyMap";
import IndicatorCard from "./components/IndicatorCard";
import AlertLog from "./components/AlertLog";
import DataProvenance from "./components/DataProvenance";
import ExplanationPanel from "./components/ExplanationPanel";

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error || `Request to ${url} failed (${res.status})`);
  return body as T;
}

export default function DashboardPage() {
  const [status, setStatus] = useState<MissionStatus | null>(null);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [provenance, setProvenance] = useState<DataProvenanceType | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(true);
  const [navOpen, setNavOpen] = useState(false);

  const [selectedFlag, setSelectedFlag] = useState<Flag | null>(null);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);

  const [liveMode, setLiveMode] = useState(false);
  // Ref mirror of `flags` so liveTick always compares against the latest
  // value without needing `flags` in its own dependency array (which would
  // tear down and rebuild the interval on every tick).
  const flagsRef = useRef<Flag[]>([]);
  useEffect(() => {
    flagsRef.current = flags;
  }, [flags]);

  const refresh = useCallback(async () => {
    const [s, i, f] = await Promise.all([
      getJson<MissionStatus>("/api/mission/status"),
      getJson<Indicator[]>("/api/indicators"),
      getJson<Flag[]>("/api/flags"),
    ]);
    setStatus(s);
    setIndicators(i);
    setFlags(f);
    setConnected(true);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await refresh();
        const p = await getJson<DataProvenanceType>("/api/data-provenance");
        setProvenance(p);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load mission data.");
        setConnected(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  // Runs after React actually commits the explanation panel to the DOM
  // (state setters in handleExplain are async, so scrolling from inside
  // that handler would run before the panel exists on a first click).
  useEffect(() => {
    if (selectedFlag) {
      document.getElementById("explanation")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedFlag]);

  const runAction = useCallback(
    async (action: () => Promise<AdvanceResult | InjectAnomalyResult | { status: string }>) => {
      setBusy(true);
      setError(null);
      try {
        await action();
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed.");
        setConnected(false);
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const handleAdvance = (days: number) =>
    runAction(() =>
      getJson<AdvanceResult>("/api/mission/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      }),
    );

  const handleInjectAnomaly = (indicator: string | undefined) =>
    runAction(() =>
      getJson<InjectAnomalyResult>("/api/mission/inject-anomaly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ indicator: indicator ?? null }),
      }),
    );

  const handleReset = (astronaut_name: string, data_profile: string | null) => {
    setSelectedFlag(null);
    setExplanation(null);
    return runAction(() =>
      getJson<{ status: string }>("/api/mission/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ astronaut_name, data_profile }),
      }),
    );
  };

  const handleExplain = useCallback(async (flag: Flag) => {
    setSelectedFlag(flag);
    setExplanation(null);
    setExplainError(null);
    setExplainLoading(true);
    try {
      const result = await getJson<Explanation>("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          indicator: flag.indicator,
          label: flag.label,
          hazard: flag.hazard,
          day: flag.day,
          value: flag.value,
          unit: flag.unit,
          expected_value: flag.expected_value,
          injected_anomaly: flag.injected_anomaly,
        }),
      });
      setExplanation(result);
    } catch (e) {
      setExplainError(e instanceof Error ? e.message : "Couldn't generate an explanation.");
    } finally {
      setExplainLoading(false);
    }
  }, []);

  // One autonomous step of "live monitoring": advance the mission by a day,
  // the way a real continuous sensor feed would on its own, then check
  // whether that step surfaced something new. If it did, stop on its own
  // and explain it — the point is a system that watches itself, not one
  // that needs a human driving every click.
  const tickingRef = useRef(false);
  const liveTick = useCallback(async () => {
    if (tickingRef.current) return; // guard against overlapping ticks if a request runs long
    tickingRef.current = true;
    const prevKeys = new Set(flagsRef.current.map((f) => `${f.indicator}-${f.day}`));
    try {
      await getJson<AdvanceResult>("/api/mission/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 1 }),
      });
      const [s, i, f] = await Promise.all([
        getJson<MissionStatus>("/api/mission/status"),
        getJson<Indicator[]>("/api/indicators"),
        getJson<Flag[]>("/api/flags"),
      ]);
      setStatus(s);
      setIndicators(i);
      setFlags(f);
      setConnected(true);

      const freshFlags = f.filter((x) => !prevKeys.has(`${x.indicator}-${x.day}`));
      if (freshFlags.length > 0) {
        setLiveMode(false); // auto-pause the moment there's something to look at
        await handleExplain(freshFlags[0]);
      }
    } catch (e) {
      setLiveMode(false);
      setError(e instanceof Error ? e.message : "Live monitoring stopped unexpectedly.");
      setConnected(false);
    } finally {
      tickingRef.current = false;
    }
  }, [handleExplain]);

  useEffect(() => {
    if (!liveMode) return;
    const id = setInterval(liveTick, 1800);
    return () => clearInterval(id);
  }, [liveMode, liveTick]);

  const handleToggleLive = () => {
    setError(null);
    setLiveMode((v) => !v);
  };

  const latestFlagByIndicator: Record<string, Flag> = {};
  for (const f of flags) {
    const existing = latestFlagByIndicator[f.indicator];
    if (!existing || f.day > existing.day) latestFlagByIndicator[f.indicator] = f;
  }

  const indicatorLabels = Object.fromEntries(indicators.map((i) => [i.key, i.label]));

  return (
    <div className="min-h-dvh">
      <TopBar status={status} connected={connected} onMenuClick={() => setNavOpen(true)} />

      <div className="mx-auto flex max-w-7xl gap-6 px-4 sm:px-6">
        <Sidebar status={status} open={navOpen} onClose={() => setNavOpen(false)} ready={!loading} />

        <main className="min-w-0 flex-1 py-6 sm:py-8">
          <div className="mb-6 flex items-start gap-2 rounded-xl border border-signal-amber/30 bg-signal-amber/10 p-3 text-xs text-signal-amber">
            <AlertOctagon size={15} className="mt-0.5 shrink-0" />
            <p>
              <strong>Simulated telemetry.</strong> Values are generated by a model standing in for a wearable/
              sensor feed — not real sensors — calibrated against published NASA/peer-reviewed rates and two real
              NASA OSDR biomarker datasets (see Data sources below).
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-signal-rose/30 bg-signal-rose/10 p-4 text-sm text-signal-rose">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-24 text-sm text-hull-400">Loading mission…</div>
          ) : (
            <div className="space-y-10">
              <section id="overview" className="scroll-mt-24 space-y-4">
                <MissionControls
                  status={status}
                  profiles={provenance?.profiles ?? []}
                  busy={busy}
                  liveMode={liveMode}
                  onToggleLive={handleToggleLive}
                  indicatorKeys={indicators.map((i) => i.key)}
                  indicatorLabels={indicatorLabels}
                  onAdvance={handleAdvance}
                  onInjectAnomaly={handleInjectAnomaly}
                  onReset={handleReset}
                />

                {status && status.current_day === 0 && (
                  <div className="flex items-start gap-2 rounded-xl border border-hull-700 bg-hull-850/60 p-3 text-xs text-hull-300">
                    <Info size={15} className="mt-0.5 shrink-0 text-signal-teal" />
                    <p>
                      New mission, day 0. Click <strong>Start monitoring</strong> and the system runs on its
                      own — it advances a day at a time, establishes a {status.baseline_days_required}-day
                      personal baseline, and pauses itself the moment it has something to explain. (Or step
                      manually with +1/+7 days, and use <strong>Inject anomaly</strong> to guarantee one for a
                      demo.)
                    </p>
                  </div>
                )}

                <OverviewStrip indicators={indicators} />

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]">
                  <div className="order-2 lg:order-1">
                    {selectedFlag && (
                      <div id="explanation">
                        <ExplanationPanel
                          flag={selectedFlag}
                          explanation={explanation}
                          loading={explainLoading}
                          error={explainError}
                          onClose={() => {
                            setSelectedFlag(null);
                            setExplanation(null);
                            setExplainError(null);
                          }}
                        />
                      </div>
                    )}
                    {!selectedFlag && (
                      <div className="flex h-full items-center rounded-2xl border border-dashed border-hull-700 p-5 text-sm text-hull-500">
                        Click <strong className="mx-1 text-hull-300">Explain</strong> on a flagged indicator or
                        alert-log entry to see a plain-language explanation here.
                      </div>
                    )}
                  </div>
                  <div className="order-1 lg:order-2">
                    <HazardBodyMap indicators={indicators} />
                  </div>
                </div>
              </section>

              <section id="indicators" className="scroll-mt-24 space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-hull-400">All indicators</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {indicators.map((ind) => (
                    <IndicatorCard
                      key={ind.key}
                      indicator={ind}
                      flag={latestFlagByIndicator[ind.key] ?? null}
                      onExplain={handleExplain}
                      explainLoading={explainLoading && selectedFlag?.indicator === ind.key}
                    />
                  ))}
                </div>
              </section>

              <section id="alerts" className="scroll-mt-24">
                <AlertLog
                  flags={flags}
                  onExplain={handleExplain}
                  explainingDay={explainLoading ? (selectedFlag?.day ?? null) : null}
                />
              </section>

              <section id="data-sources" className="scroll-mt-24">
                <DataProvenance provenance={provenance} />
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
