/** Backend base URL, inlined at build time from EXPO_PUBLIC_API_URL (see .env.example). */
export const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  "",
);
