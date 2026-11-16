import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal as RNModal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { fonts, pwaBarlow, useTheme } from "@/theme";
import { Icon } from "./icons";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
  showCloseButton?: boolean;
}

const MAX_WIDTH = { sm: 384, md: 448, lg: 512, xl: 576 } as const;

/** Centered window on a dimmed backdrop (PWA `Modal`). Android back and backdrop tap close it. */
export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "md",
  showCloseButton = true,
}: ModalProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <RNModal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.fill}
      >
        <Pressable accessible={false} style={styles.backdrop} onPress={onClose}>
          <Pressable
            accessible={false}
            onPress={() => undefined}
            style={[
              styles.window,
              { maxWidth: MAX_WIDTH[maxWidth], backgroundColor: c.surface, borderColor: c.border },
            ]}
          >
            {title || showCloseButton ? (
              <View style={styles.header}>
                <View style={styles.titles}>
                  {title ? (
                    <Text numberOfLines={1} style={[styles.title, { color: c.text }]}>
                      {title}
                    </Text>
                  ) : null}
                  {subtitle ? (
                    <Text style={[styles.subtitle, { color: c.textMuted }]}>{subtitle}</Text>
                  ) : null}
                </View>
                {showCloseButton ? (
                  <Pressable
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Zamknij"
                    onPress={onClose}
                    style={[styles.close, { backgroundColor: c.surface2 }]}
                  >
                    <Icon name="close" size={15} strokeWidth={2.5} color={c.textMuted} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            {children}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  window: { width: "100%", borderRadius: 24, borderWidth: 1, padding: 20, overflow: "hidden" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 20,
  },
  titles: { flex: 1 },
  title: { fontFamily: pwaBarlow[700], fontSize: 20, lineHeight: 30 },
  subtitle: { fontFamily: fonts.dmSans[400], fontSize: 12, lineHeight: 18, marginTop: 2 },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
