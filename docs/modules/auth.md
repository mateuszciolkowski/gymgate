# Module: Auth

## Responsibility

Handles user registration, login, and session verification. User profile management belongs to the `user` module.

## Endpoints

| Method | Path                 |      Auth Required      | Description                     |
| ------ | -------------------- | :---------------------: | ------------------------------- |
| POST   | `/api/auth/register` |            ✗            | Register a new account          |
| POST   | `/api/auth/login`    |            ✗            | Login, returns JWT              |
| GET    | `/api/auth/me`       | ✗ (self-validates)      | Logged-in user profile          |

> `/api/auth/me` does not use `authMiddleware` – the token is verified directly in the controller, allowing it to return `401` instead of blocking at the middleware level.

## Registration Flow

```
POST /api/auth/register
  ↓ validate(registerSchema)   – Zod: email, password, firstName, lastName, phone?
  ↓ authService.register()
      ├─ check email (userRepo.findUserByEmail) → 409 if exists
      ├─ bcrypt.hash(password, 10)
      ├─ userRepo.createUser(...)
      └─ jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: "7d" })
  ↓ 201 { success: true, data: { user, token } }
```

## Login Flow

```
POST /api/auth/login
  ↓ validate(loginSchema)      – Zod: email, password
  ↓ authService.login()
      ├─ userRepo.findUserByEmail → 401 if not found
      ├─ bcrypt.compare(password, hash) → 401 if mismatch
      └─ jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: "7d" })
  ↓ 200 { success: true, data: { user, token } }
```

## JWT Token

- **Payload:** `{ userId: string, email: string }`
- **Lifetime:** 7 days
- **Secret:** `JWT_SECRET` (env var, required)
- **Transport:** `Authorization: Bearer <token>` header

## authMiddleware

File: `backend/src/common/middleware/auth.ts`

```typescript
// Attaches to request:
req.userId; // string (UUID)
req.userEmail; // string
```

Returns `401` when the token is missing, invalid, or expired.

## Frontend – AuthContext

File: `frontend/src/contexts/AuthContext.tsx`

- Token stored in `localStorage` under key `gymgate_token`
- User data cache stored in `localStorage` under key `gymgate_user`
- On app start, `GET /api/auth/me` is called – if offline, user is restored from cache
- `authFetch` (`frontend/src/utils/auth.ts`) intercepts `401`, clears storage, and reloads the page

## Errors

| Code | Situation                                              |
| ---- | ------------------------------------------------------ |
| 401  | Invalid email or password / missing or expired token   |
| 409  | Email already taken (registration)                     |
| 422  | Zod validation error                                   |
| 500  | Missing `JWT_SECRET` in env                            |

## Files

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
