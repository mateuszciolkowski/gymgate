import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts, pwaBarlow, useTheme } from "@/theme";
import { Icon, Spinner, TextField, type TextFieldProps } from "@/ui";

/** Centered column of the PWA auth screens: p-5, max-w-sm (384). */
export function AuthLayout({ subtitle, logoGap, children }: { subtitle: string; logoGap: number; children: ReactNode }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAwareScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={[styles.scroll, { paddingTop: 20 + insets.top, paddingBottom: 20 + insets.bottom }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      bottomOffset={24}
    >
      <View style={styles.column}>
        <View style={[styles.logoBlock, { marginBottom: logoGap }]}>
          <View
            style={[
              styles.logo,
              { backgroundColor: c.btnBg, boxShadow: [{ offsetX: 0, offsetY: 4, blurRadius: 16, color: "rgba(0,0,0,0.3)" }] },
            ]}
          >
            <Icon name="trophy" color="#ffffff" />
          </View>
          <Text accessibilityRole="header" style={[styles.brand, { color: c.text }]}>
            GymGate
          </Text>
          <Text style={[styles.subtitle, { color: c.textMuted }]}>{subtitle}</Text>
        </View>
        {children}
      </View>
    </KeyboardAwareScrollView>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  const { theme } = useTheme();
  return (
    <View accessibilityRole="alert" style={styles.banner}>
      <Text style={[styles.bannerText, { color: theme.colors.error }]}>{message}</Text>
    </View>
  );
}

export function AuthField({ label, error, ...input }: TextFieldProps & { label: string; error?: string }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: c.textMuted }]}>{label}</Text>
      <TextField invalid={Boolean(error)} accessibilityLabel={label} {...input} />
      {error ? <Text style={[styles.fieldError, { color: c.error }]}>{error}</Text> : null}
    </View>
  );
}

/** Solid submit button of the auth screens (`var(--gg-btn-bg)`, not the gradient of ui/Button). */
export function SubmitButton({ label, loading, onPress, testID }: { label: string; loading: boolean; onPress: () => void; testID: string }) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: loading, busy: loading }}
      testID={testID}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.submit,
        { backgroundColor: theme.colors.btnBg, opacity: loading ? 0.5 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      {loading ? <Spinner color="#ffffff" /> : null}
      <Text style={styles.submitLabel}>{label}</Text>
    </Pressable>
  );
}

export function SwitchFooter({ text, link, onPress, testID }: { text: string; link: string; onPress: () => void; testID: string }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <Text style={[styles.footer, { color: c.textMuted }]}>
      {text}{" "}
      <Text accessibilityRole="link" testID={testID} onPress={onPress} style={[styles.footerLink, { color: c.a2 }]}>
        {link}
      </Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 20 },
  column: { width: "100%", maxWidth: 384, alignSelf: "center" },
  logoBlock: { alignItems: "center" },
  logo: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  brand: { fontFamily: pwaBarlow[800], fontSize: 32, lineHeight: 32, letterSpacing: -0.8 },
  subtitle: { fontFamily: fonts.dmSans[400], fontSize: 13, lineHeight: 19.5, marginTop: 6 },
  banner: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 16, backgroundColor: "rgba(239,68,68,0.08)", borderWidth: 1, borderColor: "rgba(239,68,68,0.25)" },
  bannerText: { fontFamily: fonts.dmSans[400], fontSize: 13, lineHeight: 19.5 },
  field: { gap: 6 },
  label: { fontFamily: fonts.dmSans[700], fontSize: 11, lineHeight: 16.5, letterSpacing: 0.55, textTransform: "uppercase" },
  fieldError: { fontFamily: fonts.dmSans[500], fontSize: 12, lineHeight: 18 },
  submit: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 12, marginTop: 8 },
  submitLabel: { fontFamily: fonts.dmSans[700], fontSize: 14, lineHeight: 21, color: "#ffffff" },
  footer: { fontFamily: fonts.dmSans[400], fontSize: 13, lineHeight: 19.5, textAlign: "center", marginTop: 24 },
  footerLink: { fontFamily: fonts.dmSans[700] },
});
