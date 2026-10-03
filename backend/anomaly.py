"""
Personal-baseline + Isolation Forest anomaly detection.

Design (mirrors PRD sec. 4/12 "Detection + Explanation, not just charts"):

1. BASELINE: once an indicator has BASELINE_DAYS of readings, fit a simple
   linear trend (mission day -> value) over that window. This is the
   astronaut's own *personal* normal trend line -- not a population average --
   so "normal" for a fast bone-loser looks different from "normal" for a slow
   one, and a resting-HR-of-70 astronaut isn't compared to a HR-of-55
   astronaut.

2. UNCERTAINTY: a line fit through only BASELINE_DAYS points has real slope
   uncertainty, and extrapolating it hundreds of days forward amplifies that
   uncertainty the further out you go -- a textbook regression fact, not a
   simulator quirk. Using a single fixed band (the baseline window's own
   residual spread) ignores this and makes ordinary personal-trend drift look
   like a growing stream of false anomalies the longer a mission runs. We use
   the standard simple-linear-regression prediction-interval formula instead:
       SE(day) = residual_sd * sqrt(1/n + (day - center_day)^2 / Sxx)
   which widens appropriately with distance from the baseline window.

3. DETECTION: each new day, compute the residual (actual - personal trend at
   that day, using the same widening). Once enough post-baseline history
   exists, feed the trailing window of residuals into a scikit-learn
   IsolationForest and score the newest one -- more robust than a fixed
   z-score cutoff because it adapts to each indicator's own recent noise
   shape. Below that history threshold, fall back to a 3-SE check using the
   formula above.

Both layers are per-indicator and per-astronaut: nothing here is a global
population threshold.
"""

import math

import numpy as np
from sklearn.ensemble import IsolationForest

from config import BASELINE_DAYS, DETECTION_CONTAMINATION, MIN_DETECTION_WINDOW, ROLLING_WINDOW


def fit_personal_baseline(days: list[int], values: list[float], min_sd: float | None = None) -> dict:
    """
    Least-squares line through the baseline window.

    min_sd: a floor for residual_sd, informed by the indicator's own known
    generative noise level (scaled to the selected data profile). A 7-point
    window has only ~5 degrees of freedom for estimating spread, so its raw
    sample SD is itself noisy and can by chance come out too tight. Flooring
    at the known noise level is standard small-sample variance shrinkage --
    reasonable here because the "true" per-day noise is a known simulator
    input, which a real deployment wouldn't have the luxury of.
    """
    x = np.array(days, dtype=float)
    y = np.array(values, dtype=float)
    slope, intercept = np.polyfit(x, y, 1)
    fitted = slope * x + intercept
    residuals = y - fitted
    residual_sd = float(np.std(residuals)) if len(residuals) > 1 else abs(y[0]) * 0.02 + 0.01
    if min_sd is not None:
        residual_sd = max(residual_sd, min_sd)
    residual_sd = max(residual_sd, 1e-6)
    center_day = float(np.mean(x))
    sxx = float(np.sum((x - center_day) ** 2))
    return {
        "slope": float(slope),
        "intercept": float(intercept),
        "residual_sd": residual_sd,
        "center_day": center_day,
        "sxx": sxx if sxx > 1e-9 else 1e-9,
        "n": len(x),
    }


def _effective_day(day: float, drift_cap_days: float | None) -> float:
    """Mirrors simulator.py's drift_cap_days: a plateaued indicator's trend
    (and the uncertainty of extrapolating it) stops moving past the cap."""
    if drift_cap_days is None:
        return day
    return min(day, 1.0 + drift_cap_days)


def expected_value(baseline: dict, day: int, drift_cap_days: float | None = None) -> float:
    d = _effective_day(day, drift_cap_days)
    return baseline["slope"] * d + baseline["intercept"]


def _prediction_sd(baseline: dict, day: int, drift_cap_days: float | None = None) -> float:
    d = _effective_day(day, drift_cap_days)
    se = baseline["residual_sd"] * math.sqrt(
        1.0 / baseline["n"] + ((d - baseline["center_day"]) ** 2) / baseline["sxx"]
    )
    return se


