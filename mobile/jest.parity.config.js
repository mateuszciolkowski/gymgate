// Opt-in: compares domain/stats.ts with a running LOCAL backend. Not part of `npm test`.
// Plain Node environment (no jest-expo preset): its fetch is the React Native one, which cannot reach localhost here.
module.exports = {
  testEnvironment: "node",
  transform: { "\\.[jt]sx?$": ["babel-jest", { presets: ["babel-preset-expo"] }] },
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  testMatch: ["<rootDir>/src/**/*.parity.ts"],
  testTimeout: 60000,
};
