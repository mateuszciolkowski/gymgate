import { useRouter } from "expo-router";
import { useCallback, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaInsetsContext, useSafeAreaInsets } from "react-native-safe-area-context";
import type { Db } from "@/db/types";
import { useDbQuery, useSession, useSync } from "@/providers";
import { listOpenIssues } from "@/sync";
import { fonts, useTheme } from "@/theme";
import { SyncIssuesBanner } from "./SyncIssuesBanner";

export const OFFLINE_TEXT = "Brak połączenia z internetem — pracujesz offline";
export const REAUTH_TEXT = "Sesja wygasła. Zaloguj się ponownie, aby wysłać zmiany; aplikacja działa dalej na danych z telefonu.";

/**
 * Banners above every screen (like the PWA topBanner): offline with the number of unsent changes, and the
 * "log in again" notice. While a banner is shown it covers the status-bar area, so the screens below get top inset 0.
 */
export function StatusFrame({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state: session } = useSession();
  const { state, offline } = useSync();
  const reauth = session.status === "reauthRequired";
  const openIssues = useDbQuery(useCallback((d: Db) => listOpenIssues(d), []));
  const [hidden, setHidden] = useState<ReadonlySet<number>>(new Set());
  const issues = openIssues.some((i) => !hidden.has(i.id));
  const banners = offline || reauth || issues;

  const row = [styles.row, { backgroundColor: c.activeBg, borderBottomColor: c.activeBorder }];
  return (
    <View style={styles.root}>
      {banners ? (
        <View style={{ backgroundColor: c.activeBg, paddingTop: insets.top }}>
          {offline ? (
            <View style={row} testID="offline-banner">
              <View style={[styles.dot, { backgroundColor: c.activeBorder }]} />
              <Text style={[styles.text, { color: c.activeBorder }]}>
                {OFFLINE_TEXT}
                {state.pending > 0 ? <Text testID="offline-pending"> · Oczekujące zmiany: {state.pending}</Text> : null}
              </Text>
            </View>
          ) : null}
          {issues ? <SyncIssuesBanner issues={openIssues} online={!offline} onHide={() => setHidden(new Set(openIssues.map((i) => i.id)))} /> : null}
          {reauth ? (
            <View style={row} testID="reauth-banner">
              <Text style={[styles.text, { color: c.activeBorder }]}>{REAUTH_TEXT}</Text>
              <Pressable accessibilityRole="button" testID="reauth-login" onPress={() => router.push("/login")}>
                <Text style={[styles.action, { color: c.activeBorder }]}>Zaloguj się</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}
      <SafeAreaInsetsContext.Provider value={{ ...insets, top: banners ? 0 : insets.top }}>
        <View style={styles.root}>{children}</View>
      </SafeAreaInsetsContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { flex: 1, fontFamily: fonts.dmSans[600], fontSize: 11, lineHeight: 16.5 },
  action: { fontFamily: fonts.dmSans[700], fontSize: 11, lineHeight: 16.5 },
});
