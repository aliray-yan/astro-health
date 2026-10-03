# Astro Health — Mission Monitor

A personal-baseline health dashboard for long-duration astronauts. Built for the **NASA Space Apps Challenge 2026**.

Four "wearable-style" vitals plus one immune-risk index are simulated against a running mission clock, compared to *that astronaut's own* established baseline (not a population average), flagged with a personal-baseline + Isolation Forest anomaly detector, and explained in plain language by an LLM. Two real NASA OSDR datasets from the SpaceX Inspiration4 mission calibrate the simulator's realism; every rate and threshold is cited to a published NASA/peer-reviewed source.

> **This is simulated telemetry**, clearly labeled as such everywhere in the UI. No real biosensor feed exists for this app — see [Data sources](#data-sources-what-is-real-and-what-isnt) for exactly what *is* real and how it's used.

---

## Quick start

You need two terminals — a Python backend and a Next.js frontend.

**1. Backend (FastAPI)** — needs Python 3.11 or 3.12 (very new Python versions may not have prebuilt wheels for scikit-learn/numpy yet, which makes `pip install` try to compile from source and fail)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```
Using `python -m uvicorn` (rather than a bare `uvicorn` command) makes sure it runs through the same Python your venv just activated, rather than a different `uvicorn` that happens to be earlier on your system PATH.

**2. Frontend (Next.js)**
```bash
cp .env.example .env.local      # then optionally add OPENROUTER_API_KEY (see below)
npm install
npm run dev
```

Open **http://localhost:3000**. Click **Start monitoring** — the system advances itself a day at a time, establishes its 7-day personal baseline, and pauses on its own the moment it has something to explain (see [Live monitoring](#live-monitoring) below). For precise demo timing, pause it and use **Inject anomaly** instead.

The AI explanation panel needs a free [OpenRouter](https://openrouter.ai/keys) API key in `.env.local` (it uses the no-cost `openrouter/free` auto-router, so no paid credits are required). Without a key, everything else — charts, detection, mission controls, data-sources documentation — still fully works; the explain button just shows a clear setup message instead of AI output.

---

## What's actually being measured

Five indicators, each a NASA-documented spaceflight hazard, each with its own personal baseline and detector:

| Indicator | Hazard (NASA's Five Hazards framework) | What it models |
|---|---|---|
| **Bone Mineral Density** | Altered Gravity | Weight-bearing (hip/spine) BMD loss, ~1–1.5%/month |
| **Cardiovascular (resting HR)** | Altered Gravity | Cardiovascular deconditioning, orthostatic-intolerance-style spikes |
| **Sleep duration & quality** | Isolation/Confinement | NASA schedules 8.5h; astronauts average ~6–6.5h in flight |
| **Radiation dose (cumulative)** | Space Radiation | ISS-rate dose accumulation vs. NASA's 600 mSv career limit |
| **Immune Dysregulation Index** | Hostile/Closed Environment | Composite inflammatory signal — T-/NK-cell suppression, latent-virus reactivation risk |

Every rate is cited inline in the dashboard (`reference_note` on each indicator card) and in `backend/config.py`:
- Bone density: NASA bone-loss research; Lang et al., *J. Bone Miner. Res.* 2004; LeBlanc et al.
- Cardiovascular: Hughson et al., *J. Appl. Physiol.* 2012 (post-flight HR rise); orthostatic-intolerance literature
- Sleep: Barger et al., *Lancet Neurology* 2014; NASA OCHMO sleep brief
- Radiation: NASA radiation program technical briefs; ISS dose-rate literature; NASA's 600 mSv career limit
- Immune: Crucian et al., *Frontiers in Immunology* 2018; Mehta et al. 2013 (cytokine surges with viral reactivation)

The immune indicator started as a PRD "stretch goal" and became a real, fully-detected fifth indicator once real urine cytokine data (OSD-656, below) made it possible to calibrate properly rather than guess.

---

## Live monitoring

**Start monitoring** is the point of this app, not a convenience button. Nobody types in a heart rate anywhere in this system — the simulator generates every reading automatically, standing in for a real wearable/sensor feed the way a deployed version would eventually have one. Live mode makes that visible: toggle it on and the dashboard advances itself (one simulated day roughly every 1.8s client-side), the way a continuously-running monitor would, with no further clicks.

It stops itself, too. Each tick checks whether anything new got flagged; the instant it does, monitoring auto-pauses and the explanation panel opens on its own. That loop — watch, notice, explain, without a human driving each step — is the actual "automatic monitoring" story, not a detail buried in the architecture. The manual **+1 day** / **+7 days** / **Inject anomaly** controls stay available (disabled while live, so there's no ambiguity about which mode is driving) for setting up a specific moment precisely, e.g. for a demo recording.

---

## Data sources — what is real, and what isn't

**The simulator's day-to-day *trend rates* come from the published literature above — Inspiration4 was a 3-day mission, so it cannot supply a long-duration trend shape.** What real clinical panels on four real people *can* supply is real **inter-individual variability**: some people's biochemistry naturally swings more than others. Selecting a "data profile" (Crew A–D) in the mission-setup panel calibrates the simulator's day-to-day noise to a real crew member's own preflight variability — it does not mean the simulated 200-day trajectory *is* that person's real data. This distinction is documented in the app itself (the collapsible **Data sources** panel on the dashboard) as well as here.

### Numerically integrated

| Dataset | Title | Used for |
|---|---|---|
| **LSDS-8 / OSD-575** ([DOI](https://doi.org/10.26030/mc5d-p710)) | SpaceX Inspiration4 Blood Serum Metabolic Panel and Immune/Cardiac Cytokine Arrays | Bone density & cardio noise calibration (calcium, ALP, CRP, fibrinogen, haptoglobin) |
| **LSDS-64 / OSD-656** ([DOI](https://doi.org/10.26030/7cax-yj10)) | SpaceX Inspiration4 Urine Inflammation Panel (Multiplex, NULISAseq) | Immune-risk noise calibration (IL-6, TNF-α, IL-1β, IFN-γ) |

Processing: `backend/data_profiles.py` loads `backend/data/i4_biomarkers.json` (pre-computed per-subject preflight mean/SD for each marker, plus the real observed preflight→immediate-postflight % change), computes each subject's coefficient of variation per indicator, and turns it into a noise-scale multiplier, clamped to 0.65×–1.6× so one small real sample can't push the simulator to implausible extremes.

### Reviewed, not numerically integrated

- **OSD-687** — SpaceX Inspiration4 T-Cell Histone Modification Profiling (H3K4me1/H3K4me3/H3K27ac). Single crew member, single timepoint (R+194) — epigenomic proof-of-concept data with no cross-subject variability or trend to calibrate against.

### Related studies in the same mission's data family, not obtained

You mentioned wanting **OSD-573** (Dragon capsule metagenomic/metatranscriptomic swabs) and **OSD-630** (stool metagenome profiling) but couldn't — both are reported at 100GB+, impractical to download for this build. For completeness, the full related family (all from the same Inspiration4 biospecimen collection):

| Dataset | Title |
|---|---|
| OSD-573 | Dragon Capsule Metagenomic and Metatranscriptomic Microbial Swabs |
| OSD-630 | Stool Metagenome Profiling |
| OSD-572 | Oral, Nasal, and Skin Metagenomic and Metatranscriptomic Microbial Swabs |
| OSD-570 | PBMC Profiling (snRNA-seq, snATAC-seq, TCR/BCR repertoire) |
| OSD-571 | Plasma Profiling (Proteomics, EVs, Metabolomics, cfDNA/cfRNA-seq) |
| OSD-569 | Whole Blood Measurements (RNA-seq, epitranscriptome, WGS, CBC) |
| OSD-574 | Deltoid Skin and Microbiome Data (Spatial Transcriptomics, Metagenomics) |

All are raw sequencing/omics datasets requiring dedicated bioinformatics pipelines, not simple tabular vitals — outside this MVP's scope even where size wasn't a blocker. This full list is also queryable live via `GET /api/data-provenance` and rendered in the dashboard's **Data sources** panel, so it travels with the app rather than sitting only in this file.

---

## How the detection actually works

`backend/anomaly.py`, in three layers:

1. **Personal baseline.** Once an indicator has 7 days of readings, fit a line through them (mission day → value). This is the astronaut's *own* trend — a fast bone-loser's "normal" looks different from a slow one's.

2. **Extrapolation uncertainty.** A line fit through 7 points has real slope uncertainty, and projecting it out over a 100+ day mission amplifies that the further out you go — standard regression behavior, not a simulator quirk. The chart's shaded "normal band" widens accordingly using the textbook prediction-interval formula (`SE(day) = residual_sd × √(1/n + (day − daȳ)² / Sxx)`), so a personal trend line extrapolated far from where it was fit is honestly shown as less certain, rather than falsely precise.

3. **Detection.** Below ~10 days of post-baseline history, a 3-SE check against that widening baseline decides. Past that, the trailing 30-day window of residuals is locally re-detrended and fed to a scikit-learn `IsolationForest` — this is what actually lets an astronaut's *expected* long-mission decline stay "normal" (it's on-trend) while still catching a genuine single-day deviation from their recent trajectory, which is what every injected anomaly in this system is (a spike, a bad night, a radiation event). Measured over a 200-day simulated mission with zero forced anomalies, this holds unforced ("false positive") flags to ~4% of indicator-days — matching the detector's own configured contamination rate — while catching 100% of forced anomalies tested at every mission stage from day 8 through day 205.

That last part took real debugging: an earlier version of this fix only widened the *chart display* band, then a second earlier version only fixed the *cumulative* radiation counter — both true problems, neither the actual root cause, which was that Isolation Forest scored a *systematically drifting* residual series (from far-extrapolated slope error) and kept flagging whichever point sat at the trailing edge of that drift, simply because it was the extreme of the window, not because anything unusual had happened. Re-centering the detector on a locally-refit trend (while leaving the chart's long-term personal-baseline band alone) fixed it. If you're reading the code: this is why `expected_value()`/`normal_band()` (chart display, anchored to the original baseline) and the Isolation-Forest path inside `detect_anomaly()` (local re-detrending) deliberately use different reference lines.

---

## Architecture

```
Browser
  │
  ▼
Next.js (app/) ── thin proxy layer (app/api/**) ──▶ FastAPI (backend/)
  │                                                        │
  └── app/api/explain/route.ts ──▶ OpenRouter              ├── simulator.py   (mission-day generator)
      (Vercel AI SDK, direct — not proxied)                ├── anomaly.py     (baseline + detection, above)
                                                            ├── data_profiles.py (real-data calibration)
                                                            └── database.py    (SQLite)
```

- **Why a proxy layer for everything except `/api/explain`?** Keeps `BACKEND_URL` server-side only — the browser only ever talks to the Next.js origin, so CORS never enters the picture even with two dev servers on different ports. `/api/explain` is the one route that isn't a proxy: it's a genuine Next.js server route calling OpenRouter directly via the Vercel AI SDK, since that's specifically where an LLM call belongs in this stack, not in the Python backend.
- **Why SQLite, not Postgres?** One astronaut, one mission, a demo tool — no need for the operational overhead.
- **Where would real sensors plug in?** Detection reads from one ingestion point — `simulator.generate_day_reading()` / `generate_cumulative_step()`, called once per indicator per day in `main.py`. A real wearable or flight-medical feed would fill that same point with a real value instead of a generated one; `anomaly.py` and everything downstream (baseline, detection, the dashboard, the explanation panel) wouldn't change at all. Real device/API integration is deliberately not built here — a hackathon team has no real astronaut biosensor to integrate with, and building toward one would be complexity with nothing real on the other end. The architecture just doesn't make that harder later.
  ```
  [ simulator (today) ]  →┐
  [ real sensor feed  ]  →┼→  one reading per indicator/day  →  anomaly.py  →  dashboard
  [ manual override   ]  →┘        (same shape either way)      (unchanged)    (unchanged)
  ```
- **Full file layout:**
  ```
  app/
    page.tsx                     dashboard — owns all data fetching/state
    components/                  IndicatorCard, TrendChart, MissionControls,
                                  ExplanationPanel, DataProvenance, FlagBadge
    api/                         proxy routes + the explain route
  lib/
    types.ts                     TS types mirroring backend/models.py
    backend.ts                   shared server-side fetch helper
    indicators.ts                per-indicator icon/color (presentation only —
                                  business meaning always comes from the API)
  backend/
    main.py                      FastAPI routes
    simulator.py                 mission-day reading generator
    anomaly.py                   detection (see above)
    data_profiles.py             real-dataset noise calibration
    config.py                    all 5 indicators' rates, citations, anomaly
                                  magnitudes — the single source of truth
    database.py                  SQLite schema + queries
    data/i4_biomarkers.json      processed real OSDR stats (source data itself
                                  isn't redistributed here — see citations above)
  ```

---

## Known limitations

- **~4% baseline false-positive rate** once the Isolation Forest path is active (see [detection](#how-the-detection-actually-works) above) — an inherent property of the detector's contamination setting, not a bug; real anomaly-screening systems have a comparable baseline rate. Lowering it further would also reduce true-positive sensitivity.
- **The AI explanation is only as good as the free OpenRouter model behind `openrouter/free`** — it's a genuinely useful plain-language layer, not a clinical opinion, and the UI doesn't present it as one.
- **Single-astronaut-at-a-time**, matching the PRD's core "MY vitals" user story. A multi-crew ground-support view is a natural extension, not built here.
- **Immune Dysregulation Index is a composite, not a named clinical assay** — labeled that way throughout (see its `description` field) precisely so it isn't mistaken for a single lab value.

---

## Environment variables

See `.env.example`. `BACKEND_URL` (default `http://localhost:8000`) and optionally `OPENROUTER_API_KEY` for live AI explanations.
