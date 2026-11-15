/**
 * Uruchamia testy integracyjne (*.itest.ts) na lokalnej bazie testowej.
 *
 * Bezpieczeństwo: testy czyszczą wszystkie tabele, więc skrypt odmawia pracy,
 * jeśli baza nie jest na localhost albo jej nazwa nie kończy się na "_test".
 * Adres można nadpisać zmienną TEST_DATABASE_URL.
 */
import { execFileSync } from "node:child_process";
import pg from "pg";

const DEFAULT_URL = "postgresql://postgres:postgres@localhost:5433/gymgate_test";
const testUrl = process.env.TEST_DATABASE_URL ?? DEFAULT_URL;

export function assertSafeTestDatabase(url: string): URL {
  const parsed = new URL(url);
  const dbName = parsed.pathname.replace(/^\//, "");
  if (!["localhost", "127.0.0.1"].includes(parsed.hostname)) {
    throw new Error(`Odmowa: baza testowa musi być na localhost, a jest na "${parsed.hostname}".`);
  }
  if (!dbName.endsWith("_test")) {
    throw new Error(`Odmowa: nazwa bazy testowej musi kończyć się na "_test", a jest "${dbName}".`);
  }
  return parsed;
}

async function ensureDatabaseExists(parsed: URL): Promise<void> {
  const dbName = parsed.pathname.replace(/^\//, "");
  const adminUrl = new URL(parsed.toString());
  adminUrl.pathname = "/postgres";
  const client = new pg.Client({ connectionString: adminUrl.toString() });
  await client.connect();
  try {
    const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    if (existing.rowCount === 0) {
      // Nazwa przeszła walidację (kończy się na _test); cudzysłowy chronią przed nietypowymi znakami.
      await client.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
    }
  } finally {
    await client.end();
  }
}

async function main(): Promise<void> {
  const parsed = assertSafeTestDatabase(testUrl);
  await ensureDatabaseExists(parsed);

  const env = {
    ...process.env,
    NODE_ENV: "test",
    DB_ENV: "remote",
    DATABASE_URL: testUrl,
    DIRECT_URL: testUrl,
    JWT_SECRET: process.env.JWT_SECRET ?? "integration-test-secret",
  };

  execFileSync("npx", ["prisma", "generate"], { stdio: "inherit", env });
  execFileSync("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit", env });
  execFileSync(
    "npx",
    ["vitest", "run", "--config", "vitest.integration.config.ts", ...process.argv.slice(2)],
    { stdio: "inherit", env },
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
