# Moduł: Auth

## Odpowiedzialność

Obsługa rejestracji, logowania i weryfikacji sesji użytkownika. Zarządzanie profilem użytkownika należy do modułu `user`.

## Endpointy

| Metoda | Ścieżka              |   Auth wymagany    | Opis                            |
| ------ | -------------------- | :----------------: | ------------------------------- |
| POST   | `/api/auth/register` |         ✗          | Rejestracja nowego konta        |
| POST   | `/api/auth/login`    |         ✗          | Logowanie, zwraca JWT           |
| GET    | `/api/auth/me`       | ✗ (self-validates) | Profil zalogowanego użytkownika |

> `/api/auth/me` nie korzysta z `authMiddleware` – token weryfikowany jest bezpośrednio w kontrolerze, co pozwala na zwracać `401` zamiast blokowania na poziomie middleware.

## Przepływ rejestracji

```
POST /api/auth/register
  ↓ validate(registerSchema)   – Zod: email, password, firstName, lastName, phone?
  ↓ authService.register()
      ├─ sprawdź email (userRepo.findUserByEmail) → 409 jeśli istnieje
      ├─ bcrypt.hash(password, 10)
      ├─ userRepo.createUser(...)
      └─ jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: "7d" })
  ↓ 201 { success: true, data: { user, token } }
```

## Przepływ logowania

```
POST /api/auth/login
  ↓ validate(loginSchema)      – Zod: email, password
  ↓ authService.login()
      ├─ userRepo.findUserByEmail → 401 jeśli nie istnieje
      ├─ bcrypt.compare(password, hash) → 401 jeśli niezgodne
      └─ jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: "7d" })
  ↓ 200 { success: true, data: { user, token } }
```

## Token JWT

- **Payload:** `{ userId: string, email: string }`
- **Czas życia:** 7 dni
- **Sekret:** `JWT_SECRET` (env var, wymagany)
- **Transport:** `Authorization: Bearer <token>` header

## Middleware authMiddleware

Plik: `backend/src/common/middleware/auth.ts`

```typescript
// Dołącza do request:
req.userId; // string (UUID)
req.userEmail; // string
```

Odpowiedź `401` jest zwracana przy braku tokenu lub gdy token jest nieprawidłowy/wygasły.

## Frontend – AuthContext

Plik: `frontend/src/contexts/AuthContext.tsx`

- Token przechowywany jest w `localStorage` pod kluczem `gymgate_token`
- Cache danych użytkownika zapisywany jest w `localStorage` pod kluczem `gymgate_user`
- Przy starcie aplikacji wywoływany jest `GET /api/auth/me` – przy braku sieci użytkownik odtwarzany jest z cache
- `authFetch` (`frontend/src/utils/auth.ts`) interceptuje `401`, czyści storage i przeładowuje stronę

## Błędy

| Kod | Sytuacja                                               |
| --- | ------------------------------------------------------ |
| 401 | Nieprawidłowy email lub hasło / brak lub wygasły token |
| 409 | Email już zajęty (rejestracja)                         |
| 422 | Błąd walidacji Zod                                     |
| 500 | Brak `JWT_SECRET` w env                                |

## Pliki

```
backend/src/modules/auth/
  auth.routes.ts
  auth.controller.ts
  auth.service.ts
  auth.schema.ts      ← registerSchema, loginSchema (Zod)
backend/src/common/middleware/
  auth.ts             ← authMiddleware
frontend/src/contexts/
  AuthContext.tsx
frontend/src/utils/
  auth.ts             ← authFetch, getAuthHeaders
```
