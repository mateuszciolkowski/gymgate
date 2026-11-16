import Constants from "expo-constants";
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { logoutWithPrompt } from "@/features/auth/logout";
import { useSession, useSync } from "@/providers";
import { fonts, pwaBarlow, toBoxShadow, useTheme } from "@/theme";
import { chooseLogout, confirmAlert, Icon, ScreenContainer, ScreenHeader, showAlert } from "@/ui";
import { DeleteAccountModal } from "./DeleteAccountModal";
import { refreshCache, refreshConfirmText } from "./settingsActions";
import { THEME_OPTIONS } from "./themeOptions";
import { ThemeSheet } from "./ThemeSheet";

function Row({ icon, label, desc, onPress, testID, danger, chevron = true }: { icon: ReactNode; label: string; desc?: string; onPress: () => void; testID: string; danger?: boolean; chevron?: boolean }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={desc ? `${label}. ${desc}` : label}
      testID={testID}
      onPress={onPress}
      style={[styles.row, { backgroundColor: c.surface, borderColor: c.border, boxShadow: toBoxShadow(theme.shadow) }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: danger ? "rgba(239,68,68,0.12)" : c.surface2 }]}>{icon}</View>
      <View style={styles.flex}>
        <Text numberOfLines={1} style={[styles.rowLabel, { color: danger ? c.error : c.text }]}>
          {label}
        </Text>
        {desc ? (
          <Text numberOfLines={1} style={[styles.rowDesc, { color: c.textMuted }]}>
            {desc}
          </Text>
        ) : null}
      </View>
      {chevron ? <Icon name="chevronRight" size={15} color={c.textMuted} /> : null}
    </Pressable>
  );
}

/** Settings tab (PWA MenuScreen): profile card, theme, cache refresh, logout, version; plus account deletion (D4). */
export function SettingsScreen() {
  const { theme, themeName } = useTheme();
  const c = theme.colors;
  const { state, logout, session } = useSession();
  const { engine, state: sync } = useSync();
  const [themeOpen, setThemeOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const user = state.user;
  const initials = user ? `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase() : "?";
  const themeLabel = THEME_OPTIONS.find((t) => t.id === themeName)?.label ?? "Ciemny";

  const refresh = async () => {
    if (!(await confirmAlert(refreshConfirmText(sync.pending)))) return;
    showAlert(await refreshCache(engine).catch(() => refreshCache(null)));
  };
  const onLogout = () => logoutWithPrompt(logout, chooseLogout).catch(() => showAlert("Nie udało się wylogować"));

  return (
    <ScreenContainer>
      <ScreenHeader label="Ustawienia" title="Profil i opcje" />

      {user ? (
        <View testID="profile-card" style={[styles.profile, { backgroundColor: c.surface, borderColor: c.border, boxShadow: toBoxShadow(theme.shadow) }]}>
          <View style={[styles.avatar, { backgroundColor: c.btnBg }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.flex}>
            <Text numberOfLines={1} style={[styles.name, { color: c.text }]}>
              {user.firstName} {user.lastName}
            </Text>
            <Text numberOfLines={1} style={[styles.email, { color: c.textMuted }]}>
              {user.email}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.list}>
        <Row testID="settings-theme" icon={<Icon name="themeTarget" color={c.textSub} />} label="Motyw kolorystyczny" desc={`Aktualny: ${themeLabel}`} onPress={() => setThemeOpen(true)} />
        <Row testID="settings-refresh" icon={<Icon name="refresh" color={c.textSub} />} label="Odśwież pamięć podręczną (Cache)" desc="Wyczyść dane offline i pobierz najnowsze z serwera" onPress={() => void refresh()} />
        <View style={styles.gap}>
          <Row testID="settings-logout" danger chevron={false} icon={<Icon name="logout" size={18} strokeWidth={2} color={c.error} />} label="Wyloguj się" onPress={() => void onLogout()} />
        </View>
        <Row testID="settings-delete" danger chevron={false} icon={<Icon name="trash" size={18} strokeWidth={2} color={c.error} />} label="Usuń konto" onPress={() => setDeleteOpen(true)} />
      </View>

      <Text style={[styles.footer, { color: c.textMuted }]}>GymGate v{Constants.expoConfig?.version ?? "1.0.0"} · Offline-First Training App</Text>

      <ThemeSheet isOpen={themeOpen} onClose={() => setThemeOpen(false)} />
      <DeleteAccountModal
        isOpen={deleteOpen}
        pending={sync.pending}
        onClose={() => setDeleteOpen(false)}
        onConfirm={async (password) => {
          await session.deleteAccount(password);
          setDeleteOpen(false);
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  profile: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 20 },
  avatar: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: pwaBarlow[800], fontSize: 18, lineHeight: 27, color: "#ffffff" },
  name: { fontFamily: pwaBarlow[700], fontSize: 17, lineHeight: 25.5 },
  email: { fontFamily: fonts.dmSans[400], fontSize: 12, lineHeight: 18 },
  list: { gap: 10 },
  gap: { marginTop: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 44, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1 },
  rowIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  rowLabel: { fontFamily: fonts.dmSans[700], fontSize: 14, lineHeight: 21 },
  rowDesc: { fontFamily: fonts.dmSans[400], fontSize: 11, lineHeight: 16.5, marginTop: 2 },
  footer: { fontFamily: fonts.dmSans[400], fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 32 },
});
