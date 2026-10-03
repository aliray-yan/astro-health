"""
Indicator definitions and simulation constants for the astronaut health
monitor.

Every rate constant below is grounded in published spaceflight human-research
literature (NASA Human Research Program / OCHMO standards / peer-reviewed
studies), not guessed. Sources are noted inline. This file is the one place
to revisit once NASA's Space Apps Resources tab goes live on Oct 28 (see PRD
section 15) in case more specific figures are published for the challenge.

All data produced from these constants is SIMULATED. It is not real
telemetry from any real person.
"""

from dataclasses import dataclass, field


BASELINE_DAYS = 7  # "first few simulated days" used to establish personal baseline (PRD sec. 5.2)
MIN_DETECTION_WINDOW = 10  # minimum post-baseline residual history before Isolation Forest is trusted
ROLLING_WINDOW = 30  # max trailing days fed to the Isolation Forest
DETECTION_CONTAMINATION = 0.03  # expected outlier fraction — kept low to avoid noisy false flags


@dataclass
class IndicatorConfig:
    key: str
    label: str
    unit: str
    hazard: str  # which of NASA's 5 hazards this maps to
    hazard_short: str
    description: str
    start_value: float
    daily_drift: float  # population-level expected change per mission day
    daily_noise_sd: float  # gaussian noise sd per day
    cumulative: bool  # True if this is a rising counter (e.g. radiation dose)
    good_direction: str  # "down" | "up" | "flat" — which direction is "worse"
    reference_note: str  # cited source, shown in the UI "Validity" footnote
    context_limit: float | None = None  # e.g. NASA's 600 mSv career limit
    context_limit_label: str = ""
    anomaly_kinds: list[str] = field(default_factory=list)
    drift_cap_days: float | None = None  # if set, daily_drift stops accumulating past this many days (models a real physiological plateau instead of unbounded linear drift on long missions)


