// Opt-in: sync protocol tests against a running LOCAL backend (see src/sync/protocolHarness.ts). Not part of `npm test`.
// Plain Node environment: the jest-expo fetch is the React Native one and cannot reach localhost here.
module.exports = {
  testEnvironment: "node",
  transform: { "\\.[jt]sx?$": ["babel-jest", { presets: ["babel-preset-expo"] }] },
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1", "^expo/virtual/env$": "<rootDir>/tools/protocol-env.js" },
  testMatch: ["<rootDir>/src/**/*.protocol.ts"],
  testTimeout: 60000,
};
