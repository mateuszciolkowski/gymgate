// Test dymny PWA na lokalnym backendzie: pełna ścieżka treningu z zapisem danych.
// Uruchamiany po każdej zmianie backendu, żeby potwierdzić, że PWA działa jak wcześniej.
// Wymaga świeżych danych z `npm run seed:local` (aktywny trening DRAFT z 2 ćwiczeniami).
// Użycie: node smoke.mjs
import { createRequire } from "node:module";
const { chromium, devices } = createRequire(import.meta.url)("playwright");

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:5173";
const API_URL = process.env.API_URL ?? "http://localhost:3000";
const EMAIL = process.env.GG_EMAIL ?? "test@gymgate.com";
const PASSWORD = process.env.GG_PASSWORD ?? "Test1234!";

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "OK  " : "FAIL"} ${name}${detail ? ` (${detail})` : ""}`);
};

const session = await fetch(`${API_URL}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
}).then((r) => r.json()).then((r) => r.data);
if (!session?.token) throw new Error("Logowanie przez API nie powiodło się");
const api = (p, init = {}) =>
  fetch(`${API_URL}${p}`, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}`, ...init.headers } }).then((r) => r.json());

const before = {
  completed: (await api("/api/workouts?status=COMPLETED")).data.length,
  overview: (await api("/api/workouts/stats/overview")).data,
  active: (await api("/api/workouts/active")).data,
};
const activeId = before.active?.activeWorkoutId;
if (!activeId) throw new Error("Brak aktywnego treningu: uruchom najpierw `npm run seed:local`");
const setsBefore = (await api(`/api/workouts/${activeId}`)).data.items.reduce((n, i) => n + i.sets.length, 0);

const { defaultBrowserType: _ignored, ...iphone } = devices["iPhone 15 Pro"];
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...iphone, locale: "pl-PL", timezoneId: "Europe/Warsaw" });
const page = await ctx.newPage();
const dialogs = [];
page.on("dialog", (d) => { dialogs.push(d.message()); d.accept(); });

try {
  // 1. Logowanie przez formularz
  await page.goto(BASE_URL);
  await page.getByPlaceholder("twoj@email.com").fill(EMAIL);
  await page.getByPlaceholder("••••••••").fill(PASSWORD);
  await page.getByRole("button", { name: "Zaloguj się" }).click();
  await page.getByText("Historia sesji").waitFor();
  check("logowanie i lista treningów", true);

  // 2. Wejście w aktywny trening
  await page.getByRole("button", { name: "Kontynuuj trening" }).click();
  await page.getByText("Czas trwania").waitFor();
  check("aktywny trening otwarty", true);

  // 3. Zakończenie bez serii jest blokowane
  await page.getByRole("button", { name: "Zakończ trening" }).click();
  await page.waitForTimeout(400);
  check("blokada zakończenia bez serii", dialogs.some((m) => m.includes("nie ma żadnych serii")), dialogs.at(-1) ?? "brak alertu");

  // 4. Serie w obu ćwiczeniach
  const addSet = async (cardNo, weight, reps) => {
    if (!(await page.getByRole("button", { name: "Zapisz serię" }).isVisible().catch(() => false))) {
      await page.getByText(`#${cardNo}`, { exact: true }).first().click();
      await page.waitForTimeout(300);
    }
    if (!(await page.getByRole("button", { name: "Zapisz serię" }).isVisible().catch(() => false))) {
      await page.getByRole("button", { name: "+ Dodaj serię" }).first().click();
    }
    const inputs = page.locator('input[type="number"]');
    await inputs.nth(0).fill(String(weight));
    await inputs.nth(1).fill(String(reps));
    await page.getByRole("button", { name: "Zapisz serię" }).click();
    await page.waitForTimeout(700);
  };
  await addSet(1, 80, 5);
  await page.getByText("#1", { exact: true }).first().click(); // zwiń
  await page.waitForTimeout(300);
  await addSet(2, 30, 10);
  await page.waitForTimeout(800);
  const mid = (await api(`/api/workouts/${activeId}`)).data;
  const setCount = mid.items.reduce((n, i) => n + i.sets.length, 0);
  check("serie zapisane na serwerze", setCount === setsBefore + 2, `${setsBefore} → ${setCount}`);

  // 5. Notatka do ćwiczenia
  await page.getByRole("button", { name: "Notatki" }).nth(1).click();
  await page.getByPlaceholder("Wpisz notatkę...").fill("Notatka z testu dymnego");
  await page.getByRole("button", { name: "Zapisz notatkę" }).click();
  await page.waitForTimeout(800);
  const noted = (await api(`/api/workouts/${mid.id}`)).data.items.some((i) => i.notes === "Notatka z testu dymnego");
  check("notatka ćwiczenia zapisana", noted);

  // 6. Zakończenie treningu
  await page.getByRole("button", { name: "Zakończ trening" }).click();
  await page.getByText("Historia sesji").waitFor();
  await page.waitForTimeout(1200);
  const done = (await api(`/api/workouts/${mid.id}`)).data;
  check("trening zakończony", done.status === "COMPLETED" && done.durationSeconds > 0, `status ${done.status}, czas ${done.durationSeconds}s`);
  const after = {
    completed: (await api("/api/workouts?status=COMPLETED")).data.length,
    overview: (await api("/api/workouts/stats/overview")).data,
    active: (await api("/api/workouts/active")).data,
  };
  check("historia +1", after.completed === before.completed + 1, `${before.completed} → ${after.completed}`);
  check("statystyki: serie zakończonego treningu doliczone", after.overview.totalSets === before.overview.totalSets + setsBefore + 2, `${before.overview.totalSets} → ${after.overview.totalSets}`);
  check("brak aktywnego treningu", after.active?.activeWorkoutId == null, JSON.stringify(after.active));
  const stats = (await api("/api/workouts/stats/all")).data;
  const bench = stats.find((s) => s.exerciseId === mid.items[0].exerciseId);
  check("rekord przeliczony", Number(bench?.maxWeight) === 80 && Number(bench?.lastWeight) === 80, `max ${bench?.maxWeight}, ostatnio ${bench?.lastWeight}`);

  // 7. Zakładki po zakończeniu
  const nav = page.getByRole("navigation", { name: "Nawigacja główna" });
  await nav.getByRole("button", { name: "Statystyki" }).click();
  await page.getByText("Twoje postępy").waitFor();
  await nav.getByRole("button", { name: "Ćwiczenia" }).click();
  await page.getByText("Twoja baza").waitFor();
  check("zakładki statystyk i ćwiczeń", true);

  // 8. Offline: baner i powrót
  await ctx.setOffline(true);
  await page.waitForTimeout(600);
  check("baner offline", await page.getByText("pracujesz offline").isVisible());
  await ctx.setOffline(false);
} catch (e) {
  check("scenariusz przerwany", false, String(e).split("\n")[0]);
  await page.screenshot({ path: "smoke-failure.png" }).catch(() => {});
}

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} kroków OK`);
process.exit(failed ? 1 : 0);
