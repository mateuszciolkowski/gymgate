# GymGate Mobile

Natywna aplikacja (Expo / React Native) zastępująca PWA. Zlecenie, plan i decyzje: `../MIGRACJA_MOBILE.md`, `docs/PLAN.md`, `docs/DECYZJE.md`.

## Wersje

| | |
|---|---|
| Node | **24.16** (Expo SDK 58 wymaga Node `^22.13 \|\| ^24.3 \|\| >=26`; Node 20 z reszty repo nie wystarcza) |
| Expo SDK | 58 (`expo ~58.0.25`), Nowa Architektura |
| React Native / React | 0.88.1 / 19.3.0 |
| expo-router | 58.0.31 |
| TypeScript | 6.0 (`strict`) |
| Jest / jest-expo / RNTL | 30.5 / 58 / 14 |
| react-native-svg | 15.16 |
| Czcionki | `@expo-google-fonts/{barlow,barlow-condensed,dm-sans}` (pliki TTF; `@fontsource` z PWA ma tylko woff) |

Wersje bibliotek dobiera `npx expo install`; sprawdzenie: `npx expo install --check`, `npx expo-doctor`.

## Instalacja

```bash
nvm use 24            # lub: export PATH=$HOME/.nvm/versions/node/v24.16.0/bin:$PATH
cd mobile
npm ci
cp .env.example .env  # EXPO_PUBLIC_API_URL, domyślnie http://localhost:3000
```

Backend uruchamiasz osobno (patrz `../CLAUDE.md`), wyłącznie z lokalną bazą (`DB_ENV=local`).

## Uruchomienie (development build, nie Expo Go)

```bash
npx expo prebuild --platform ios          # generuje ios/ (w .gitignore)
npx expo run:ios --device <UDID symulatora lub telefonu>   # np. 261B9990-C466-474C-95D5-22D49C7E37A5
npx expo start --dev-client               # sam Metro, gdy build już stoi na urządzeniu
```

`ios/` i `android/` nie są w repozytorium (ciągła generacja natywna): po zmianie `app.json` lub pluginów uruchom `npx expo prebuild --clean`. Android: `npx expo run:android` (wymaga Android SDK; nie sprawdzone na tym Macu).

## Skrypty

| Polecenie | Co robi |
|---|---|
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `expo lint` (ESLint + eslint-config-expo + prettier) |
| `npm test` | Jest (`jest-expo`), w tym test aktualności wygenerowanych motywów |
| `npm run format` | Prettier |
| `npm run gen:themes` | Generuje `src/theme/themes.generated.ts` z `docs/tokeny-motywow.json` |

CI: `.github/workflows/mobile-ci.yml` (typecheck, lint, test na zmianach w `mobile/**`).

## Struktura

```
app/            trasy expo-router: (auth)/login|register, (app)/(tabs)/{trainings,exercises,stats,plans,settings}
src/domain/     czysta logika skopiowana z PWA razem z testami (bez React i bez bazy)
src/theme/      12 motywów (generowane), typografia, ThemeProvider + useTheme (wybór w expo-sqlite/kv-store)
src/ui/         ikony (react-native-svg, ścieżki z PWA), ScreenPlaceholder
src/api/        klient HTTP: timeout 15 s, błędy Network/Timeout/Http, wstrzykiwany dostawca tokenu
src/session/    secureStore (expo-secure-store)
tools/          gen-themes.mjs, pwa-smoke, pwa-wzorzec
```

## Motywy

Źródło: `docs/tokeny-motywow.json`. Generator (`tools/gen-themes.mjs`) zamienia wartości CSS bez odpowiednika w RN (`color-mix`, gradient, `box-shadow`) na jawne wartości; reguły są w komentarzu na początku pliku. Nie edytuj `themes.generated.ts` ręcznie; test w `src/theme/themes.test.ts` wykrywa nieaktualny plik.
