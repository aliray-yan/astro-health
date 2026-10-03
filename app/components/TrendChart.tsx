"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { Reading } from "@/lib/types";

interface TrendChartProps {
  history: Reading[];
  unit: string;
  color: string;
  height?: number;
}

interface ChartPoint {
  day: number;
  value: number;
  band: [number, number] | null;
  flagged: boolean;
}

function FlaggedDot(props: any) {
  const { cx, cy, payload, color } = props;
  if (!payload?.flagged || cx == null || cy == null) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={7} fill={color} fillOpacity={0.25} />
      <circle cx={cx} cy={cy} r={3.5} fill={color} stroke="#05070d" strokeWidth={1.5} />
    </g>
  );
}

export default function TrendChart({ history, unit, color, height = 180 }: TrendChartProps) {
  if (history.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-hull-400"
        style={{ height }}
      >
        No readings yet — advance the mission to begin.
      </div>
    );
  }

  // Pick tick precision from the visible range so axes read 98.5 / 99.0, not 100.35.
  const allVals = history.flatMap((r) =>
    [r.value, r.band_lower, r.band_upper].filter((v): v is number => v !== null),
  );
  const span = Math.max(...allVals) - Math.min(...allVals);
  const decimals = span >= 20 ? 0 : span >= 2 ? 1 : 2;
  const tickFormatter = (v: number) => v.toFixed(decimals);

  const data: ChartPoint[] = history.map((r) => ({
    day: r.day,
    value: r.value,
    band: r.band_lower !== null && r.band_upper !== null ? [r.band_lower, r.band_upper] : null,
    flagged: r.flagged,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#1e2740" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fill: "#7883a6", fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: "#1e2740" }}
          interval="preserveStartEnd"
          minTickGap={14}
        />
        <YAxis
          tick={{ fill: "#7883a6", fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: "#1e2740" }}
          width={44}
          domain={["auto", "auto"]}
          tickFormatter={tickFormatter}
        />
        <Tooltip
          contentStyle={{
            background: "#0f1422",
            border: "1px solid #2c3654",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "#ced4e6" }}
          itemStyle={{ color }}
          formatter={(value: number | [number, number]) => {
            // The "band" series feeds this same Tooltip an array [low, high]
            // for the shaded normal-range area, while "value" feeds a plain
            // number — this formatter is shared across both series, so it
            // must handle each shape rather than assume a number.
            if (Array.isArray(value)) {
              const [lo, hi] = value;
              return [`${lo.toFixed(2)} – ${hi.toFixed(2)} ${unit}`, "Expected range"];
            }
            return [`${value.toFixed(2)} ${unit}`, "Reading"];
          }}
          labelFormatter={(day) => `Mission day ${day}`}
        />
        <Area
          dataKey="band"
          stroke="none"
          fill={color}
          fillOpacity={0.08}
          isAnimationActive={false}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={(props: any) => <FlaggedDot {...props} color={color} key={`dot-${props.payload?.day}`} />}
          activeDot={{ r: 4, fill: color, stroke: "#05070d", strokeWidth: 1.5 }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
