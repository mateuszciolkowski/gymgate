import { BlurView } from "expo-blur";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { pwaBarlow, toBoxShadow, useTheme } from "@/theme";
import { Icon } from "../icons";
import { BAR_TABS, type TabId } from "./tabs";

interface BottomBarProps {
  activeTab: TabId | null;
  onTabPress: (tab: TabId) => void;
  onAddWorkout: () => void;
  onOpenMenu: () => void;
  workoutPill?: ReactNode;
}

/** Floating pill bar (PWA BottomNavigation): 3 tab buttons, menu button, spacer, "Nowy trening". */
export function BottomBar({ activeTab, onTabPress, onAddWorkout, onOpenMenu, workoutPill }: BottomBarProps) {
  const { theme, isDark } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="box-none"
      accessibilityRole="tablist"
      style={[styles.outer, { paddingBottom: Math.max(16, insets.bottom) }]}
    >
      <View style={[styles.shadow, { boxShadow: toBoxShadow(theme.shadowElevated) }]}>
        <View style={[styles.bar, { borderColor: c.borderMed }]}>
          <BlurView intensity={40} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: c.navBg }]} />
          {BAR_TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                accessibilityRole="tab"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected: active }}
                testID={`bar-tab-${tab.id}`}
                onPress={() => onTabPress(tab.id)}
                style={({ pressed }) => [
                  styles.iconButton,
                  { backgroundColor: active ? c.surface2 : "transparent", transform: [{ scale: pressed ? 0.95 : 1 }] },
                ]}
              >
                <Icon name={tab.icon} size={20} strokeWidth={active ? 2.3 : 1.8} color={active ? c.a2 : c.textMuted} />
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Otwórz menu"
            testID="bar-menu"
            onPress={onOpenMenu}
            style={({ pressed }) => [styles.iconButton, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}
          >
            <Icon name="menuLines" color={c.textMuted} />
          </Pressable>
          <View style={styles.spacer} />
          {workoutPill ?? (
          <Pressable
              accessibilityRole="button"
              accessibilityLabel="Nowy trening"
              testID="bar-new-workout"
              onPress={onAddWorkout}
              style={({ pressed }) => [
                styles.newWorkout,
                {
                  backgroundColor: c.btnBg,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                  boxShadow: [{ offsetX: 0, offsetY: 2, blurRadius: 10, color: "rgba(0,0,0,0.3)" }],
                },
              ]}
            >
              <Text style={styles.newWorkoutLabel}>Nowy trening</Text>
              <Icon name="plusLines" color="#ffffff" />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingTop: 8, paddingHorizontal: 16, alignItems: "center", zIndex: 30 },
  shadow: { width: "100%", maxWidth: 448, borderRadius: 999 },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    overflow: "hidden",
  },
  iconButton: { width: 40, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  spacer: { flex: 1 },
  newWorkout: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  newWorkoutLabel: { fontFamily: pwaBarlow[700], fontSize: 14, lineHeight: 21, color: "#ffffff" },
});
