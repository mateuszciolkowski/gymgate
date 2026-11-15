/** Font families as registered with expo-font (see fontAssets.ts). RN needs one family name per weight. */
export const fonts = {
  barlow: {
    400: "Barlow_400Regular",
    500: "Barlow_500Medium",
    600: "Barlow_600SemiBold",
    700: "Barlow_700Bold",
    800: "Barlow_800ExtraBold",
    900: "Barlow_900Black",
  },
  barlowCondensed: {
    600: "BarlowCondensed_600SemiBold",
    700: "BarlowCondensed_700Bold",
    800: "BarlowCondensed_800ExtraBold",
    900: "BarlowCondensed_900Black",
  },
  /** Body text (PWA default font family). */
  dmSans: {
    400: "DMSans_400Regular",
    500: "DMSans_500Medium",
    600: "DMSans_600SemiBold",
    700: "DMSans_700Bold",
  },
  dmSansItalic: { 400: "DMSans_400Regular_Italic" },
} as const;

/**
 * What the PWA actually renders for `font-barlow`: Tailwind 4 ignores frontend/tailwind.config.js, so the class
 * generates no CSS and the text falls back to DM Sans (max loaded weight 700). The reference screenshots show this.
 * Use this instead of `barlow` wherever the PWA says `font-barlow`.
 */
export const pwaBarlow = {
  400: "DMSans_400Regular",
  500: "DMSans_500Medium",
  600: "DMSans_600SemiBold",
  700: "DMSans_700Bold",
  800: "DMSans_700Bold",
  900: "DMSans_700Bold",
} as const;

/** Font sizes most used in the PWA (px == dp). */
export const fontSizes = [10, 11, 12, 13, 14, 15, 17, 18, 20, 22, 28] as const;

/** Tabular digits for weights, reps and timers (PWA `num-tabular`). */
export const tabularNums = { fontVariant: ["tabular-nums"] } as const;
