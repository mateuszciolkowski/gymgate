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
      <div className="bg-accent-50 dark:bg-gray-900 rounded-xl h-40 flex items-center justify-center border border-gray-300 dark:border-gray-700 transition-colors">
        <p className="text-gray-600 dark:text-gray-500 text-sm">
          Wykres pojawi się po zakończonych treningach
        </p>
      </div>
    );
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const yAxisValues = [...new Set(values.map((value) => Number(value.toFixed(1))))].sort(
    (a, b) => a - b,
  );
  const firstDate = new Date(points[0]!.workoutDate).toLocaleDateString("pl-PL");
  const lastDate = new Date(
    points[points.length - 1]!.workoutDate,
  ).toLocaleDateString("pl-PL");
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

  const polyline = points
    .map((point, index) => `${plotX(index)},${plotY(point.value)}`)
    .join(" ");

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-300 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {latestFormatter
            ? latestFormatter(values[values.length - 1]!)
            : `${values[values.length - 1]!.toFixed(1)}${ySuffix}`}
        </span>
      </div>
      <svg
        viewBox="0 0 100 60"
        role="img"
        aria-label={label}
        style={{ width: "100%", height }}
      >
        {yAxisValues.map((axisValue) => (
          <line
            key={axisValue}
            x1={chartLeft}
            y1={plotY(axisValue)}
            x2={chartRight}
            y2={plotY(axisValue)}
            stroke="currentColor"
            className="text-gray-200 dark:text-gray-800"
            strokeWidth="0.45"
            strokeDasharray="1.5 1.5"
          />
        ))}
        <line
          x1={chartLeft}
          y1={chartTop}
          x2={chartLeft}
          y2={chartBottom}
          stroke="currentColor"
          className="text-gray-300 dark:text-gray-700"
          strokeWidth="0.8"
        />
        <line
          x1={chartLeft}
          y1={chartBottom}
          x2={chartRight}
          y2={chartBottom}
          stroke="currentColor"
          className="text-gray-300 dark:text-gray-700"
          strokeWidth="0.8"
        />
        {yAxisValues.map((axisValue) => (
          <text
            key={`${axisValue}-label`}
            x="1"
            y={plotY(axisValue) + 1.5}
            fontSize="3.6"
            className="fill-gray-600 dark:fill-gray-400"
          >
            {`${axisValue.toFixed(1)}${ySuffix}`}
          </text>
        ))}
        <text
          x={chartLeft}
          y="54"
          fontSize="4"
          className="fill-gray-600 dark:fill-gray-400"
        >
          {firstDate}
        </text>
        <text
          x={chartRight - 20}
          y="54"
          fontSize="4"
          className="fill-gray-600 dark:fill-gray-400"
        >
          {lastDate}
        </text>
        <polyline
          points={polyline}
          fill="none"
          stroke="currentColor"
          className="text-emerald-500"
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
            className="fill-emerald-500"
          />
        ))}
      </svg>
    </div>
  );
});
