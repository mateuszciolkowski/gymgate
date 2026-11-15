import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { fonts, useTheme } from "@/theme";
import { Spinner } from "./Spinner";

export interface ButtonProps {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  loadingText?: string;
  icon?: ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  children: string;
}

// Sizes from frontend/src/components/ui/Button.tsx.
const sizes = {
  sm: { paddingVertical: 9, paddingHorizontal: 16, fontSize: 13, borderRadius: 12, minHeight: 38 },
  md: { paddingVertical: 12, paddingHorizontal: 18, fontSize: 14, borderRadius: 14, minHeight: 44 },
  lg: { paddingVertical: 15, paddingHorizontal: 22, fontSize: 15, borderRadius: 16, minHeight: 52 },
} as const;

const DANGER_BG = "rgba(239,68,68,0.12)";
const DANGER_BORDER = "rgba(239,68,68,0.3)";

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingText,
  icon,
  fullWidth = false,
  disabled = false,
  onPress,
  accessibilityLabel,
  testID,
  style,
  children,
}: ButtonProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const s = sizes[size];
  const isPrimary = variant === "primary";
  const gradient = isPrimary && !loading;

  const color = { primary: "#ffffff", secondary: c.text, danger: c.error, ghost: c.textSub }[variant];
  const variantStyle: ViewStyle = {
    primary: {
      backgroundColor: loading ? c.surface3 : undefined,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.15)",
      boxShadow: loading ? undefined : [{ offsetX: 0, offsetY: 4, blurRadius: 22, color: c.glow }],
    },
    secondary: {
      backgroundColor: c.surface2,
      borderWidth: 1,
      borderColor: c.borderMed,
      boxShadow: [{ offsetX: 0, offsetY: 1, blurRadius: 3, color: "rgba(0, 0, 0, 0.2)" }],
    },
    danger: { backgroundColor: DANGER_BG, borderWidth: 1, borderColor: DANGER_BORDER },
    ghost: { backgroundColor: "transparent" },
  }[variant];

  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: inactive, busy: loading }}
      testID={testID}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: s.minHeight,
          borderRadius: s.borderRadius,
          paddingVertical: s.paddingVertical,
          paddingHorizontal: s.paddingHorizontal,
          alignSelf: fullWidth ? "stretch" : "auto",
          opacity: disabled ? 0.5 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        variantStyle,
        style,
      ]}
    >
      {gradient ? (
        <LinearGradient
          colors={theme.gradBtn.colors}
          start={theme.gradBtn.start}
          end={theme.gradBtn.end}
          style={[StyleSheet.absoluteFill, { borderRadius: s.borderRadius - 1 }]}
        />
      ) : null}
      {loading ? (
        <>
          <Spinner color={color} />
          <Text style={[styles.label, { color, fontSize: s.fontSize, lineHeight: s.fontSize * 1.5 }]}>{loadingText ?? children}</Text>
        </>
      ) : (
        <>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          <Text style={[styles.label, { color, fontSize: s.fontSize, lineHeight: s.fontSize * 1.5 }]}>{children}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  label: { fontFamily: fonts.dmSans[700] },
  icon: { flexShrink: 0, flexDirection: "row", alignItems: "center" },
});
