import { memo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";
import { fmtDayMonth } from "@/domain/formatters";
import type { ProgressionPoint } from "@/domain/stats";
import { fonts, pwaBarlow, tabularNums, toBoxShadow, useTheme } from "@/theme";

const MONO = Platform.select({ ios: "Menlo", default: "monospace" });
const LEFT = 18;
const RIGHT = 96;
const TOP = 8;
const BOTTOM = 46;

/** Port of StatsProgressChart.tsx: a 100x60 viewBox drawn with react-native-svg, same geometry as the PWA. */
export const StatsProgressChart = memo(function StatsProgressChart({
  points,
  label,
  height = 180,
  ySuffix = " kg",
}: {
  points: ProgressionPoint[];
  label: string;
  height?: number;
  ySuffix?: string;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  if (points.length === 0) {
    return (
      <View testID="chart-empty" style={[styles.empty, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[styles.emptyText, { color: c.textMuted }]}>Wykres pojawi się po zrealizowaniu sesji treningowych</Text>
      </View>
    );
  }
  const values = points.map((p) => p.maxSetWeight);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const axis = [...new Set(values.map((v) => Number(v.toFixed(1))))].sort((a, b) => a - b);
  const plotY = (v: number) => BOTTOM - ((v - min) / range) * (BOTTOM - TOP);
  const plotX = (i: number) => (points.length === 1 ? (LEFT + RIGHT) / 2 : LEFT + (i / (points.length - 1)) * (RIGHT - LEFT));
  const latest = values[values.length - 1]!;
  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, boxShadow: toBoxShadow(theme.shadow) }]}>
      <View style={styles.top}>
        <Text style={[styles.label, { color: c.textMuted }]}>{label}</Text>
        <Text testID="chart-latest" style={[styles.latest, { color: c.a2 }, tabularNums]}>{`${latest.toFixed(1)}${ySuffix}`}</Text>
      </View>
      <Svg testID="chart-svg" viewBox="0 0 100 60" width="100%" height={height} accessibilityLabel={label}>
        {axis.map((v) => (
          <Line key={v} x1={LEFT} y1={plotY(v)} x2={RIGHT} y2={plotY(v)} stroke={c.border} strokeWidth={0.45} strokeDasharray="1.5 1.5" />
        ))}
        <Line x1={LEFT} y1={TOP} x2={LEFT} y2={BOTTOM} stroke={c.borderMed} strokeWidth={0.8} />
        <Line x1={LEFT} y1={BOTTOM} x2={RIGHT} y2={BOTTOM} stroke={c.borderMed} strokeWidth={0.8} />
        {axis.map((v) => (
          <SvgText key={`l${v}`} x={1} y={plotY(v) + 1.5} fontSize={3.6} fill={c.textMuted} fontFamily={MONO}>
            {`${v.toFixed(1)}${ySuffix}`}
          </SvgText>
        ))}
        <SvgText x={LEFT} y={54} fontSize={3.8} fill={c.textMuted} fontFamily={fonts.dmSans[400]}>
          {fmtDayMonth(points[0]!.workoutDate)}
        </SvgText>
        <SvgText x={RIGHT - 16} y={54} fontSize={3.8} fill={c.textMuted} fontFamily={fonts.dmSans[400]}>
          {fmtDayMonth(points[points.length - 1]!.workoutDate)}
        </SvgText>
        <Polyline
          points={points.map((p, i) => `${plotX(i)},${plotY(p.maxSetWeight)}`).join(" ")}
          fill="none"
          stroke={c.a1}
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <Circle key={p.workoutId} cx={plotX(i)} cy={plotY(p.maxSetWeight)} r={1.4} fill={c.a2} />
        ))}
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  empty: { height: 120, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyText: { fontFamily: fonts.dmSans[400], fontSize: 13, lineHeight: 19.5, textAlign: "center" },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  label: { fontFamily: fonts.dmSans[700], fontSize: 12, lineHeight: 18, letterSpacing: 0.6, textTransform: "uppercase", flexShrink: 1 },
  latest: { fontFamily: pwaBarlow[800], fontSize: 17, lineHeight: 25.5 },
});
