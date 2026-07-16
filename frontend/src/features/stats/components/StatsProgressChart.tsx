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
  height = 220,
  ySuffix = "",
  latestFormatter,
}: StatsProgressChartProps) {
  if (points.length === 0) {
    return (
      <div
        className="rounded-[20px] flex items-center justify-center"
        style={{
          height: 120,
          background: "var(--gg-surface)",
          border: "1.5px solid var(--gg-border)",
        }}
      >
        <p className="text-[13px]" style={{ color: "var(--gg-text-muted)" }}>
          Wykres pojawi się po zakończonych treningach
        </p>
      </div>
    );
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const yAxisValues = [...new Set(values.map((v) => Number(v.toFixed(1))))].sort((a, b) => a - b);
  const firstDate = new Date(points[0]!.workoutDate).toLocaleDateString("pl-PL");
  const lastDate = new Date(points[points.length - 1]!.workoutDate).toLocaleDateString("pl-PL");
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
      className="rounded-[20px]"
      style={{
        padding: "16px",
        background: "var(--gg-surface)",
        border: "1.5px solid var(--gg-border)",
        boxShadow: "var(--gg-shadow)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12px] font-semibold" style={{ color: "var(--gg-text-muted)" }}>
          {label}
        </span>
        <span className="font-barlow-condensed font-bold text-[18px]" style={{ color: "var(--gg-a1)" }}>
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
          >
            {`${axisValue.toFixed(1)}${ySuffix}`}
          </text>
        ))}
        <text x={chartLeft} y="54" fontSize="4" fill="var(--gg-text-muted)">{firstDate}</text>
        <text x={chartRight - 20} y="54" fontSize="4" fill="var(--gg-text-muted)">{lastDate}</text>
        <polyline
          points={polyline}
          fill="none"
          stroke="#059669"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((point, index) => (
          <circle
            key={point.workoutId}
            cx={plotX(index)}
            cy={plotY(point.value)}
            r="1.3"
            fill="#34D399"
          />
        ))}
      </svg>
    </div>
  );
});
