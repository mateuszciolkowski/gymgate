import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import Storage from "expo-sqlite/kv-store";
import { useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DbProvider, SessionProvider, SyncProvider, useSession } from "@/providers";
import { ThemeProvider, useTheme } from "@/theme";
import { fontAssets } from "@/theme/fontAssets";
import { LoadingBlock } from "@/ui";

void SplashScreen.preventAutoHideAsync();

function ThemedStack() {
  const { theme, isDark } = useTheme();
  const { ready } = useSession();
  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      {ready ? (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bg } }} />
      ) : (
        <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
          <LoadingBlock text="Ładowanie..." />
        </View>
      )}
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <ThemeProvider storage={Storage}>
            <SessionProvider>
              <DbProvider>
                <SyncProvider>
                  <ThemedStack />
                </SyncProvider>
              </DbProvider>
            </SessionProvider>
          </ThemeProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
