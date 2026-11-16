import Storage from "expo-sqlite/kv-store";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { diffVersions, type PlanChange } from "@/domain/planHistory";
import { useDb, useSession } from "@/providers";
import { fonts, pwaBarlow, useTheme } from "@/theme";
import { Modal } from "@/ui";
import { HISTORY_OFFLINE_TEXT, loadPlanHistory, type PlanHistory } from "./planHistoryData";

const SIGN: Record<PlanChange["type"], string> = { added: "+", removed: "−", moved: "↕", name: "✎", shortName: "✎", public: "◉" };

function describeChange(c: PlanChange): string {
  switch (c.type) {
    case "added":
    case "removed":
      return c.name;
    case "moved":
      return `${c.name}: pozycja ${c.from} → ${c.to}`;
    case "name":
      return `Nazwa: „${c.from}” → „${c.to}”`;
    case "shortName":
      return `Nazwa skrócona: ${c.from ? `„${c.from}”` : "brak"} → ${c.to ? `„${c.to}”` : "brak"}`;
    case "public":
      return c.to ? "Plan stał się publiczny" : "Plan stał się prywatny";
  }
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("pl-PL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** "Historia planu": versions newest first with what changed; tapping a version lists its exercises (PWA PlanHistoryModal). */
export function PlanHistoryModal({ planId, onClose }: { planId: string; onClose: () => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const { session } = useSession();
  const { userId } = useDb();
  const [history, setHistory] = useState<PlanHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadPlanHistory(session.api, Storage, userId, planId)
      .then((h) => !cancelled && setHistory(h))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : "Błąd"));
    return () => {
      cancelled = true;
    };
  }, [session, userId, planId]);

  const versions = history?.versions;
  const changeColor: Record<PlanChange["type"], string> = { added: "#22c55e", removed: c.error, moved: c.a1, name: c.textSub, shortName: c.textSub, public: c.textSub };

  return (
    <Modal isOpen onClose={onClose} title="Historia planu" subtitle="Najnowsze zmiany na górze">
      <ScrollView style={styles.scroll} testID="plan-history">
        {error ? <Text style={[styles.note, { color: c.error }]}>{error}</Text> : null}
        {!error && !versions ? <Text style={[styles.note, { color: c.textMuted }]}>Ładowanie…</Text> : null}
        {history?.cached ? (
          <Text testID="plan-history-offline" style={[styles.note, { color: c.textMuted, marginBottom: 10 }]}>
            {HISTORY_OFFLINE_TEXT}
          </Text>
        ) : null}
        {versions?.map((ver, i) => {
          const older = versions[i + 1];
          const changes = older ? diffVersions(older, ver) : null;
          const open = expanded === ver.version;
          return (
            <View key={ver.version} style={[styles.card, { backgroundColor: c.surface2, borderColor: c.border }]}>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} testID={`plan-version-${ver.version}`} onPress={() => setExpanded(open ? null : ver.version)} style={styles.head}>
                <Text style={[styles.version, { color: c.text }]}>
                  Wersja {ver.version}
                  {i === 0 ? <Text style={[styles.current, { color: c.a1 }]}>{"  "}AKTUALNA</Text> : null}
                </Text>
                <Text style={[styles.date, { color: c.textMuted }]}>
                  {formatDate(ver.createdAt)} {open ? "▴" : "▾"}
                </Text>
              </Pressable>
              <View style={styles.changes}>
                {changes === null ? (
                  <Text style={[styles.change, { color: c.textMuted }]}>Wersja początkowa · {ver.exercises.length} ćw.</Text>
                ) : (
                  changes.map((ch, idx) => (
                    <View key={idx} style={styles.changeRow}>
                      <Text style={[styles.sign, { color: changeColor[ch.type] }]}>{SIGN[ch.type]}</Text>
                      <Text style={[styles.change, styles.flex, { color: c.text }]}>{describeChange(ch)}</Text>
                    </View>
                  ))
                )}
              </View>
              {open ? (
                <View style={[styles.list, { borderTopColor: c.border }]}>
                  {ver.exercises.map((e, n) => (
                    <Text key={e.exerciseId} style={[styles.change, { color: c.textSub }]}>
                      {n + 1}. {e.name}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 460 },
  flex: { flex: 1 },
  note: { fontFamily: fonts.dmSans[400], fontSize: 13, lineHeight: 19.5 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  version: { fontFamily: pwaBarlow[700], fontSize: 15, lineHeight: 22 },
  current: { fontFamily: fonts.dmSans[700], fontSize: 10, letterSpacing: 1 },
  date: { fontFamily: fonts.dmSans[400], fontSize: 11, lineHeight: 16.5 },
  changes: { marginTop: 8, gap: 4 },
  changeRow: { flexDirection: "row", gap: 8 },
  sign: { width: 12, textAlign: "center", fontFamily: fonts.dmSans[700], fontSize: 13, lineHeight: 19.5 },
  change: { fontFamily: fonts.dmSans[400], fontSize: 13, lineHeight: 19.5 },
  list: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, gap: 2 },
});
