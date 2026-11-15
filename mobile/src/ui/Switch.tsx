import { useEffect, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { fonts, useTheme } from "@/theme";

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  badge?: string;
  variant?: "accent" | "admin" | "default";
  icon?: ReactNode;
}

/** Hex colour `#rrggbb` with alpha, for the PWA `color-mix(in srgb, X p%, transparent|surface)` cases. */
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** `color-mix(in srgb, a pct, b)` for two opaque `#rrggbb` colours. */
export function mixHex(a: string, pct: number, b: string): string {
  const x = parseInt(a.slice(1, 7), 16);
  const y = parseInt(b.slice(1, 7), 16);
  const ch = (shift: number) => Math.round(((x >> shift) & 255) * pct + ((y >> shift) & 255) * (1 - pct));
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}

export function Switch({ checked, onChange, disabled = false, label, description, badge, variant = "accent", icon }: SwitchProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const activeColor = variant === "admin" ? c.a2 : c.a1;
  const trackOn = variant === "default" ? c.btnBg : activeColor;

  const progress = useSharedValue(checked ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(checked ? 1 : 0, { duration: 200 });
  }, [checked, progress]);
  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [c.surface3, trackOn]),
  }));
  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: progress.value * 20 }] }));

  const track = (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.knob, knobStyle]} />
      </Animated.View>
    </Pressable>
  );

  if (!label && !description) return track;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: checked ? mixHex(activeColor, 0.06, c.surface) : c.surface2,
          borderColor: checked ? activeColor : c.border,
        },
      ]}
    >
      <View style={styles.left}>
        {icon ? (
          <View style={[styles.icon, { backgroundColor: checked ? withAlpha(activeColor, 0.15) : c.surface2 }]}>{icon}</View>
        ) : null}
        <View style={styles.texts}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={[styles.label, { color: c.text }]}>
              {label}
            </Text>
            {badge ? (
              <Text style={[styles.badge, { backgroundColor: activeColor }]}>{badge}</Text>
            ) : null}
          </View>
          {description ? <Text style={[styles.desc, { color: c.textMuted }]}>{description}</Text> : null}
        </View>
      </View>
      {track}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: 48, height: 28, borderRadius: 14, padding: 2 },
  knob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    boxShadow: [{ offsetX: 0, offsetY: 1, blurRadius: 3, color: "rgba(0,0,0,0.3)" }],
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  left: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, paddingRight: 12 },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  texts: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { fontFamily: fonts.dmSans[700], fontSize: 14, lineHeight: 21, flexShrink: 1 },
  badge: {
    fontFamily: fonts.dmSans[700],
    fontSize: 10,
    lineHeight: 15,
    color: "#000000",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  desc: { fontFamily: fonts.dmSans[400], fontSize: 12, lineHeight: 16.5, marginTop: 2 },
});
