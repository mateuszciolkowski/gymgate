import { useState } from "react";
import { Modal as RNModal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts, pwaBarlow, toBoxShadow, useTheme } from "@/theme";
import { Icon } from "@/ui";
import { THEME_OPTIONS } from "./themeOptions";

/** Bottom sheet "Wybierz motyw kolorystyczny" (PWA ThemePicker): Ciemne / Jasne tabs, picking applies and closes. */
export function ThemeSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { theme, themeName, setTheme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<"dark" | "light">(theme.isDark ? "dark" : "light");
  const options = THEME_OPTIONS.filter((t) => t.isDark === (tab === "dark"));

  return (
    <RNModal visible={isOpen} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.fill}>
        <Pressable accessible={false} style={styles.backdrop} onPress={onClose} />
        <View
          testID="theme-sheet"
          style={[
            styles.sheet,
            { backgroundColor: c.surface, borderColor: c.borderMed, paddingBottom: Math.max(insets.bottom, 28), boxShadow: [{ offsetX: 0, offsetY: -8, blurRadius: 40, color: "rgba(0,0,0,0.5)" }] },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: c.surface3 }]} />
          <Text accessibilityRole="header" style={[styles.title, { color: c.text }]}>
            Wybierz motyw kolorystyczny
          </Text>
          <View style={[styles.tabs, { backgroundColor: c.surface2 }]}>
            {(["dark", "light"] as const).map((t) => (
              <Pressable
                key={t}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === t }}
                testID={`theme-tab-${t}`}
                onPress={() => setTab(t)}
                style={[styles.tab, tab === t && { backgroundColor: c.surface, boxShadow: toBoxShadow(theme.shadow) }]}
              >
                <Text style={[styles.tabText, { color: tab === t ? c.text : c.textMuted }]}>{t === "dark" ? "Ciemne" : "Jasne"}</Text>
              </Pressable>
            ))}
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            {options.map((t) => {
              const active = themeName === t.id;
              return (
                <Pressable
                  key={t.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${t.label}, ${t.desc}`}
                  testID={`theme-option-${t.id}`}
                  onPress={() => {
                    setTheme(t.id);
                    onClose();
                  }}
                  style={[styles.option, active ? { backgroundColor: c.surface2, borderColor: c.a1, borderWidth: 1.5 } : { borderColor: c.border }]}
                >
                  <View style={[styles.preview, { backgroundColor: t.bg }]}>
                    <View style={[styles.previewTop, { backgroundColor: t.accent }]} />
                    <View style={styles.dots}>
                      <View style={[styles.dot, { backgroundColor: t.dot1 }]} />
                      <View style={[styles.dot, { backgroundColor: t.dot2 }]} />
                    </View>
                  </View>
                  <View style={styles.flex}>
                    <Text style={[styles.label, { color: c.text }]}>{t.label}</Text>
                    <Text style={[styles.desc, { color: c.textMuted }]}>{t.desc}</Text>
                  </View>
                  {active ? (
                    <View testID="theme-active" style={[styles.check, { backgroundColor: c.a1 }]}>
                      <Icon name="check" size={12} strokeWidth={3} color="#ffffff" />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.65)" },
  sheet: { maxHeight: "80%", width: "100%", maxWidth: 672, alignSelf: "center", borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, paddingTop: 24, paddingHorizontal: 20 },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, marginBottom: 20 },
  title: { fontFamily: pwaBarlow[800], fontSize: 20, lineHeight: 30, marginBottom: 16 },
  tabs: { flexDirection: "row", gap: 4, padding: 4, borderRadius: 16, marginBottom: 16 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 12 },
  tabText: { fontFamily: fonts.dmSans[700], fontSize: 13, lineHeight: 19.5 },
  list: { gap: 10 },
  option: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1 },
  preview: { width: 48, height: 40, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  previewTop: { flex: 1, marginHorizontal: 4, marginTop: 4, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  dots: { position: "absolute", left: 6, bottom: 6, flexDirection: "row", gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  flex: { flex: 1 },
  label: { fontFamily: fonts.dmSans[700], fontSize: 14, lineHeight: 21 },
  desc: { fontFamily: fonts.dmSans[400], fontSize: 11, lineHeight: 16.5, marginTop: 2 },
  check: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
});
