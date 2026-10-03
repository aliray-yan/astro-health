// Mirrors backend/models.py exactly — keep in sync if that file changes.

export interface Reading {
  day: number;
  value: number;
  flagged: boolean;
  injected_anomaly: string | null;
  band_lower: number | null;
  band_upper: number | null;
}

export type GoodDirection = "up" | "down" | "flat";

export interface Indicator {
  key: string;
  label: string;
  unit: string;
  hazard: string;
  hazard_short: string;
  description: string;
  good_direction: GoodDirection;
  reference_note: string;
  context_limit: number | null;
  context_limit_label: string;
  baseline_established: boolean;
  latest_value: number | null;
  latest_day: number | null;
  flagged: boolean;
  history: Reading[];
}

export interface Flag {
  indicator: string;
  label: string;
  hazard: string;
  day: number;
  value: number;
  unit: string;
  expected_value: number | null;
  anomaly_score: number | null;
  injected_anomaly: string | null;
}

export interface MissionStatus {
  astronaut_name: string;
  current_day: number;
  baseline_days_required: number;
  baseline_established: boolean;
  data_profile: string | null;
}

export interface AdvanceResult {
  current_day: number;
  latest_day: number;
  latest_readings: Record<
    string,
    {
      value: number;
      flagged: boolean;
      injected_anomaly: string | null;
      band_lower: number | null;
      band_upper: number | null;
    }
  >;
}

export interface InjectAnomalyResult extends AdvanceResult {
  injected_indicator: string;
}

export interface DataProfileOption {
  id: string;
  label: string;
  noise_multipliers: Record<string, number>;
}

export interface DatasetCitation {
  dataset: string;
  title: string;
  source?: string;
  doi?: string;
  biofluid?: string;
  used_for?: string;
  reason?: string;
}

export interface DataProvenance {
  citation: {
    integrated_datasets: DatasetCitation[];
    reviewed_not_integrated: DatasetCitation[];
    related_not_obtained: DatasetCitation[];
    mission: string;
    mission_dates: string;
    n_crew: number;
    timepoints: string[];
    note: string;
  };
  group_preflight_to_R1_pct_change: Record<string, number>;
  profiles: DataProfileOption[];
}

export type Urgency = "routine" | "monitor" | "act_soon";

export interface Explanation {
  explanation: string;
  suggested_action: string;
  urgency: Urgency;
}
