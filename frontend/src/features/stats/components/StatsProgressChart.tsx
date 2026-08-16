import { memo } from "react";
import type { ExerciseProgressPoint } from "@/types";

interface StatsProgressChartProps {
  points: ExerciseProgressPoint[];
  label: string;
  height?: number;
  ySuffix?: string;
  latestFormatter?: (value: number) => string;
}

export const StatsProgressChart = memo(function StatsProgressChart({
  points,
  label,
  height = 200,
  ySuffix = "",
  latestFormatter,
}: StatsProgressChartProps) {
  if (points.length === 0) {
    return (
      <div
        className="rounded-2xl flex items-center justify-center p-8 text-center"
        style={{
          height: 120,
          background: "var(--gg-surface)",
          border: "1px solid var(--gg-border)",
        }}
      >
        <p className="text-[13px]" style={{ color: "var(--gg-text-muted)" }}>
          Wykres pojawi się po zrealizowaniu sesji treningowych
        </p>
      </div>
    );
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const yAxisValues = [...new Set(values.map((v) => Number(v.toFixed(1))))].sort((a, b) => a - b);
  const firstDate = new Date(points[0]!.workoutDate).toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
  const lastDate = new Date(points[points.length - 1]!.workoutDate).toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
  const chartLeft = 18;
  const chartRight = 96;
  const chartTop = 8;
  const chartBottom = 46;

  const plotY = (value: number) => {
    const normalized = (value - min) / range;
    return chartBottom - normalized * (chartBottom - chartTop);
  };

  const plotX = (index: number) => {
    if (points.length === 1) return (chartLeft + chartRight) / 2;
    return chartLeft + (index / (points.length - 1)) * (chartRight - chartLeft);
  };

  const polyline = points.map((p, i) => `${plotX(i)},${plotY(p.value)}`).join(" ");
  const latestValue = values[values.length - 1]!;

  return (
    <div
      className="rounded-2xl p-4 transition-all"
      style={{
        background: "var(--gg-surface)",
        border: "1px solid var(--gg-border)",
        boxShadow: "var(--gg-shadow)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: "var(--gg-text-muted)" }}>
          {label}
        </span>
        <span className="font-barlow font-extrabold text-[17px] num-tabular" style={{ color: "var(--gg-a2)" }}>
          {latestFormatter ? latestFormatter(latestValue) : `${latestValue.toFixed(1)}${ySuffix}`}
        </span>
      </div>

      <svg viewBox="0 0 100 60" role="img" aria-label={label} style={{ width: "100%", height }}>
        {yAxisValues.map((axisValue) => (
          <line
            key={axisValue}
            x1={chartLeft}
            y1={plotY(axisValue)}
            x2={chartRight}
            y2={plotY(axisValue)}
            stroke="var(--gg-border)"
            strokeWidth="0.45"
            strokeDasharray="1.5 1.5"
          />
        ))}
        <line
          x1={chartLeft} y1={chartTop}
          x2={chartLeft} y2={chartBottom}
          stroke="var(--gg-border-med)"
          strokeWidth="0.8"
        />
        <line
          x1={chartLeft} y1={chartBottom}
          x2={chartRight} y2={chartBottom}
          stroke="var(--gg-border-med)"
          strokeWidth="0.8"
        />
        {yAxisValues.map((axisValue) => (
          <text
            key={`${axisValue}-label`}
            x="1"
            y={plotY(axisValue) + 1.5}
            fontSize="3.6"
            fill="var(--gg-text-muted)"
            fontFamily="monospace"
          >
            {`${axisValue.toFixed(1)}${ySuffix}`}
          </text>
        ))}
        <text x={chartLeft} y="54" fontSize="3.8" fill="var(--gg-text-muted)">{firstDate}</text>
        <text x={chartRight - 16} y="54" fontSize="3.8" fill="var(--gg-text-muted)">{lastDate}</text>
        <polyline
          points={polyline}
          fill="none"
          stroke="var(--gg-a1)"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((point, index) => (
          <circle
            key={point.workoutId}
            cx={plotX(index)}
            cy={plotY(point.value)}
            r="1.4"
            fill="var(--gg-a2)"
          />
        ))}
      </svg>
    </div>
  );
});
