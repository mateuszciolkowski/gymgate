# ADR-002 – JWT Bearer zamiast sesji cookie

**Status:** Zaakceptowany  
**Data:** 2024

## Kontekst

Aplikacja wymaga mechanizmu uwierzytelniania dla SPA React komunikującego się z REST API. Kluczowe wymagania to działanie offline (token musi być dostępny lokalnie) oraz brak konieczności zarządzania stanem sesji po stronie serwera.

## Decyzja

Zastosowano **JWT** (JSON Web Token) przesyłany w nagłówku `Authorization: Bearer <token>`. Token przechowywany jest w `localStorage` pod kluczem `gymgate_token`. Czas życia: **7 dni**.

## Uzasadnienie

- **Stateless** – serwer nie przechowuje sesji; walidacja tokenu jest niezależna od bazy danych.
- **Offline support** – token w `localStorage` pozostaje dostępny bez połączenia z siecią; `AuthContext` odtwarza stan użytkownika z cache nawet gdy `GET /api/auth/me` jest niedostępny.
- **Cross-origin** – podejście nie wymaga specjalnej obsługi CORS dla cookie (`SameSite`, `Secure`); upraszcza konfigurację dla Railway + Vercel.
- **Prostota** – nie zachodzi potrzeba implementacji refresh token flow na obecnym etapie projektu.

## Konsekwencje

- Token **nie jest automatycznie unieważniany** po stronie serwera (brak blacklisty) – zmiana hasła nie unieważnia istniejących tokenów.
- `localStorage` jest podatny na XSS; wymagane są CSP i sanityzacja inputów.
- `authFetch` (`frontend/src/utils/auth.ts`) interceptuje odpowiedź `401`, usuwa token z `localStorage` i przeładowuje stronę.

## Rozważane alternatywy

- **httpOnly cookie** – zapewnia lepszą ochronę przed XSS, lecz komplikuje obsługę CORS i tryb offline. Uwaga: stary `backend/docs/ARCHITECTURE.md` błędnie opisywał "httpOnly cookie" – faktycznie stosowany jest Bearer header.
- **Refresh token** – pominięty jako nadmiarowy dla obecnej skali projektu.
- **Sesje serwerowe** – wykluczone ze względu na wymaganie bezstanowości serwera i wsparcia dla trybu offline.
