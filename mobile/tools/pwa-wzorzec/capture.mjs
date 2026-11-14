// Zrzuty wzorcowe PWA (viewport iPhone 15 Pro) do porównań wizualnych z apką.
// Wymaga: lokalny backend (DB_ENV=local, dane z seed-local.ts) i PWA na BASE_URL.
// Użycie: node capture.mjs [katalog_wyjściowy]
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";

// Playwright bywa zainstalowany globalnie; require znajduje go także wtedy.
const { chromium, devices } = createRequire(import.meta.url)("playwright");

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:5173";
const EMAIL = process.env.GG_EMAIL ?? "test@gymgate.com";
const PASSWORD = process.env.GG_PASSWORD ?? "Test1234!";
const OUT = path.resolve(process.argv[2] ?? "../../docs/wzorzec");
const ALL_THEMES = ["dark", "steel", "graphite", "violet", "ember", "crimson", "light", "blossom", "sky", "sand", "sage", "slate"];

const { defaultBrowserType: _ignored, ...iphone } = devices["iPhone 15 Pro"];
const browser = await chromium.launch();
const log = [];

// Backend ogranicza logowanie do 10 prób na 15 minut na IP, więc logujemy się raz
// przez API i wstrzykujemy sesję do kolejnych kontekstów.
const API_URL = process.env.API_URL ?? "http://localhost:3000";
const session = await fetch(`${API_URL}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
}).then((r) => r.json()).then((r) => r.data);
if (!session?.token) throw new Error("Logowanie przez API nie powiodło się");

async function newPage(theme, loggedIn = true) {
  const ctx = await browser.newContext({ ...iphone, locale: "pl-PL", timezoneId: "Europe/Warsaw" });
  await ctx.addInitScript(([t, s]) => {
    localStorage.setItem("theme", t);
    if (s && !sessionStorage.getItem("gg_injected")) {
      sessionStorage.setItem("gg_injected", "1");
      localStorage.setItem("gymgate_token", s.token);
      localStorage.setItem("gymgate_user", JSON.stringify(s.user));
    }
  }, [theme, loggedIn ? session : null]);
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  return { ctx, page };
}

async function shot(page, theme, name) {
  const dir = path.join(OUT, theme);
  fs.mkdirSync(dir, { recursive: true });
  await page.waitForTimeout(450);
  await page.screenshot({ path: path.join(dir, `${name}.png`) });
  log.push(`${theme}/${name}`);
}

async function open(page) {
  await page.goto(BASE_URL);
  await page.getByText("Historia sesji").waitFor();
}

const tab = (page, label) => page.getByRole("navigation", { name: "Nawigacja główna" }).getByRole("button", { name: label }).click();
const step = async (name, fn) => { try { await fn(); } catch (e) { log.push(`!! ${name}: ${String(e).split("\n")[0]}`); } };

async function authScreens(theme) {
  const { ctx, page } = await newPage(theme, false);
  await page.goto(BASE_URL);
  await shot(page, theme, "01-logowanie");
  await step("login-blad", async () => {
    await page.getByPlaceholder("twoj@email.com").fill("zly@example.com");
    await page.getByPlaceholder("••••••••").fill("zlehaslo");
    await page.getByRole("button", { name: "Zaloguj się" }).click();
    await page.waitForTimeout(800);
    await shot(page, theme, "02-logowanie-blad");
  });
  await step("rejestracja", async () => {
    await page.getByRole("button", { name: "Zarejestruj się" }).click();
    await shot(page, theme, "03-rejestracja");
  });
  await ctx.close();
}

async function full(theme) {
  await authScreens(theme);
  const { ctx, page } = await newPage(theme);
  await open(page);
  await shot(page, theme, "10-treningi");
  await step("treningi-dol", async () => {
    await page.mouse.wheel(0, 900);
    await shot(page, theme, "11-treningi-przewiniete");
    await page.mouse.wheel(0, -2000);
  });
  await step("aktywny", async () => {
    await page.getByRole("button", { name: "Kontynuuj trening" }).click();
    await shot(page, theme, "20-trening-aktywny");
    await page.getByText("#1").click();
    await shot(page, theme, "21-trening-aktywny-cwiczenie-rozwiniete");
    await page.getByRole("button", { name: /Dodaj ćwiczenie/ }).first().click();
    await shot(page, theme, "22-wybor-cwiczenia");
    await page.getByRole("dialog", { name: "Wybierz ćwiczenie" }).getByRole("button").first().click();
    await page.getByRole("button", { name: "Notatki" }).first().click();
    await shot(page, theme, "23-notatki-treningu");
    await page.keyboard.press("Escape");
    await page.reload();
    await page.getByText("Historia sesji").waitFor();
  });
  await step("zakonczony", async () => {
    await page.getByText("Barki i ramiona").first().click();
    await shot(page, theme, "30-trening-zakonczony");
    await page.getByText("#1").click();
    await shot(page, theme, "31-trening-zakonczony-cwiczenie-rozwiniete");
    await page.getByRole("button", { name: "Wróć" }).click();
  });
  await step("cwiczenia", async () => {
    await tab(page, "Ćwiczenia");
    await shot(page, theme, "40-cwiczenia");
    await page.getByRole("button", { name: "Nowe ćwiczenie" }).click();
    await shot(page, theme, "41-nowe-cwiczenie");
    await page.getByRole("button", { name: "Wróć" }).click();
  });
  await step("statystyki", async () => {
    await tab(page, "Statystyki");
    await shot(page, theme, "50-statystyki");
    await page.mouse.wheel(0, 500);
    await shot(page, theme, "51-statystyki-lista");
    await page.getByText("Wyciskanie sztangi", { exact: false }).first().click();
    await shot(page, theme, "52-statystyki-cwiczenie");
    await page.mouse.wheel(0, 600);
    await shot(page, theme, "53-statystyki-cwiczenie-sesje");
    await page.getByRole("button", { name: "Wróć" }).click();
  });
  await step("szuflada", async () => {
    await page.getByRole("button", { name: "Otwórz menu" }).click();
    await shot(page, theme, "60-szuflada");
    await page.getByRole("button", { name: "Plany treningowe" }).click();
    await shot(page, theme, "70-plany");
    await page.getByRole("button", { name: "Built-in" }).click();
    await shot(page, theme, "72-plany-wbudowane");
    await page.getByRole("button", { name: "Stwórz nowy plan" }).click();
    await shot(page, theme, "71-formularz-planu");
    await page.getByRole("button", { name: "Wróć" }).click();
  });
  await step("ustawienia", async () => {
    await page.getByRole("button", { name: "Otwórz menu" }).click();
    await page.getByRole("button", { name: "Ustawienia" }).click();
    await shot(page, theme, "80-ustawienia");
    await page.getByRole("button", { name: /Motyw kolorystyczny/ }).click();
    await shot(page, theme, "81-wybor-motywu");
  });
  await ctx.close();
}

async function key(theme) {
  const { ctx, page } = await newPage(theme);
  await open(page);
  await shot(page, theme, "10-treningi");
  await step("aktywny", async () => {
    await page.getByRole("button", { name: "Kontynuuj trening" }).click();
    await shot(page, theme, "20-trening-aktywny");
  });
  await ctx.close();
}

for (const t of ALL_THEMES) await (t === "dark" || t === "light" ? full(t) : key(t));
await browser.close();
console.log(log.join("\n"));
