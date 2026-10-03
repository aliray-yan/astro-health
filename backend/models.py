from pydantic import BaseModel


class AdvanceRequest(BaseModel):
    days: int = 1


class InjectAnomalyRequest(BaseModel):
    indicator: str | None = None  # None = pick one at random


class ResetRequest(BaseModel):
    astronaut_name: str = "Commander Rayyan"
    data_profile: str | None = None  # e.g. "C001" — see GET /api/data-provenance


class ReadingOut(BaseModel):
    day: int
    value: float
    flagged: bool
    injected_anomaly: str | None = None
    band_lower: float | None = None
    band_upper: float | None = None


class IndicatorOut(BaseModel):
    key: str
    label: str
    unit: str
    hazard: str
    hazard_short: str
    description: str
    good_direction: str
    reference_note: str
    context_limit: float | None = None
    context_limit_label: str = ""
    baseline_established: bool
    latest_value: float | None = None
    latest_day: int | None = None
    flagged: bool = False
    history: list[ReadingOut] = []


class FlagOut(BaseModel):
    indicator: str
    label: str
    hazard: str
    day: int
    value: float
    unit: str
    expected_value: float | None = None
    anomaly_score: float | None = None
    injected_anomaly: str | None = None


class MissionStatusOut(BaseModel):
    astronaut_name: str
    current_day: int
    baseline_days_required: int
    baseline_established: bool
    data_profile: str | None = None
