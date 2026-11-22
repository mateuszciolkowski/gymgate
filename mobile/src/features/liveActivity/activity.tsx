import { Button, HStack, Image, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import { buttonStyle, controlSize, font, foregroundStyle, lineLimit, padding, tint } from "@expo/ui/swift-ui/modifiers";
import { addUserInteractionListener, createLiveActivity, type LiveActivityEnvironment } from "expo-widgets";
import type { ActivityProps } from "./content";

/**
 * The layout runs in the widget extension's own JS runtime: no hooks, no module scope, so everything is declared
 * inside. The timer is a SwiftUI `Text(timerInterval:)` (the system ticks it, P3). When the system marks the
 * activity stale (2 h without activity, P7) it shows "Trening wstrzymany" with the timer paused at the last activity.
 * Every text is limited to one line so the lock-screen card never overflows.
 */
const WorkoutActivity = (p: ActivityProps, env: LiveActivityEnvironment) => {
  "widget";
  const stale = env.isStale === true || p.abandoned;
  const muted = "#9CA3AF";
  const start = new Date(p.startedAt);
  const timer = (size: number) => (
    <Text
      timerInterval={{ lower: start, upper: new Date(stale ? Math.max(p.lastActivityAt, p.startedAt) : p.startedAt + 99 * 3600 * 1000) }}
      pauseTime={stale ? new Date(p.lastActivityAt) : undefined}
      countsDown={false}
      modifiers={[font({ size, weight: "bold", design: "monospaced" }), foregroundStyle(stale ? muted : p.accent), lineLimit(1)]}
    />
  );
  const line = (text: string, size: number, color?: string, weight?: "semibold" | "bold") => (
    <Text modifiers={[font({ size, weight }), ...(color ? [foregroundStyle(color)] : []), lineLimit(1)]}>{text}</Text>
  );
  // Top line: workout totals (the workout name is not needed); "Trening wstrzymany" when paused.
  const top = stale ? "Trening wstrzymany" : p.summary;
  const exercise = p.exercise ?? "Dodaj pierwsze ćwiczenie";
  const icon = <Image systemName={stale ? "pause.circle.fill" : "dumbbell.fill"} color={stale ? muted : p.accent} />;
  // Buttons are handled by the running app (useLiveActivity); hidden while paused.
  const buttons =
    !stale && (p.proposal || p.next) ? (
      <HStack spacing={8}>
        {p.proposal ? (
          <Button label={p.proposal} target="add-set" modifiers={[buttonStyle("borderedProminent"), controlSize("small"), tint(p.accent), lineLimit(1)]} />
        ) : null}
        {p.next ? <Button label={p.next} target="next-exercise" modifiers={[buttonStyle("bordered"), controlSize("small"), lineLimit(1)]} /> : null}
      </HStack>
    ) : null;
  return {
    banner: (
      <VStack alignment="leading" spacing={3} modifiers={[padding({ all: 12 })]}>
        <HStack spacing={8}>
          {line(top, 13, stale ? muted : undefined, "semibold")}
          <Spacer />
          {timer(22)}
        </HStack>
        {line(exercise, 14, undefined, "bold")}
        {p.logged ? line(p.logged, 12, p.accent) : null}
        {buttons}
      </VStack>
    ),
    compactLeading: icon,
    compactTrailing: timer(13),
    minimal: icon,
    expandedLeading: <VStack modifiers={[padding({ all: 8 })]}>{icon}</VStack>,
    expandedCenter: (
      <VStack modifiers={[padding({ all: 4 })]}>{line(top, 12, stale ? muted : undefined, "semibold")}</VStack>
    ),
    expandedTrailing: <VStack modifiers={[padding({ all: 8 })]}>{timer(18)}</VStack>,
    expandedBottom: (
      <VStack alignment="leading" spacing={3} modifiers={[padding({ horizontal: 8, vertical: 4 })]}>
        {line(exercise, 13, undefined, "semibold")}
        {p.logged ? line(p.logged, 12, p.accent) : null}
        {buttons}
      </VStack>
    ),
  };
};

export const workoutActivity = createLiveActivity("WorkoutActivity", WorkoutActivity);

/** Taps on the activity's buttons ("add-set", "next-exercise"), delivered to the running app. */
export const onActivityButton = (cb: (target: string) => void) => addUserInteractionListener((e) => cb(e.target));
