module.exports = {
  preset: "jest-expo",
  // Reanimated/worklets need their web-style entry points under Jest (required by components that import them).
  resolver: require.resolve("react-native-reanimated/jest/resolver"),
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  testPathIgnorePatterns: ["/node_modules/", "/ios/", "/android/", "/tools/pwa-smoke/"],
};
