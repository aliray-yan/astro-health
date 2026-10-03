import { Bone, HeartPulse, Moon, Radiation, ShieldAlert, type LucideIcon } from "lucide-react";

// Business meaning (label/unit/hazard/thresholds) all comes from the backend
// via GET /api/indicators — this file only decides how each indicator LOOKS.
export interface IndicatorVisual {
  icon: LucideIcon;
  accent: string; // tailwind color token, e.g. "signal-violet"
  hex: string; // same color as a literal hex, for chart strokes/fills
}

export const INDICATOR_VISUALS: Record<string, IndicatorVisual> = {
  bone_density: { icon: Bone, accent: "signal-violet", hex: "#a78bfa" },
  cardio_hr: { icon: HeartPulse, accent: "signal-rose", hex: "#fb5c74" },
  sleep: { icon: Moon, accent: "signal-azure", hex: "#5ec8f2" },
  radiation: { icon: Radiation, accent: "signal-amber", hex: "#f5a524" },
  immune_risk: { icon: ShieldAlert, accent: "signal-teal", hex: "#2dd4bf" },
};

export function visualFor(key: string): IndicatorVisual {
  return (
    INDICATOR_VISUALS[key] ?? { icon: HeartPulse, accent: "signal-teal", hex: "#2dd4bf" }
  );
}

export function formatValue(value: number | null, unit: string): string {
  if (value === null || value === undefined) return "—";
  const decimals = Math.abs(value) < 10 ? 1 : Math.abs(value) < 100 ? 1 : 0;
  return `${value.toFixed(decimals)} ${unit}`;
}

export function urgencyCopy(urgency: string): { label: string; className: string } {
  switch (urgency) {
    case "act_soon":
      return { label: "Act soon", className: "bg-signal-rose/15 text-signal-rose border-signal-rose/30" };
    case "monitor":
      return { label: "Monitor", className: "bg-signal-amber/15 text-signal-amber border-signal-amber/30" };
    default:
      return { label: "Routine", className: "bg-signal-teal/15 text-signal-teal border-signal-teal/30" };
  }
}
