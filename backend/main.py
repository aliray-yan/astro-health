"""
Astronaut Health Monitor — backend.

Runs the mission-day simulator and the per-indicator personal-baseline +
Isolation Forest anomaly detector, backed by SQLite. The Next.js frontend
proxies to this service for indicator data and mission control actions.

Run with:  uvicorn main:app --reload --port 8000
"""

import random

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import anomaly
import data_profiles
import database
import simulator
from config import BASELINE_DAYS, INDICATOR_ORDER, INDICATORS
from models import (
    AdvanceRequest,
    FlagOut,
    IndicatorOut,
    InjectAnomalyRequest,
    MissionStatusOut,
    ReadingOut,
    ResetRequest,
)

app = FastAPI(title="Astronaut Health Monitor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    database.init_db()


# ---------------------------------------------------------------------------
# Core simulation helpers
# ---------------------------------------------------------------------------

def _compute_baseline(conn, key: str) -> dict | None:
    history = database.get_history(conn, key)
    if len(history) < BASELINE_DAYS:
        return None
    window = history[:BASELINE_DAYS]
    days = [r["mission_day"] for r in window]
    values = [r["value"] for r in window]
    mission = database.get_mission(conn)
    noise_scale = data_profiles.noise_multiplier(mission["data_profile"], key)
    min_sd = INDICATORS[key].daily_noise_sd * noise_scale
    return anomaly.fit_personal_baseline(days, values, min_sd=min_sd)


def _detect_for_new_value(conn, key: str, new_day: int, new_value: float):
    baseline = _compute_baseline(conn, key)
    if baseline is None:
        return False, None, baseline
    history = database.get_history(conn, key)
    # Only feed the detector POST-baseline residuals. The baseline window's
    # own residuals are near-zero by construction (they're what the trend
    # line was fit to), so including them would bias the forest's notion of
    # "normal spread" too tight and over-flag ordinary post-baseline noise.
    post_baseline = [r for r in history if r["mission_day"] > BASELINE_DAYS]
    days = [r["mission_day"] for r in post_baseline] + [new_day]
    values = [r["value"] for r in post_baseline] + [new_value]
    days, values = anomaly.windowed(days, values)
    flagged, score = anomaly.detect_anomaly(
        baseline, days, values,
        drift_cap_days=INDICATORS[key].drift_cap_days,
        cumulative=INDICATORS[key].cumulative,
    )
    return flagged, score, baseline


def _advance_one_day(conn, rng: random.Random, force_anomaly_indicator: str | None):
    mission = database.get_mission(conn)
    next_day = mission["current_day"] + 1
    data_profile = mission["data_profile"]

    day_summary = {}
    for key in INDICATOR_ORDER:
        cfg = INDICATORS[key]
        force = force_anomaly_indicator == key
        noise_scale = data_profiles.noise_multiplier(data_profile, key)
        if cfg.cumulative:
            history = database.get_history(conn, key)
            prev_total = history[-1]["value"] if history else cfg.start_value
            value, injected = simulator.generate_cumulative_step(
                key, prev_total, rng, force, noise_scale
            )
        else:
            value, injected = simulator.generate_day_reading(
                key, next_day, rng, force, noise_scale
            )

        flagged, score, baseline = _detect_for_new_value(conn, key, next_day, value)
        database.insert_reading(conn, key, next_day, value, injected, flagged, score)

        band_lower = band_upper = None
        if baseline is not None:
            hist = database.get_history(conn, key)  # now includes today's reading
            _, band_lower, band_upper = anomaly.expected_and_band(
                baseline,
                [r["mission_day"] for r in hist],
                [r["value"] for r in hist],
                len(hist) - 1,
                drift_cap_days=cfg.drift_cap_days,
                cumulative=cfg.cumulative,
            )

        day_summary[key] = {
            "value": value,
            "flagged": flagged,
            "injected_anomaly": injected,
            "band_lower": band_lower,
            "band_upper": band_upper,
        }

    database.set_mission_day(conn, next_day)
    return next_day, day_summary


# ---------------------------------------------------------------------------
# Mission endpoints
# ---------------------------------------------------------------------------

@app.get("/api/mission/status", response_model=MissionStatusOut)
def mission_status():
    with database.get_conn() as conn:
        mission = database.get_mission(conn)
        return MissionStatusOut(
            astronaut_name=mission["astronaut_name"],
            current_day=mission["current_day"],
            baseline_days_required=BASELINE_DAYS,
            baseline_established=mission["current_day"] >= BASELINE_DAYS,
            data_profile=mission["data_profile"],
        )


@app.post("/api/mission/advance")
def mission_advance(req: AdvanceRequest):
    if req.days < 1 or req.days > 120:
        raise HTTPException(400, "days must be between 1 and 120")
    rng = random.Random()
    with database.get_conn() as conn:
        last_day = None
        last_summary = None
        for _ in range(req.days):
            last_day, last_summary = _advance_one_day(conn, rng, force_anomaly_indicator=None)
        mission = database.get_mission(conn)
    return {
        "current_day": mission["current_day"],
        "latest_day": last_day,
        "latest_readings": last_summary,
    }


@app.post("/api/mission/inject-anomaly")
def mission_inject_anomaly(req: InjectAnomalyRequest):
    indicator = req.indicator or random.choice(INDICATOR_ORDER)
    if indicator not in INDICATORS:
        raise HTTPException(400, f"Unknown indicator: {indicator}")
    rng = random.Random()
    with database.get_conn() as conn:
        mission = database.get_mission(conn)
        if mission["current_day"] < BASELINE_DAYS:
            raise HTTPException(
                409,
                f"Personal baseline needs {BASELINE_DAYS} days before an anomaly "
                "means anything — advance the mission further first.",
            )
        day, summary = _advance_one_day(conn, rng, force_anomaly_indicator=indicator)
        mission = database.get_mission(conn)
    return {
        "current_day": mission["current_day"],
        "latest_day": day,
        "latest_readings": summary,
        "injected_indicator": indicator,
    }


@app.post("/api/mission/reset")
def mission_reset(req: ResetRequest):
    if req.data_profile is not None:
        valid_ids = {p["id"] for p in data_profiles.list_profiles()}
        if req.data_profile not in valid_ids:
            raise HTTPException(400, f"Unknown data_profile: {req.data_profile}")
    database.reset_db(req.astronaut_name, req.data_profile)
    return {"status": "reset", "astronaut_name": req.astronaut_name, "data_profile": req.data_profile}


@app.get("/api/data-provenance")
def data_provenance():
    """Real-NASA-data grounding shown in the dashboard's data-sources panel."""
    return data_profiles.provenance()


# ---------------------------------------------------------------------------
# Indicator + flag endpoints
# ---------------------------------------------------------------------------

@app.get("/api/indicators", response_model=list[IndicatorOut])
def get_indicators():
    with database.get_conn() as conn:
        out = []
        for key in INDICATOR_ORDER:
            cfg = INDICATORS[key]
            history = database.get_history(conn, key)
            baseline = _compute_baseline(conn, key)

            days = [r["mission_day"] for r in history]
            vals = [r["value"] for r in history]
            readings = []
            for idx, r in enumerate(history):
                band_lower = band_upper = None
                if baseline is not None:
                    _, band_lower, band_upper = anomaly.expected_and_band(
                        baseline, days, vals, idx,
                        drift_cap_days=cfg.drift_cap_days, cumulative=cfg.cumulative,
                    )
                readings.append(
                    ReadingOut(
                        day=r["mission_day"],
                        value=r["value"],
                        flagged=bool(r["is_flagged"]),
                        injected_anomaly=r["injected_anomaly"],
                        band_lower=band_lower,
                        band_upper=band_upper,
                    )
                )

            latest = history[-1] if history else None
            out.append(
                IndicatorOut(
                    key=cfg.key,
                    label=cfg.label,
                    unit=cfg.unit,
                    hazard=cfg.hazard,
                    hazard_short=cfg.hazard_short,
                    description=cfg.description,
                    good_direction=cfg.good_direction,
                    reference_note=cfg.reference_note,
                    context_limit=cfg.context_limit,
                    context_limit_label=cfg.context_limit_label,
                    baseline_established=baseline is not None,
                    latest_value=latest["value"] if latest else None,
                    latest_day=latest["mission_day"] if latest else None,
                    flagged=bool(latest["is_flagged"]) if latest else False,
                    history=readings,
                )
            )
    return out


@app.get("/api/flags", response_model=list[FlagOut])
def get_flags():
    with database.get_conn() as conn:
        rows = database.get_all_flags(conn)
        out = []
        cache: dict[str, tuple] = {}
        for r in rows:
            key = r["indicator"]
            cfg = INDICATORS[key]
            if key not in cache:
                hist = database.get_history(conn, key)
                cache[key] = (
                    _compute_baseline(conn, key),
                    [h["mission_day"] for h in hist],
                    [h["value"] for h in hist],
                )
            baseline, days, vals = cache[key]
            expected = None
            if baseline is not None and r["mission_day"] in days:
                # "expected" is what the detector itself compared this reading against
                expected, _, _ = anomaly.expected_and_band(
                    baseline, days, vals, days.index(r["mission_day"]),
                    drift_cap_days=cfg.drift_cap_days, cumulative=cfg.cumulative,
                )
            out.append(
                FlagOut(
                    indicator=r["indicator"],
                    label=cfg.label,
                    hazard=cfg.hazard,
                    day=r["mission_day"],
                    value=r["value"],
                    unit=cfg.unit,
                    expected_value=expected,
                    anomaly_score=r["anomaly_score"],
                    injected_anomaly=r["injected_anomaly"],
                )
            )
    return out


@app.get("/api/health")
def health():
    return {"status": "ok"}
