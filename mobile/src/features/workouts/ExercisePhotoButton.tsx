import { useState } from "react";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { API_BASE } from "@/api/config";
import type { WorkoutItem } from "@/domain/types";
import { fonts, useTheme } from "@/theme";
import { Icon, Modal } from "@/ui";

type Photos = NonNullable<WorkoutItem["exercise"]["photos"]>;

const STAGE_LABELS: Record<string, string> = { START: "Pozycja startowa", MIDDLE: "Pozycja pośrednia", END: "Pozycja końcowa" };

const resolveUrl = (url: string): string => (/^https?:\/\//.test(url) ? url : `${API_BASE}/uploads/${url.replace(/^\/?uploads\//, "")}`);

/** "Pokaż zdjęcie" button of the exercise card plus its photo modal (PWA ExercisePhotoButton). Renders nothing without photos. */
export function ExercisePhotoButton({ photos, exerciseName }: { photos?: Photos; exerciseName: string }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [open, setOpen] = useState(false);
  if (!photos || photos.length === 0) return null;
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel="Pokaż zdjęcie" testID="item-photo" onPress={() => setOpen(true)} style={[styles.button, { backgroundColor: c.surface2 }]}>
        <Icon name="photo" size={13} color={c.textSub} />
      </Pressable>
      <Modal isOpen={open} onClose={() => setOpen(false)} title={exerciseName}>
        <View style={styles.list}>
          {photos.map((p) => (
            <View key={p.id}>
              {photos.length > 1 ? <Text style={[styles.stage, { color: c.textMuted }]}>{STAGE_LABELS[p.photoStage] ?? p.photoStage}</Text> : null}
              <Image source={{ uri: resolveUrl(p.photoUrl) }} cachePolicy="disk" accessibilityLabel={STAGE_LABELS[p.photoStage] ?? p.photoStage} contentFit="contain" style={[styles.image, { borderColor: c.border }]} />
            </View>
          ))}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  list: { gap: 12 },
  stage: { fontFamily: fonts.dmSans[600], fontSize: 11, lineHeight: 16.5, letterSpacing: 0.55, textTransform: "uppercase", marginBottom: 6 },
  image: { width: "100%", aspectRatio: 4 / 3, borderRadius: 12, borderWidth: 1 },
});
