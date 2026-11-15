# Dla Mateusza

Rzeczy, których agent nie zrobi sam: ustawienia na Twoim komputerze i telefonie, konta, sekrety, pytania o hosting. Każda pozycja ma status. Po wykonaniu odhacz ją albo powiedz agentowi, żeby odhaczył.

## 1. Pierwsze uruchomienie na MacBooku

Cel: sesja Claude Code działająca lokalnie, z dostępem do Xcode, symulatora iOS i emulatora Androida. Od tego zależą wszystkie etapy od 3 w górę.

### 1.1 Zanim uruchomisz agenta: zabezpiecz produkcyjną bazę

- [ ] Otwórz `backend/.env` na MacBooku i sprawdź wartość `DB_ENV`. Jeśli jest `remote` (albo brak wpisu), a `DATABASE_URL` wskazuje na Supabase, to lokalny backend łączy się z produkcją. Ustaw:

  ```
  DB_ENV=local
  DATABASE_URL_LOCAL="postgresql://postgres:postgres@localhost:5433/gymgate_local"
  DIRECT_URL_LOCAL="postgresql://postgres:postgres@localhost:5433/gymgate_local"
  ```

- [ ] Najbezpieczniej: na czas migracji usuń z tego pliku produkcyjne `DATABASE_URL` i `DIRECT_URL` (zachowaj je w menedżerze haseł). Wtedy żadne polecenie, nawet błędne, nie trafi w produkcję. Deploy na Railway ma własne zmienne i tego pliku nie używa.

### 1.2 Kod

```bash
cd <folder z repo gymgate>
git fetch origin
git checkout mobile-migration
git pull
```

### 1.3 Narzędzia

Agent sprawdzi i doinstaluje, co się da, ale te wymagają Ciebie (instalatory z interfejsem, zgody systemowe):

- [ ] **Xcode** z App Store, uruchomiony raz (akceptacja licencji, instalacja symulatora iOS).
- [ ] **Docker Desktop** uruchomiony (lokalna baza przez `make -C backend local-setup`). Alternatywa: PostgreSQL z Homebrew na porcie 5433.
- [ ] **Android Studio** z co najmniej jednym emulatorem (potrzebne od Etapu 3, zadanie 3.8).
- [ ] **Node 20** (`node -v`).

### 1.4 Start sesji

W terminalu, w folderze repo:

```bash
claude remote-control
```

Sesja pojawi się w aplikacji Claude Code (także na telefonie). Alternatywa: aplikacja Claude Desktop z otwartym folderem repo.

Pierwsza wiadomość do agenta:

> Przeczytaj MIGRACJA_MOBILE.md i mobile/docs/STATUS.md na gałęzi mobile-migration i kontynuuj od pierwszego nieukończonego zadania. Pracujesz lokalnie na MacBooku: masz Xcode i symulator, więc możesz brać zadania oznaczone „Mac”. Najpierw sprawdź, że backend/.env ma DB_ENV=local i że żadne polecenie nie trafi w produkcyjną bazę.

### 1.5 Jedna sesja naraz

Sesja chmurowa ma zadanie wybudzające co 4 godziny („GymGate: wznów migrację mobilną”). Gdy zaczniesz pracę na MacBooku, dwie sesje pushowałyby na tę samą gałąź. Wyłącz zadanie chmurowe (powiedz o tym agentowi w sesji chmurowej albo wyłącz je w ustawieniach zadań) i ewentualnie ustaw nowe w sesji lokalnej.

## 2. Pytania o hosting (odłożone, nie blokują)

- [ ] Z jakiej gałęzi Railway robi deploy backendu i czy reaguje na zmiany poza `backend/`?
- [ ] Czy Vercel buduje podglądy z gałęzi innych niż `main` i na jakie API one wskazują?
- [ ] Czy chcesz testową instancję backendu na swoim VPS (Coolify), żeby testować apkę na telefonie poza domowym Wi-Fi? Opis: `PLAN.md`, sekcja 11.

## 3. Decyzje do przejrzenia (nie blokują)

Opis w `DECYZJE.md`:

- [ ] **D-03** dziennik zmian zapisują wyzwalacze w bazie
- [ ] **D-05** statystyki liczone tylko lokalnie w apce
- [ ] **D-11** naprawa błędu edycji treningu po stronie backendu

## 4. Błąd w produkcyjnym PWA, o którym warto wiedzieć

Edycja szczegółów treningu (nazwa, siłownia, data, czas) nie zapisuje się, gdy jesteś online: pojawia się „Nie udało się zapisać zmian”. Przyczyna i naprawa: `INWENTARYZACJA.md`, błąd B1. Naprawa jest zaplanowana w Etapie 4 i trafi na produkcję razem z resztą zmian backendu, po Twojej akceptacji.

## 5. Testy na urządzeniach

Scenariusze będą dopisywane tutaj w miarę powstawania apki (pierwsze przy Etapie 5: wgranie na iPhone'a i trening w trybie samolotowym).
