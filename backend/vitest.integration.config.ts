import { defineConfig } from "vitest/config";

// Testy integracyjne na prawdziwym PostgreSQL (pliki *.itest.ts).
// Uruchamiane wyłącznie przez `npm run test:integration`; `npm test` ich nie widzi.
export default defineConfig({
  test: {
    include: ["src/**/*.itest.ts"],
    // Wszystkie pliki dzielą jedną bazę testową i czyszczą ją przed każdym testem.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