# Width of the displayed "expected range". Two regimes, matching detect_anomaly():
#  - early (fallback) regime flags at 3 standard errors from the personal baseline
#  - learned regime: IsolationForest(contamination=DETECTION_CONTAMINATION) flags roughly
#    the outer DETECTION_CONTAMINATION share of recent residuals, i.e. ~2.05 sigma for
#    bell-shaped noise at 4%.
K_FALLBACK = 3.0
K_LOCAL = 2.05


def expected_and_band(
    baseline: dict,
    all_days: list[int],
    all_values: list[float],
    idx: int,
    drift_cap_days: float | None = None,
    cumulative: bool = False,
) -> tuple[float, float, float]:
    """
    (expected, lower, upper) for the reading at position idx of the FULL history.

    This deliberately mirrors detect_anomaly() step for step so the shaded band on the
    chart is the range the detector actually treats as normal on that day — a flagged
    point sits outside it, an unflagged one (almost always) inside. An earlier version
    drew a baseline-anchored prediction interval instead; that widens with distance from
    the 7-day fit until it spans most of the y-axis, and disagreed with the flags.

    Running totals (cumulative=True, i.e. radiation dose) are judged on their day-over-day
    increments, so their band is anchored to *yesterday's actual value*: "given where you
    were, today should land in here". That keeps it a thin ribbon hugging the line, with
    only a genuine jump poking out of it.
    """
    d = all_days[idx]
    post = [
        (dd, vv)
        for dd, vv in zip(all_days[: idx + 1], all_values[: idx + 1])
        if dd > BASELINE_DAYS
    ]
    post = post[-ROLLING_WINDOW:]

    if cumulative:
        if idx == 0:
            exp = expected_value(baseline, d, drift_cap_days)
            half = K_FALLBACK * _prediction_sd(baseline, d, drift_cap_days)
            return exp, exp - half, exp + half
        prev = all_values[idx - 1]
        vals = [p[1] for p in post]
        history_deltas = [vals[i] - vals[i - 1] for i in range(1, len(vals))][:-1]
        if len(history_deltas) < MIN_DETECTION_WINDOW:
            mean_d, sd_d, k = baseline["slope"], baseline["residual_sd"], K_FALLBACK
        else:
            mean_d = float(np.mean(history_deltas))
            sd_d = max(float(np.std(history_deltas)), 1e-6)
            k = K_LOCAL
        exp = prev + mean_d
        return exp, exp - k * sd_d, exp + k * sd_d

    if len(post) < MIN_DETECTION_WINDOW:
        exp = expected_value(baseline, d, drift_cap_days)
        half = K_FALLBACK * _prediction_sd(baseline, d, drift_cap_days)
        return exp, exp - half, exp + half

    hist_d = np.array([p[0] for p in post[:-1]], dtype=float)
    hist_v = np.array([p[1] for p in post[:-1]], dtype=float)
    slope, intercept = np.polyfit(hist_d, hist_v, 1)
    resid = hist_v - (slope * hist_d + intercept)
    sd = max(float(np.std(resid)), 1e-6)
    exp = float(slope * d + intercept)
    half = K_LOCAL * sd
    return exp, exp - half, exp + half


def _isolation_forest_score(train_residuals: list[float], latest_residual: float) -> tuple[bool, float]:
    """
    Score one new point against a recent-history distribution.

    IMPORTANT: fits IsolationForest on train+latest TOGETHER (fit_predict),
    not fit-then-separately-predict. Verified empirically: with a small
    sample, fitting on history alone builds trees whose split thresholds
    never range far enough to isolate a held-out point that lands well
    outside the training range — an extreme new point can come back
    "normal" simply because it's shallow-depth for the wrong reason (small
    n means shallow trees for every point, not because it's a good fit).
    Including it in the same fit call lets the trees actually split around
    it, which is scikit-learn's intended usage (this also matches how a
    real streaming deployment would periodically refit anyway).
    """
    all_points = np.array(train_residuals + [latest_residual]).reshape(-1, 1)
    clf = IsolationForest(
        n_estimators=150,
        contamination=DETECTION_CONTAMINATION,
        random_state=42,
    )
    pred = clf.fit_predict(all_points)
    scores = clf.decision_function(all_points)
    return bool(pred[-1] == -1), float(scores[-1])


