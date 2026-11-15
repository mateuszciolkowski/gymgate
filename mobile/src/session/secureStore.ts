import * as SecureStore from "expo-secure-store";

/** Keychain (iOS) / Keystore (Android) wrapper. Keys must match [A-Za-z0-9._-]. */
export const SESSION_KEYS = {
  accessToken: "gymgate.accessToken",
  refreshToken: "gymgate.refreshToken",
} as const;

export const secureStore = {
  get: (key: string): Promise<string | null> => SecureStore.getItemAsync(key),
  set: (key: string, value: string): Promise<void> => SecureStore.setItemAsync(key, value),
  remove: (key: string): Promise<void> => SecureStore.deleteItemAsync(key),
};
