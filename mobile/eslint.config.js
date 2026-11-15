const { defineConfig } = require("eslint/config");
const expo = require("eslint-config-expo/flat");
const prettier = require("eslint-config-prettier/flat");

module.exports = defineConfig([
  expo,
  prettier,
  // Domain code is copied verbatim from the PWA, which uses Array<T>; keep it identical.
  { rules: { "@typescript-eslint/array-type": "off" } },
  { ignores: ["dist/*", "ios/*", "android/*", ".expo/*", "docs/*", "tools/*"] },
]);
