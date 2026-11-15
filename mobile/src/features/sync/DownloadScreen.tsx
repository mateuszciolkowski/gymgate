import { StyleSheet, Text, View } from "react-native";
import { useSync } from "@/providers";
import { fonts, useTheme } from "@/theme";
import { LoadingBlock } from "@/ui";

/** Shown after the first login until the first snapshot is stored (PLAN 3). */
export function DownloadScreen() {
  const { theme } = useTheme();
  const { state, offline } = useSync();
  const c = theme.colors;
  const failed = offline || state.status === "error";
  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <LoadingBlock text="Pobieranie danych..." />
      <Text style={[styles.hint, { color: failed ? c.error : c.textMuted }]}>
        {failed ? "Nie udało się pobrać danych. Ponawiam próbę..." : "To zajmie chwilę przy pierwszym logowaniu."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center" },
  hint: { position: "absolute", bottom: 96, left: 24, right: 24, textAlign: "center", fontFamily: fonts.dmSans[400], fontSize: 13, lineHeight: 19.5 },
});
