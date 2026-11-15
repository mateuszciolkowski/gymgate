import { useRouter, useSegments } from "expo-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { BackHandler, Platform, StyleSheet, View } from "react-native";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";
import { BottomBar } from "./BottomBar";
import { Drawer } from "./Drawer";
import { NavContext, type NavUser } from "./NavContext";
import { isTabId, type TabId } from "./tabs";

const SETTLE = { duration: 300, easing: Easing.bezier(0.25, 0.1, 0.25, 1) };

interface NavShellProps {
  children: ReactNode;
  /** Logged-in user for the drawer profile; null until the session layer exists. */
  user?: NavUser | null;
  onLogout?: () => void;
  /** Replaces the "Nowy trening" button while a workout is in progress ("Kontynuuj trening"). */
  workoutPill?: ReactNode;
}

/**
 * Renders the stack (children) with the floating bar and the drawer above it, so both stay visible on
 * sub-screens (D-09). The edge swipe only works on tab screens (D-08).
 */
export function NavShell({ children, user = null, onLogout, workoutPill }: NavShellProps) {
  const router = useRouter();
  const segments = useSegments() as string[];
  const [drawerOpen, setDrawerOpen] = useState(false);
  const progress = useSharedValue(0);

  const onTabScreen = segments[1] === "(tabs)";
  // Bottom sheets cover the bar.
  const onSheet = segments[1] === "workout-new" || segments[1] === "exercise-picker";
  const currentTab = onTabScreen && isTabId(segments[2]) ? segments[2] : null;
  const [lastTab, setLastTab] = useState<TabId>("trainings");
  if (currentTab && currentTab !== lastTab) setLastTab(currentTab);
  // Sub-screens keep the tab they came from highlighted; the workout screen highlights none.
  const activeTab = onTabScreen ? currentTab : segments[1] === "workout" ? null : lastTab;

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    progress.set(withTiming(1, SETTLE));
  }, [progress]);
  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    progress.set(withTiming(0, SETTLE));
  }, [progress]);
  // Gesture end already animates `progress`; only the React state is synced.
  const syncOpened = useCallback(() => setDrawerOpen(true), []);
  

  const goToTab = useCallback(
    (tab: TabId) => {
      router.navigate(`/${tab}`);
    },
    [router],
  );

  // Android back (PLAN section 3): drawer first, then any tab other than Treningi goes to Treningi.
  // Sub-screens pop through the stack and Treningi leaves the app (default handling).
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (drawerOpen) {
        closeDrawer();
        return true;
      }
      if (onTabScreen && currentTab && currentTab !== "trainings") {
        goToTab("trainings");
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [drawerOpen, onTabScreen, currentTab, closeDrawer, goToTab]);

  const ctx = useMemo(() => ({ drawerOpen, openDrawer, closeDrawer }), [drawerOpen, openDrawer, closeDrawer]);

  return (
    <NavContext.Provider value={ctx}>
      <View style={styles.root}>
        {children}
        {onSheet ? null : (
          <BottomBar
            activeTab={activeTab}
            onTabPress={goToTab}
            onAddWorkout={() => router.push("/workout-new")}
            onOpenMenu={openDrawer}
            workoutPill={workoutPill}
          />
        )}
        <Drawer
          progress={progress}
          isOpen={drawerOpen}
          edgeEnabled={onTabScreen}
          activeTab={activeTab}
          user={user}
          onOpened={syncOpened}
          onClose={() => {
            closeDrawer();
          }}
          onNavigate={(tab) => {
            goToTab(tab);
            closeDrawer();
          }}
          onLogout={() => {
            onLogout?.();
            closeDrawer();
          }}
        />
      </View>
    </NavContext.Provider>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
