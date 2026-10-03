"""
Real-data calibration layer.

Loads backend/data/i4_biomarkers.json -- real preflight biomarker stats for
the four SpaceX Inspiration4 crew members, processed from two NASA OSDR
studies in the same mission's data family (see the JSON's "citation" block
for the full list of studies reviewed, including the ones too large to
download and the ones reviewed but not numerically integrated):
  - LSDS-8 / OSD-575  -- blood serum (Comprehensive Metabolic Panel +
    cardiovascular multiplex)
  - LSDS-64 / OSD-656 -- urine inflammatory cytokine panel (NULISAseq)

What this is honestly used for: Inspiration4 was a 3-day mission with no
in-flight sample draws, so it cannot supply a long-duration TREND shape
(that still comes from the published HRP / peer-reviewed rate literature in
config.py). What real clinical panels on four real people CAN supply is
real inter-individual VARIABILITY -- some people's biochemistry naturally
swings more than others. We use each crew member's own preflight
coefficient of variation (SD / mean) on relevant markers as a noise-scale
multiplier for the matching simulated indicator, so picking a "data
profile" for a mission means "simulate a person whose day-to-day
physiological noise looks like this real person's," not "this is that
person's actual long-duration data."

Mapping (nearest available real marker per MVP indicator):
  bone_density -> calcium + alkaline phosphatase (serum bone/mineral panel)
  cardio_hr    -> CRP + fibrinogen (serum cardiovascular panel)
  immune_risk  -> IL-6 + TNF-alpha + IL-1beta + IFN-gamma (urine cytokine panel)
sleep and radiation have no biomarker-panel analog in either dataset, so
their noise is left at the literature-derived default (multiplier 1.0).
"""

import json
import statistics as st
from pathlib import Path
from functools import lru_cache

DATA_PATH = Path(__file__).parent / "data" / "i4_biomarkers.json"

# Keep any one subject's calibration from swinging the simulator to
# implausible extremes on a small (n=2-3 preflight draws) real sample.
MULTIPLIER_CLAMP = (0.65, 1.6)

# indicator_key -> real-marker stat-fields averaged into one CV
MARKER_MAP: dict[str, list[str]] = {
    "bone_density": ["calcium_mgdl_preflight", "alp_UL_preflight"],
    "cardio_hr": ["crp_pgml_preflight", "fibrinogen_ngml_preflight"],
    "immune_risk": [
        "il6_npq_preflight",
        "tnf_npq_preflight",
        "il1b_npq_preflight",
        "ifng_npq_preflight",
    ],
}


def _cv(stat: dict | None) -> float | None:
    if not stat or stat.get("sd") is None or not stat.get("mean"):
        return None
    return abs(stat["sd"] / stat["mean"])


@lru_cache(maxsize=1)
def _raw() -> dict:
    if not DATA_PATH.exists():
        return {"subjects": {}, "citation": {}, "group_preflight_to_R1_pct_change": {}}
    with open(DATA_PATH) as f:
        return json.load(f)


@lru_cache(maxsize=1)
def _multipliers() -> dict[str, dict[str, float]]:
    """subject_id -> {indicator_key: multiplier}"""
    subjects = _raw().get("subjects", {})
    if not subjects:
        return {}

    cvs: dict[str, dict[str, float]] = {ind: {} for ind in MARKER_MAP}
    for subj, s in subjects.items():
        for ind, fields in MARKER_MAP.items():
            parts = [v for v in (_cv(s.get(f)) for f in fields) if v is not None]
            if parts:
                cvs[ind][subj] = sum(parts) / len(parts)

    averages = {ind: (st.mean(v.values()) if v else 1.0) for ind, v in cvs.items()}

    out: dict[str, dict[str, float]] = {}
    lo, hi = MULTIPLIER_CLAMP
    for subj in subjects:
        out[subj] = {}
        for ind in MARKER_MAP:
            raw_cv = cvs[ind].get(subj)
            avg = averages[ind]
            mult = max(lo, min(hi, raw_cv / avg)) if raw_cv and avg else 1.0
            out[subj][ind] = round(mult, 3)
    return out


def noise_multiplier(data_profile: str | None, indicator_key: str) -> float:
    """1.0 if no profile selected, or the indicator has no real-data mapping."""
    if not data_profile:
        return 1.0
    return _multipliers().get(data_profile, {}).get(indicator_key, 1.0)


def list_profiles() -> list[dict]:
    """Selectable real-data profiles for the mission-setup UI."""
    subjects = _raw().get("subjects", {})
    mults = _multipliers()
    labels = {"C001": "Crew A", "C002": "Crew B", "C003": "Crew C", "C004": "Crew D"}
    out = []
    for subj in sorted(subjects):
        m = mults.get(subj, {})
        out.append({
            "id": subj,
            "label": labels.get(subj, subj),
            "noise_multipliers": {ind: m.get(ind, 1.0) for ind in MARKER_MAP},
        })
    return out


def provenance() -> dict:
    """Full citation + stats payload for the frontend's data-provenance panel."""
    raw = _raw()
    return {
        "citation": raw.get("citation", {}),
        "group_preflight_to_R1_pct_change": raw.get("group_preflight_to_R1_pct_change", {}),
        "profiles": list_profiles(),
    }
