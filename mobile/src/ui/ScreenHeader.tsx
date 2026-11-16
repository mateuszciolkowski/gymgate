import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fonts, pwaBarlow, useTheme } from "@/theme";
import { Icon } from "./icons";

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  label?: string;
  action?: ReactNode;
  rightSlot?: ReactNode;
  onBack?: () => void;
}

/** Header of frontend/src/components/ui/ScreenHeader.tsx (label, 36 px title, optional back button and right slot). */
export function ScreenHeader({
  title,
  subtitle,
  label,
  action,
  rightSlot,
  onBack,
}: ScreenHeaderProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={styles.root}>
      <View style={styles.left}>
        {onBack ? (
          <Pressable
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Wróć"
            onPress={onBack}
            style={[styles.back, { backgroundColor: c.surface2, borderColor: c.border }]}
          >
            <Icon name="chevronLeft" size={18} strokeWidth={2} color={c.text} />
          </Pressable>
        ) : null}
        <View style={styles.flex}>
          {label ? <Text style={[styles.label, { color: c.textMuted }]}>{label}</Text> : null}
          <Text accessibilityRole="header" style={[styles.title, { color: c.text }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: c.textMuted }]}>{subtitle}</Text>
          ) : null}
          {action ? <View style={styles.action}>{action}</View> : null}
        </View>
      </View>
      {rightSlot ? <View style={styles.right}>{rightSlot}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  left: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  flex: { flex: 1 },
  back: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: fonts.dmSans[700],
    fontSize: 11,
    lineHeight: 16.5,
    letterSpacing: 1.32,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: { fontFamily: pwaBarlow[900], fontSize: 36, lineHeight: 36, letterSpacing: -1.08 },
  subtitle: { fontFamily: fonts.dmSans[400], fontSize: 14, lineHeight: 21, marginTop: 4 },
  action: { marginTop: 12 },
  right: { flexShrink: 0, marginLeft: 12 },
});
