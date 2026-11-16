import { HStack, Image, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import { font, foregroundStyle, padding } from "@expo/ui/swift-ui/modifiers";
import { createLiveActivity, type LiveActivityEnvironment } from "expo-widgets";
import type { ActivityProps } from "./content";

/**
 * The layout runs in the widget extension's own JS runtime: no hooks, no module scope, so everything is declared
 * inside. The timer is a SwiftUI `Text(timerInterval:)` (the system ticks it, P3). When the system marks the
 * activity stale (2 h without activity, P7) it shows "Trening wstrzymany" with the timer paused at the last activity.
 */
const WorkoutActivity = (p: ActivityProps, env: LiveActivityEnvironment) => {
  "widget";
  const stale = env.isStale === true || p.abandoned;
  const start = new Date(p.startedAt);
  const timer = (size: number) => (
    <Text
      timerInterval={{ lower: start, upper: new Date(stale ? Math.max(p.lastActivityAt, p.startedAt) : p.startedAt + 99 * 3600 * 1000) }}
      pauseTime={stale ? new Date(p.lastActivityAt) : undefined}
      countsDown={false}
      modifiers={[font({ size, weight: "bold", design: "monospaced" }), foregroundStyle(stale ? "#9CA3AF" : p.accent)]}
    />
  );
  const detail = p.exercise ?? "Dodaj pierwsze ćwiczenie";
  const sets = p.exercise ? `Serie: ${p.sets}${p.lastSet ? ` · ${p.lastSet}` : ""}` : "";
  const status = stale ? "Trening wstrzymany" : p.name;
  const icon = <Image systemName={stale ? "pause.circle.fill" : "dumbbell.fill"} color={stale ? "#9CA3AF" : p.accent} />;
  return {
    banner: (
      <HStack modifiers={[padding({ all: 14 })]}>
        <VStack alignment="leading" spacing={2}>
          <Text modifiers={[font({ size: 13, weight: "semibold" })]}>{status}</Text>
          <Text modifiers={[font({ size: 12 })]}>{detail}</Text>
          <Text modifiers={[font({ size: 12 })]}>{sets}</Text>
        </VStack>
        <Spacer />
        {timer(26)}
      </HStack>
    ),
    compactLeading: icon,
    compactTrailing: timer(13),
    minimal: icon,
    expandedLeading: <VStack modifiers={[padding({ all: 8 })]}>{icon}</VStack>,
    expandedCenter: (
      <VStack modifiers={[padding({ all: 4 })]}>
        <Text modifiers={[font({ size: 13, weight: "semibold" })]}>{status}</Text>
      </VStack>
    ),
    expandedTrailing: <VStack modifiers={[padding({ all: 8 })]}>{timer(18)}</VStack>,
    expandedBottom: (
      <VStack modifiers={[padding({ all: 8 })]}>
        <Text modifiers={[font({ size: 13 })]}>{detail}</Text>
        <Text modifiers={[font({ size: 13 })]}>{sets}</Text>
      </VStack>
    ),
  };
};

export const workoutActivity = createLiveActivity("WorkoutActivity", WorkoutActivity);
