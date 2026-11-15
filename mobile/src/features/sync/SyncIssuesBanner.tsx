import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useAction, useDb } from "@/providers";
import { describeIssue, discardIssue, groupIssues, retryIssue, type SyncIssue } from "@/sync";
import { fonts, useTheme } from "@/theme";

/**
 * Rejected changes (PLAN 5.6), in the style of the PWA SyncFailureBanner: "{akcja} {obiekt}" lines, "Ponów" and "Zamknij".
 * Tapping the lines shows the server's reasons and offers to drop the local changes. "Zamknij" only hides the banner.
 */
export function SyncIssuesBanner({ issues, online, onHide }: { issues: SyncIssue[]; online: boolean; onHide: () => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const { db } = useDb();
  const act = useAction();

  const groups = groupIssues(issues);
  const lines = [...new Set(groups.map((g) => (g.kind === "single" ? describeIssue(g.issues[0]!) : g.message)))];

  const retry = () => {
    for (const g of groups) {
      for (const i of g.issues) {
        if (g.kind === "single") act((ctx) => retryIssue(ctx, i.id));
        else discardIssue(db, i.id);
      }
    }
  };
  const showDetails = () =>
    Alert.alert(
      "Nie udało się zsynchronizować zmian",
      groups.map((g) => `${g.kind === "single" ? describeIssue(g.issues[0]!) : "Usunięto na serwerze"}: ${g.message}`).join("\n\n"),
      [
        { text: "Zostaw", style: "cancel" },
        { text: "Odrzuć zmiany", style: "destructive", onPress: () => issues.forEach((i) => discardIssue(db, i.id)) },
      ],
    );

  return (
    <View testID="issues-banner" style={[styles.row, { backgroundColor: c.activeBg, borderBottomColor: c.activeBorder }]}>
      <Pressable accessibilityRole="button" testID="issues-details" onPress={showDetails} style={styles.main}>
        <Text style={[styles.head, { color: c.activeBorder }]}>Nie udało się zsynchronizować zmian:</Text>
        {lines.map((l) => (
          <Text key={l} style={[styles.line, { color: c.textSub }]}>
            · {l}
          </Text>
        ))}
      </Pressable>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" testID="issues-retry" disabled={!online} onPress={retry}>
          <Text style={[styles.action, { color: c.activeBorder, opacity: online ? 1 : 0.4 }]}>Ponów</Text>
        </Pressable>
        <Pressable accessibilityRole="button" testID="issues-close" onPress={onHide}>
          <Text style={[styles.close, { color: c.textMuted }]}>Zamknij</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  main: { flex: 1, minWidth: 0 },
  head: { fontFamily: fonts.dmSans[600], fontSize: 11, lineHeight: 16.5 },
  line: { fontFamily: fonts.dmSans[400], fontSize: 11, lineHeight: 16.5 },
  actions: { flexDirection: "row", gap: 12, marginTop: 2 },
  action: { fontFamily: fonts.dmSans[700], fontSize: 11, lineHeight: 16.5 },
  close: { fontFamily: fonts.dmSans[500], fontSize: 11, lineHeight: 16.5 },
});
