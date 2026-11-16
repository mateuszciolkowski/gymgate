import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, {
  clamp,
  useAnimatedStyle,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts, pwaBarlow, useTheme } from "@/theme";
import { Icon } from "../icons";
import {
  DRAG_START_SLOP,
  EDGE_ZONE_WIDTH,
  drawerWidth,
  shouldClose,
  shouldOpen,
} from "./drawerMath";
import type { NavUser } from "./NavContext";
import { DRAWER_ITEMS, type TabId } from "./tabs";

const SETTLE = { duration: 300 };
const EDGE_BOTTOM_GAP = 80;

interface DrawerProps {
  progress: SharedValue<number>;
  isOpen: boolean;
  edgeEnabled: boolean;
  activeTab: TabId | null;
  user: NavUser | null;
  onOpened: () => void;
  onClose: () => void;
  onNavigate: (tab: TabId) => void;
  onLogout: () => void;
}

/** Side drawer (PWA NavigationDrawer): follows the finger; opens at 35% / closes at 30% of its width. */
export function Drawer({
  progress,
  isOpen,
  edgeEnabled,
  activeTab,
  user,
  onOpened,
  onClose,
  onNavigate,
  onLogout,
}: DrawerProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const width = drawerWidth(screenWidth);

  const openPan = usePanGesture({
    activeOffsetX: DRAG_START_SLOP,
    enabled: edgeEnabled && !isOpen,
    onUpdate: (e) => {
      "worklet";
      progress.set(clamp(e.translationX / width, 0, 1));
    },
    onDeactivate: (e) => {
      "worklet";
      if (shouldOpen(e.translationX, width)) {
        progress.set(withTiming(1, SETTLE));
        scheduleOnRN(onOpened);
      } else {
        progress.set(withTiming(0, SETTLE));
      }
    },
  });

  const closePan = usePanGesture({
    activeOffsetX: -DRAG_START_SLOP,
    enabled: isOpen,
    onUpdate: (e) => {
      "worklet";
      progress.set(clamp(1 + e.translationX / width, 0, 1));
    },
    onDeactivate: (e) => {
      "worklet";
      if (shouldClose(-e.translationX, width)) {
        progress.set(withTiming(0, SETTLE));
        scheduleOnRN(onClose);
      } else {
        progress.set(withTiming(1, SETTLE));
      }
    },
  });

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const panelStyle = useAnimatedStyle(() => ({
    opacity: progress.get() > 0 ? 1 : 0,
    transform: [{ translateX: (progress.get() - 1) * width }],
  }));

  const initials = user ? `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase() : "?";

  return (
    <>
      <GestureDetector gesture={openPan}>
        <View
          testID="drawer-edge"
          style={[styles.edge, { bottom: EDGE_BOTTOM_GAP }]}
          pointerEvents={edgeEnabled && !isOpen ? "auto" : "none"}
        />
      </GestureDetector>

      <GestureDetector gesture={closePan}>
        <View style={styles.overlay} pointerEvents={isOpen ? "auto" : "none"}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={onClose}
              accessibilityLabel="Zamknij menu"
            />
          </Animated.View>

          <Animated.View
            accessibilityViewIsModal
            style={[
              styles.panel,
              {
                width,
                backgroundColor: c.bg,
                borderRightColor: c.borderMed,
                paddingBottom: Math.max(insets.bottom, 0),
                boxShadow: [{ offsetX: 8, offsetY: 0, blurRadius: 40, color: "rgba(0,0,0,0.45)" }],
              },
              panelStyle,
            ]}
          >
            <Pressable
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Zamknij menu"
              testID="drawer-close"
              onPress={onClose}
              style={[styles.closeButton, { top: insets.top + 16, backgroundColor: c.surface2 }]}
            >
              <Icon name="close" color={c.textMuted} />
            </Pressable>

            <View
              style={[styles.profile, { paddingTop: insets.top + 56, borderBottomColor: c.border }]}
            >
              <View style={[styles.avatar, { backgroundColor: c.btnBg }]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              {user ? (
                <>
                  <Text numberOfLines={1} style={[styles.name, { color: c.text }]}>
                    {user.firstName} {user.lastName}
                  </Text>
                  <Text numberOfLines={1} style={[styles.email, { color: c.textMuted }]}>
                    {user.email}
                  </Text>
                </>
              ) : null}
            </View>

            <View style={styles.items}>
              {DRAWER_ITEMS.map((item) => {
                const active = activeTab === item.id;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    testID={`drawer-item-${item.id}`}
                    onPress={() => onNavigate(item.id)}
                    style={[styles.item, { backgroundColor: active ? c.surface2 : "transparent" }]}
                  >
                    <Icon
                      name={item.icon}
                      size={22}
                      strokeWidth={1.8}
                      color={active ? c.a2 : c.textMuted}
                    />
                    <Text style={[styles.itemLabel, { color: active ? c.text : c.textSub }]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.flex} />

            <View style={styles.logoutWrap}>
              <Pressable
                accessibilityRole="button"
                testID="drawer-logout"
                onPress={onLogout}
                style={styles.logout}
              >
                <Icon name="logout" color={c.error} />
                <Text style={[styles.logoutLabel, { color: c.error }]}>Wyloguj się</Text>
              </Pressable>
            </View>
            <Text style={[styles.version, { color: c.textMuted }]}>GymGate v1.0.0</Text>
          </Animated.View>
        </View>
      </GestureDetector>
    </>
  );
}

const styles = StyleSheet.create({
  edge: { position: "absolute", left: 0, top: 0, width: EDGE_ZONE_WIDTH, zIndex: 35 },
  overlay: { ...StyleSheet.absoluteFill, zIndex: 40 },
  backdrop: { backgroundColor: "rgba(0,0,0,0.6)" },
  panel: { position: "absolute", top: 0, left: 0, bottom: 0, borderRightWidth: 1 },
  closeButton: {
    position: "absolute",
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  profile: { paddingHorizontal: 24, paddingBottom: 24, borderBottomWidth: 1 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { fontFamily: pwaBarlow[700], fontSize: 18, lineHeight: 27, color: "#ffffff" },
  name: { fontFamily: pwaBarlow[800], fontSize: 18, lineHeight: 27 },
  email: { fontFamily: fonts.dmSans[400], fontSize: 12, lineHeight: 18, marginTop: 2 },
  items: { paddingHorizontal: 12, paddingVertical: 12, gap: 4 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  itemLabel: { fontFamily: pwaBarlow[700], fontSize: 15, lineHeight: 22.5 },
  flex: { flex: 1 },
  logoutWrap: { paddingHorizontal: 12, paddingBottom: 12 },
  logout: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    minHeight: 44,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 14,
  },
  logoutLabel: { fontFamily: pwaBarlow[700], fontSize: 17, lineHeight: 25.5 },
  version: {
    fontFamily: fonts.dmSans[400],
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 28,
    paddingBottom: 28,
  },
});
