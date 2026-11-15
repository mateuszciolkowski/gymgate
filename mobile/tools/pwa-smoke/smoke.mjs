// Test dymny PWA na lokalnym backendzie: pełna ścieżka treningu z zapisem danych,
// plany (utworzenie, edycja, ulubione, usunięcie), trening z planu, edycja serii, pominięcie ćwiczenia,
// edycja szczegółów treningu oraz tryb offline z kolejką zmian.
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
  await page.waitForTimeout(800);

  // ── Część 2: plany i trening z planu ────────────────────────────────────────
  const E1 = "Wyciskanie sztangi na ławce płaskiej";
  const E2 = "Wyciskanie hantli na ławce skośnej";
  const E3 = "Rozpiętki hantlami na ławce płaskiej";
  const E4 = "Martwy ciąg klasyczny";
  const planByName = async (name) => (await api("/api/plans")).data.find((p) => p.name === name);
  const planNames = async (name) => (await planByName(name))?.items.sort((a, b) => a.orderInPlan - b.orderInPlan).map((i) => i.exercise.name);
  const pickExercise = async (name) => {
    await page.getByRole("dialog", { name: "Wybierz ćwiczenie" }).getByText(name, { exact: true }).first().click();
    await page.waitForTimeout(400);
  };
  const openPlans = async () => {
    await page.getByRole("button", { name: "Otwórz menu" }).click();
    await page.getByText("Plany treningowe", { exact: true }).click();
    await page.getByRole("button", { name: "Stwórz nowy plan" }).waitFor();
  };

  // 9. Nowy plan z trzema ćwiczeniami (jedno zostanie usunięte podczas edycji)
  await openPlans();
  await page.getByRole("button", { name: "Stwórz nowy plan" }).click();
  await page.getByPlaceholder("np. FBW Klatka Piersiowa").fill("Smoke plan A");
  for (const n of [E1, E2, E4]) {
    await page.getByRole("button", { name: "Dodaj ćwiczenie" }).click();
    await pickExercise(n);
  }
  await page.getByRole("button", { name: "Zapisz plan" }).click();
  await page.getByRole("button", { name: "Stwórz nowy plan" }).waitFor();
  await page.waitForTimeout(800);
  const created = await planNames("Smoke plan A");
  check("plan utworzony z 3 ćwiczeniami w kolejności", JSON.stringify(created) === JSON.stringify([E1, E2, E4]), JSON.stringify(created));

  // 10. Edycja planu: zmiana nazwy, usunięcie ostatniego ćwiczenia, dodanie innego
  await page.getByRole("button", { name: "Moje" }).click();
  await page.getByRole("button", { name: "Edytuj", exact: true }).first().click();
  await page.getByPlaceholder("np. FBW Klatka Piersiowa").fill("Smoke plan B");
  await page.getByRole("button", { name: "Usuń ćwiczenie z planu" }).last().click();
  await page.getByRole("button", { name: "Dodaj ćwiczenie" }).click();
  await pickExercise(E3);
  await page.getByRole("button", { name: "Zapisz zmiany" }).click();
  await page.getByRole("button", { name: "Stwórz nowy plan" }).waitFor();
  await page.waitForTimeout(800);
  const edited = await planNames("Smoke plan B");
  check("plan: zmiana nazwy i ćwiczeń zapisana", JSON.stringify(edited) === JSON.stringify([E1, E2, E3]) && !(await planByName("Smoke plan A")), JSON.stringify(edited));

  // 11. Ulubiony plan (potrzebny do wyboru w formularzu treningu)
  await page.getByRole("button", { name: "Moje" }).click();
  await page.getByRole("button", { name: "Dodaj do ulubionych" }).first().click();
  await page.waitForTimeout(800);
  check("plan dodany do ulubionych", (await planByName("Smoke plan B"))?.isFavorite === true);

  // 12. Plan jednorazowy: utworzenie i usunięcie przez UI
  await page.getByRole("button", { name: "Stwórz nowy plan" }).click();
  await page.getByPlaceholder("np. FBW Klatka Piersiowa").fill("Smoke plan do usunięcia");
  await page.getByRole("button", { name: "Dodaj ćwiczenie" }).click();
  await pickExercise(E1);
  await page.getByRole("button", { name: "Zapisz plan" }).click();
  await page.getByRole("button", { name: "Stwórz nowy plan" }).waitFor();
  await page.getByRole("button", { name: "Moje" }).click();
  await page.getByText("Smoke plan do usunięcia", { exact: true }).waitFor();
  const delCard = page.locator("div").filter({ has: page.getByText("Smoke plan do usunięcia", { exact: true }) }).filter({ has: page.getByRole("button", { name: "Usuń plan" }) }).last();
  await delCard.getByRole("button", { name: "Usuń plan" }).click();
  await page.waitForTimeout(900);
  check("plan usunięty", !(await planByName("Smoke plan do usunięcia")) && !!(await planByName("Smoke plan B")));

  // 13. Nowy trening z planu
  await page.getByRole("button", { name: "Nowy trening" }).click();
  await page.getByPlaceholder("np. Klatka + Triceps").fill("Smoke trening");
  await page.getByPlaceholder("np. CityFit, Zdrofit").fill("Smoke Gym");
  await page.getByRole("button", { name: "Zacznij bez planu" }).first().click();
  await page.getByRole("button", { name: /Smoke plan B/ }).filter({ hasText: "ćw." }).click();
  await page.getByRole("button", { name: "Rozpocznij" }).click();
  await page.getByText("Czas trwania").waitFor();
  await page.waitForTimeout(800);
  const planB = await planByName("Smoke plan B");
  const w2Id = (await api("/api/workouts/active")).data.activeWorkoutId;
  const w2 = (await api(`/api/workouts/${w2Id}`)).data;
  check("trening z planu utworzony", w2.workoutPlanId === planB.id && w2.items.length === 0 && w2.gymName === "Smoke Gym", `plan ${w2.workoutPlanId === planB.id}, ćwiczeń ${w2.items.length}`);

  // 14. Kolejne ćwiczenie z planu + seria + edycja serii
  await page.getByRole("button", { name: /Kolejne z planu/ }).click();
  await page.waitForTimeout(600);
  const inputs = page.locator('input[type="number"]');
  // Karta ćwiczenia jest po dodaniu zwinięta: rozwiń ją i otwórz szkic serii, jeśli trzeba.
  const fillSet = async (exercise, weight, reps) => {
    const save = page.getByRole("button", { name: "Zapisz serię" });
    const add = page.getByRole("button", { name: "+ Dodaj serię" });
    const visible = (l) => l.first().isVisible().catch(() => false);
    if (!(await visible(save)) && !(await visible(add))) {
      await page.getByText(exercise, { exact: true }).first().click(); // zwinięta karta: rozwiń
      await page.waitForTimeout(400);
    }
    if (!(await visible(save))) await add.first().click();
    await inputs.nth(0).fill(String(weight));
    await inputs.nth(1).fill(String(reps));
    await save.first().click();
    await page.waitForTimeout(800);
  };
  await fillSet(E1, 50, 10);
  let w2s = (await api(`/api/workouts/${w2Id}`)).data;
  check("ćwiczenie z planu dodane z serią", w2s.items[0]?.exercise?.name === E1 && w2s.items[0].sets.length === 1, `${w2s.items.length} ćw.`);
  await page.getByTitle("Edytuj serię").first().waitFor();
  await page.getByTitle("Edytuj serię").first().click();
  await inputs.nth(0).fill("55");
  await inputs.nth(1).fill("9");
  await page.getByRole("button", { name: "Zapisz serię" }).first().click();
  await page.waitForTimeout(900);
  w2s = (await api(`/api/workouts/${w2Id}`)).data;
  const editedSet = w2s.items[0].sets[0];
  check("edycja serii zapisana na serwerze", Number(editedSet.weight) === 55 && editedSet.repetitions === 9, `${editedSet.weight} x ${editedSet.repetitions}`);

  // 15. Pominięcie ćwiczenia z planu
  await page.getByRole("button", { name: "Pomiń" }).click();
  await page.waitForTimeout(900);
  w2s = (await api(`/api/workouts/${w2Id}`)).data;
  check("pominięcie ćwiczenia z planu zapisane", w2s.skippedPlanExerciseIds.length === 1 && w2s.skippedPlanExerciseIds[0] === planB.items.find((i) => i.exercise.name === E2).exerciseId, JSON.stringify(w2s.skippedPlanExerciseIds));
  await page.getByRole("button", { name: /Kolejne z planu/ }).click();
  await page.waitForTimeout(600);
  await page.getByText("Wszystkie ćwiczenia z planu zostały dodane").waitFor();
  check("plan zakończony (baner)", true);
  await page.getByText(E1, { exact: true }).first().click(); // zwiń kartę E1, żeby seria trafiła do E3
  await page.waitForTimeout(300);
  await fillSet(E3, 14, 12);
  const w2c = (await api(`/api/workouts/${w2Id}`)).data;
  check("seria trafiła do ćwiczenia E3", w2c.items.find((i) => i.exercise.name === E3)?.sets.length === 1 && w2c.items.find((i) => i.exercise.name === E1).sets.length === 1);

  // 16. Modal szczegółów treningu (nazwa, siłownia, data)
  await page.getByTitle("Edytuj szczegóły treningu").first().click();
  await page.getByPlaceholder("Nazwa treningu").fill("Smoke trening po edycji");
  await page.getByPlaceholder("Nazwa siłowni").fill("Smoke Gym 2");
  await page.locator('input[type="date"]').fill("2026-03-01");
  await page.getByRole("button", { name: "Zapisz zmiany" }).click();
  await page.waitForTimeout(1000);
  const w2e = (await api(`/api/workouts/${w2Id}`)).data;
  check("modal szczegółów: nazwa, siłownia i data zapisane", w2e.workoutName === "Smoke trening po edycji" && w2e.gymName === "Smoke Gym 2" && w2e.workoutDate.startsWith("2026-03-01"), `${w2e.workoutName} / ${w2e.gymName} / ${w2e.workoutDate}`);

  // 17. Offline: seria dodana bez sieci trafia do kolejki, po powrocie sieci jest na serwerze
  const setsOnServer = async () => (await api(`/api/workouts/${w2Id}`)).data.items.reduce((n, i) => n + i.sets.length, 0);
  const s0 = await setsOnServer();
  await ctx.setOffline(true);
  await page.waitForTimeout(500);
  await fillSet(E3, 16, 8);
  const sOffline = await setsOnServer(); // Node fetch nie podlega ctx.setOffline: serwer nie powinien jeszcze mieć serii
  check("zmiana offline czeka w kolejce (serwer bez nowej serii)", sOffline === s0, `${s0} → ${sOffline}`);
  await ctx.setOffline(false);
  let synced = false;
  for (let i = 0; i < 30 && !synced; i++) { await page.waitForTimeout(1000); synced = (await setsOnServer()) === s0 + 1; }
  check("po powrocie sieci zmiana z kolejki zsynchronizowana", synced, `serwer ${await setsOnServer()}, oczekiwano ${s0 + 1}`);

  // 18. Zakończenie treningu z planu, statystyki i usunięcie planu
  await page.getByRole("button", { name: "Zakończ trening" }).click();
  await page.getByText("Historia sesji").waitFor();
  await page.waitForTimeout(1200);
  const w2f = (await api(`/api/workouts/${w2Id}`)).data;
  check("trening z planu zakończony", w2f.status === "COMPLETED" && w2f.workoutName === "Smoke trening po edycji", w2f.status);
  // Data treningu została cofnięta do marca, więc nie jest "ostatnim"; punkt progresji pokazuje jego serię po edycji.
  const prog = (await api(`/api/workouts/stats/progression/${w2f.items[0].exerciseId}`)).data.points.find((p) => p.workoutId === w2Id);
  check("statystyki po edycji serii", prog?.maxSetWeight === 55 && prog.repetitionsAtMaxSet === 9, `${prog?.maxSetWeight} x ${prog?.repetitionsAtMaxSet}`);
  await openPlans();
  await page.getByRole("button", { name: "Moje" }).click();
  await page.getByRole("button", { name: "Usuń plan" }).first().click();
  await page.waitForTimeout(900);
  const w2g = (await api(`/api/workouts/${w2Id}`)).data;
  check("usunięcie planu zeruje workoutPlanId treningu", !(await planByName("Smoke plan B")) && w2g.workoutPlanId == null, String(w2g.workoutPlanId));
} catch (e) {
  check("scenariusz przerwany", false, String(e).split("\n").slice(0, 4).join(" | "));
  await page.screenshot({ path: "smoke-failure.png" }).catch(() => {});
}

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} kroków OK`);
process.exit(failed ? 1 : 0);
