import { Button, HStack, Image, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import { buttonStyle, controlSize, font, foregroundStyle, frame, layoutPriority, lineLimit, minimumScaleFactor, monospacedDigit, multilineTextAlignment, padding, tint } from "@expo/ui/swift-ui/modifiers";
import { addUserInteractionListener, createLiveActivity, type LiveActivityEnvironment } from "expo-widgets";
import type { ActivityProps } from "./content";

/**
 * The layout runs in the widget extension's own JS runtime: no hooks, no module scope, so everything is declared
 * inside. The timer is a SwiftUI `Text(timerInterval:)` (the system ticks it, P3). When the system marks the
 * activity stale (2 h without activity, P7) it shows "Trening wstrzymany" with the timer paused at the last activity.
 * Every text is one line and the two buttons share the width, so the lock-screen card is full but never overflows.
 * Icons are SF Symbols, no emoji.
 */
const WorkoutActivity = (p: ActivityProps, env: LiveActivityEnvironment) => {
  "widget";
  const stale = env.isStale === true || p.abandoned;
  const muted = "#9CA3AF";
  const accent = stale ? muted : p.accent;
  const start = new Date(p.startedAt);
  const wide = frame({ maxWidth: 10000 });
  const timer = (size: number) => (
    <Text
      timerInterval={{ lower: start, upper: new Date(stale ? Math.max(p.lastActivityAt, p.startedAt) : p.startedAt + 99 * 3600 * 1000) }}
      pauseTime={stale ? new Date(p.lastActivityAt) : undefined}
      countsDown={false}
      modifiers={[font({ size, weight: "bold", design: "monospaced" }), foregroundStyle(accent), lineLimit(1)]}
    />
  );
  const text = (value: string, size: number, color?: string, weight?: "medium" | "semibold" | "bold") => (
    <Text modifiers={[font({ size, weight }), ...(color ? [foregroundStyle(color)] : []), lineLimit(1)]}>{value}</Text>
  );
  const status = stale ? "Trening wstrzymany" : p.plan;
  const exercise = p.exercise ?? "Dodaj pierwsze ćwiczenie";
  const header = (timerSize: number) => (
    <HStack spacing={6}>
      <Image systemName={stale ? "pause.circle.fill" : "figure.strengthtraining.traditional"} color={accent} size={15} />
      {status ? text(status, 13, stale ? muted : undefined, "semibold") : null}
      <Spacer />
      {timer(timerSize)}
    </HStack>
  );
  // "Wyciskanie sztangi – seria 3": the name shortens, the set number always stays visible.
  const exerciseRow = (
    <HStack spacing={4}>
      {text(exercise, 16, undefined, "bold")}
      {p.setLabel ? (
        <Text modifiers={[font({ size: 16, weight: "semibold" }), foregroundStyle(accent), lineLimit(1), layoutPriority(1)]}>{`– ${p.setLabel}`}</Text>
      ) : null}
      <Spacer />
    </HStack>
  );
  const logged = p.logged ? (
    <HStack spacing={5}>
      <Image systemName="checkmark.circle.fill" color={accent} size={13} />
      {text(p.logged, 13, accent, "semibold")}
    </HStack>
  ) : null;
  // Buttons are handled by the running app (useLiveActivity); hidden while paused.
  const buttons =
    !stale && (p.proposal || p.next) ? (
      <HStack spacing={8}>
        {p.proposal ? (
          <Button
            label={p.proposal}
            systemImage="plus.circle.fill"
            target="add-set"
            modifiers={[buttonStyle("borderedProminent"), controlSize("regular"), tint(p.accent), lineLimit(1), wide]}
          />
        ) : null}
        {p.next ? (
          <Button
            label={p.next}
            systemImage="forward.end.fill"
            target="next-exercise"
            modifiers={[buttonStyle("bordered"), controlSize("regular"), tint(p.accent), lineLimit(1), wide]}
          />
        ) : null}
      </HStack>
    ) : null;
  return {
    banner: (
      <VStack alignment="leading" spacing={6} modifiers={[padding({ horizontal: 16, vertical: 14 })]}>
        {header(24)}
        {exerciseRow}
        {logged}
        {buttons}
      </VStack>
    ),
    // Small, fixed-size symbol inset from the rounded edge, so the figure is not clipped by the island's corner.
    compactLeading: (
      <Image
        systemName={stale ? "pause.circle.fill" : "figure.strengthtraining.traditional"}
        color={accent}
        size={14}
        modifiers={[padding({ leading: 6 }), frame({ width: 28, height: 22, alignment: "center" })]}
      />
    ),
    // A system timer text reserves room for its longest value: pin it to a narrow width at the trailing edge.
    compactTrailing: (
      <Text
        timerInterval={{ lower: start, upper: new Date(stale ? Math.max(p.lastActivityAt, p.startedAt) : p.startedAt + 99 * 3600 * 1000) }}
        pauseTime={stale ? new Date(p.lastActivityAt) : undefined}
        countsDown={false}
        modifiers={[
          font({ size: 14, weight: "semibold" }),
          monospacedDigit(),
          foregroundStyle(accent),
          lineLimit(1),
          minimumScaleFactor(0.7),
          multilineTextAlignment("trailing"),
          frame({ width: 46, alignment: "trailing" }),
        ]}
      />
    ),
    minimal: (
      <Image
        systemName={stale ? "pause.circle.fill" : "figure.strengthtraining.traditional"}
        color={accent}
        size={13}
        modifiers={[frame({ width: 22, height: 22, alignment: "center" })]}
      />
    ),
    expandedLeading: (
      <VStack modifiers={[padding({ leading: 8, top: 6 })]}>
        <Image systemName={stale ? "pause.circle.fill" : "figure.strengthtraining.traditional"} color={accent} size={18} />
      </VStack>
    ),
    expandedCenter: <VStack modifiers={[padding({ top: 6 })]}>{status ? text(status, 13, stale ? muted : undefined, "semibold") : null}</VStack>,
    // Top-right corner: right-aligned in a fixed width (a system timer otherwise reserves room and looks indented).
    expandedTrailing: (
      <Text
        timerInterval={{ lower: start, upper: new Date(stale ? Math.max(p.lastActivityAt, p.startedAt) : p.startedAt + 99 * 3600 * 1000) }}
        pauseTime={stale ? new Date(p.lastActivityAt) : undefined}
        countsDown={false}
        modifiers={[
          font({ size: 20, weight: "bold" }),
          monospacedDigit(),
          foregroundStyle(accent),
          lineLimit(1),
          minimumScaleFactor(0.7),
          multilineTextAlignment("trailing"),
          frame({ width: 84, alignment: "topTrailing" }),
          padding({ trailing: 6, top: 4 }),
        ]}
      />
    ),
    expandedBottom: (
      <VStack alignment="leading" spacing={5} modifiers={[padding({ horizontal: 10, bottom: 6 })]}>
        {exerciseRow}
        {logged}
        {buttons}
      </VStack>
    ),
  };
};

export const workoutActivity = createLiveActivity("WorkoutActivity", WorkoutActivity);

/** Taps on the activity's buttons ("add-set", "next-exercise"), delivered to the running app. */
export const onActivityButton = (cb: (target: string) => void) => addUserInteractionListener((e) => cb(e.target));