def detect_anomaly(
    baseline: dict,
    days: list[int],
    values: list[float],
    drift_cap_days: float | None = None,
    cumulative: bool = False,
) -> tuple[bool, float]:
    """
    days/values: full history INCLUDING the newest reading, already limited
    to the trailing ROLLING_WINDOW by the caller.
    Returns (is_flagged, anomaly_score) for the LAST point in the series.
    """
    if cumulative:
        return _detect_anomaly_cumulative(baseline, values)

    if len(days) < MIN_DETECTION_WINDOW:
        # Not enough post-baseline history yet to trust a locally-fit model
        # — fall back to a 3-SE check against the ORIGINAL personal
        # baseline, using the widening prediction-interval formula.
        latest_residual = values[-1] - expected_value(baseline, days[-1], drift_cap_days)
        sd = _prediction_sd(baseline, days[-1], drift_cap_days)
        is_flagged = abs(latest_residual) > 3 * sd
        score = -abs(latest_residual) / sd if sd else 0.0
        return is_flagged, float(score)

    # Enough recent history: judge today against a LOCAL trend fit to the
    # recent window (excluding today), not the original BASELINE_DAYS-old
    # baseline extrapolated arbitrarily far forward. Residuals from that
    # stale, far-extrapolated line carry a systematic drift *within* the
    # training window itself — and Isolation Forest, given a steadily
    # drifting 1-D series, tends to flag whichever points sit at the
    # trailing edge simply because they're the extreme of the observed
    # range, not because anything unusual happened. Re-centering on the
    # recent local trend removes that systematic component so the forest is
    # judging what it's supposed to: is TODAY surprising relative to the
    # last several days' actual trajectory. Every injected anomaly here is
    # a single acute day (a spike, a bad night, an SPE event) exactly of
    # the kind this catches — the long-term "personal baseline" story stays
    # intact separately, in the chart's normal_band/expected_value, which
    # still anchor to the original BASELINE_DAYS window.
    hist_days = np.array(days[:-1], dtype=float)
    hist_values = np.array(values[:-1], dtype=float)
    local_slope, local_intercept = np.polyfit(hist_days, hist_values, 1)
    train_residuals = (hist_values - (local_slope * hist_days + local_intercept)).tolist()
    today_expected = local_slope * days[-1] + local_intercept
    today_residual = values[-1] - today_expected

    return _isolation_forest_score(train_residuals, today_residual)


def _detect_anomaly_cumulative(baseline: dict, values: list[float]) -> tuple[bool, float]:
    """
    A running-total indicator (radiation dose) is a random walk: it never
    goes down, and its spread around ANY fitted line — even a locally
    refit one — keeps growing with elapsed time, because each day's noise
    permanently shifts every later value. Neither a fixed band nor local
    detrending on the raw cumulative values is the right tool for that.

    The standard fix for a non-stationary running total is to difference
    it: day-over-day INCREMENTS are i.i.d. by construction here (each is
    just daily_drift + noise), so detect anomalies on those instead. A
    solar-particle-event-style spike shows up as one huge increment —
    exactly what this is built to catch.
    """
    if len(values) < 2:
        return False, 0.0
    deltas = [values[i] - values[i - 1] for i in range(1, len(values))]
    latest_delta = deltas[-1]
    history_deltas = deltas[:-1]

    if len(history_deltas) < MIN_DETECTION_WINDOW:
        # Small-sample fallback: baseline["slope"]/["residual_sd"] were fit
        # on the raw cumulative values over the original baseline window,
        # which for a linear-with-noise running total already approximates
        # the mean daily increment and its spread (residual_sd is floored
        # at the known true per-day noise level — see fit_personal_baseline).
        mean_d = baseline["slope"]
        sd_d = baseline["residual_sd"]
        is_flagged = abs(latest_delta - mean_d) > 3 * sd_d
        score = -abs(latest_delta - mean_d) / sd_d if sd_d else 0.0
        return is_flagged, float(score)

    return _isolation_forest_score(history_deltas, latest_delta)


def windowed(days: list[int], values: list[float], window: int = ROLLING_WINDOW):
    if len(days) <= window:
        return days, values
    return days[-window:], values[-window:]
