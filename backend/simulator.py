"""
Mission-day simulator.

Generates one reading per indicator per simulated day using population-level
drift rates drawn from published spaceflight research (see config.py), plus
gaussian noise, plus an occasional deliberately-injected anomaly so the
detector has something real to catch.

This is clearly-labeled SIMULATED data (PRD sec. 13, non-functional
requirement). It does not represent any real person.
"""

import random

from config import ANOMALY_MAGNITUDE, INDICATORS


def _expected_value(indicator_key: str, day: int) -> float:
    """Population-level expected value at a given (1-based) mission day, no noise."""
    cfg = INDICATORS[indicator_key]
    days_elapsed = day - 1
    if cfg.drift_cap_days is not None:
        days_elapsed = min(days_elapsed, cfg.drift_cap_days)
    return cfg.start_value + cfg.daily_drift * days_elapsed


def generate_day_reading(
    indicator_key: str,
    day: int,
    rng: random.Random,
    force_anomaly: bool = False,
    noise_scale: float = 1.0,
) -> tuple[float, str | None]:
    """
    Returns (value, injected_anomaly_kind_or_None) for one indicator on one
    mission day. noise_scale calibrates day-to-day noise to a selected real
    astronaut data profile (see data_profiles.py); 1.0 = literature default.
    """
    cfg = INDICATORS[indicator_key]
    expected = _expected_value(indicator_key, day)
    noise = rng.gauss(0, cfg.daily_noise_sd * noise_scale)
    value = expected + noise

    injected = None
    if force_anomaly and cfg.anomaly_kinds:
        kind = cfg.anomaly_kinds[0]
        magnitude = ANOMALY_MAGNITUDE[kind]
        value += magnitude
        injected = kind

    if cfg.cumulative:
        # Cumulative counters (radiation) can never go down day-to-day.
        value = max(value, expected)

    return value, injected


def previous_value(indicator_key: str, day: int, history_values: list[float]) -> float:
    """Helper for cumulative series: last recorded value, or the start value."""
    if history_values:
        return history_values[-1]
    return INDICATORS[indicator_key].start_value


def generate_cumulative_step(
    indicator_key: str,
    prev_total: float,
    rng: random.Random,
    force_anomaly: bool = False,
    noise_scale: float = 1.0,
) -> tuple[float, str | None]:
    """For cumulative indicators (radiation): adds a day's increment to the running total."""
    cfg = INDICATORS[indicator_key]
    increment = cfg.daily_drift + rng.gauss(0, cfg.daily_noise_sd * noise_scale)
    increment = max(increment, 0.0)
    injected = None
    if force_anomaly and cfg.anomaly_kinds:
        kind = cfg.anomaly_kinds[0]
        increment += ANOMALY_MAGNITUDE[kind]
        injected = kind
    return prev_total + increment, injected