INDICATORS: dict[str, IndicatorConfig] = {
    "bone_density": IndicatorConfig(
        key="bone_density",
        label="Bone Mineral Density",
        unit="% of pre-flight",
        hazard="Altered Gravity",
        hazard_short="gravity",
        description=(
            "Weight-bearing bone (hip/spine) mineral density relative to the "
            "astronaut's pre-flight scan."
        ),
        start_value=100.0,
        daily_drift=-1.5 / 30.4,  # -1.5%/month, weight-bearing sites, unmitigated
        daily_noise_sd=0.05,
        cumulative=False,
        good_direction="down",  # lower reading = worse (it's a decline metric)
        reference_note=(
            "NASA/peer-reviewed spaceflight studies report 1-1.5% weight-bearing "
            "bone density loss per month in microgravity (Sibonga et al.; NASA "
            "OCHMO). Simulator models the unmitigated rate as a conservative "
            "demo case."
        ),
        anomaly_kinds=["accelerated_loss"],
    ),
    "cardio_hr": IndicatorConfig(
        key="cardio_hr",
        label="Resting Heart Rate",
        unit="bpm",
        hazard="Altered Gravity",
        hazard_short="gravity",
        description=(
            "Resting heart rate, the classic cardiovascular deconditioning "
            "signal in microgravity."
        ),
        start_value=58.0,
        daily_drift=5.5 / 180.0,  # ~+5-6 bpm drift over a 6-month mission
        daily_noise_sd=1.4,
        cumulative=False,
        good_direction="up",  # higher resting HR = more deconditioned
        reference_note=(
            "In-flight studies show resting HR is broadly stable short-term but "
            "post-flight HR rises ~5-6 bpm after 6-month ISS missions "
            "(Hughson et al., J Appl Physiol 2012), reflecting cardiovascular "
            "deconditioning. Simulator applies that drift gradually in-mission "
            "for a visible trend."
        ),
        anomaly_kinds=["spike"],
    ),
    "sleep": IndicatorConfig(
        key="sleep",
        label="Sleep Duration",
        unit="hours",
        hazard="Isolation / Confinement",
        hazard_short="isolation",
        description="Nightly sleep duration, tracked against NASA's 8.5h scheduled window.",
        start_value=6.9,
        daily_drift=-0.6 / 21.0,  # settles from ~6.9h toward ~6.3h average over ~3 weeks
        daily_noise_sd=0.55,
        cumulative=False,
        good_direction="down",
        reference_note=(
            "NASA schedules 8.5h/night but longitudinal ISS studies (Barger et "
            "al., Lancet Neurology 2014; NASA OCHMO sleep brief) find astronauts "
            "average 6-6.5h in flight. Simulator settles toward that documented "
            "average after an adjustment period, then holds — it does not drift "
            "indefinitely on longer missions."
        ),
        anomaly_kinds=["bad_night"],
        drift_cap_days=21.0,  # matches the ~3-week adjustment period cited above
    ),
    "radiation": IndicatorConfig(
        key="radiation",
        label="Cumulative Radiation Dose",
        unit="mSv",
        hazard="Space Radiation",
        hazard_short="radiation",
        description="Cumulative effective radiation dose for this mission.",
        start_value=0.0,
        daily_drift=0.35,  # ISS effective dose ~0.2-0.5 mSv/day
        daily_noise_sd=0.06,
        cumulative=True,
        good_direction="up",  # rising counter, always "worse" as it climbs
        reference_note=(
            "ISS effective dose accumulates at roughly 0.2-0.5 mSv/day "
            "(NASA OCHMO radiation standards; ~80-90 mSv per 6-month "
            "increment). NASA's current career limit is 600 mSv "
            "(NASA-STD-3001), shown here for context only — a single mission "
            "stays far below it."
        ),
        context_limit=600.0,
        context_limit_label="NASA 600 mSv career limit",
        anomaly_kinds=["spe_spike"],
    ),
    "immune_risk": IndicatorConfig(
        key="immune_risk",
        label="Immune Dysregulation Index",
        unit="index (0-100)",
        hazard="Hostile/Closed Environment",
        hazard_short="immune",
        description=(
            "Composite inflammatory/immune-dysregulation signal (0 = quiescent). "
            "Modeled on the well-documented spaceflight pattern of T-/NK-cell "
            "suppression and latent-herpesvirus reactivation, not a single "
            "clinical lab value."
        ),
        start_value=8.0,
        daily_drift=14.0 / 180.0,  # gradual creep — dysregulation persists, doesn't resolve in-mission
        daily_noise_sd=1.3,
        cumulative=False,
        good_direction="up",  # higher index = more dysregulated
        reference_note=(
            "Long-duration ISS studies find T-cell/NK-cell function suppressed "
            "in-flight and latent herpesviruses (EBV/VZV/CMV) reactivating in a "
            "large share of crew, with dysregulation persisting rather than "
            "adapting over the mission (Crucian et al., Front. Immunol. 2018; "
            "Mehta et al. 2013 documented multi-fold plasma-cytokine surges, "
            "incl. IL-6, around reactivation events). Simulator applies a slow "
            "background drift with occasional sharp reactivation-style spikes."
        ),
        anomaly_kinds=["viral_reactivation"],
    ),
}

INDICATOR_ORDER = ["bone_density", "cardio_hr", "sleep", "radiation", "immune_risk"]

ANOMALY_MAGNITUDE = {
    # How far outside the normal day-to-day noise an injected anomaly reaches,
    # expressed as a direct value delta applied on top of (or instead of) the
    # expected value for that day. Tuned to be unmistakable on a chart and to
    # reliably clear the Isolation Forest's outlier threshold for a demo.
    "accelerated_loss": -0.6,        # extra %, on top of normal day
    "spike": 19.0,                    # +bpm for one day
    "bad_night": -3.4,                # hours removed from expected sleep
    "spe_spike": 14.0,                # +mSv in a single day (solar particle event)
    "viral_reactivation": 27.0,       # +index points for one day (real reactivation events show multi-fold cytokine surges; scaled here to stay readable on a 0-100 index)
}
