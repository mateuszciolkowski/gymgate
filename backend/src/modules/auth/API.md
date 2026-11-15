# Auth module

All responses use `{ success, data }` / `{ success: false, error }`. Error messages are Polish.

## PWA endpoints (unchanged)

- `POST /api/auth/register` `{ email, password (min 6), firstName (min 2), lastName (min 2), phone? }` -> `201 { user, token }` (JWT, 7 days). `409` when the e-mail exists.
- `POST /api/auth/login` `{ email, password }` -> `{ user, token }`. `401 "Nieprawidłowy email lub hasło"`.
- `GET /api/auth/me` (Bearer) -> user without password.

Rate limit on register/login (and the mobile variants below): 10 attempts / 15 min / IP (`429`).

## Mobile sessions

Same credentials validation and messages as the PWA endpoints; optional `deviceId` (max 128, default `unknown`) and `deviceName` (max 100).

- `POST /api/auth/mobile/register`, `POST /api/auth/mobile/login` -> `201` / `200`:

```json
{ "success": true, "data": {
  "user": { "id": "...", "email": "...", "firstName": "...", "lastName": "...", "phone": null, "isAdmin": false, "activeWorkoutId": null, "updatedAt": "..." },
  "accessToken": "<JWT, same payload/format as the PWA token, valid 1 h>",
  "accessTokenExpiresIn": 3600,
  "refreshToken": "<random 43-char base64url string>",
  "refreshTokenExpiresAt": "2027-05-14T10:00:00.000Z"
} }
```

- `POST /api/auth/mobile/refresh` `{ refreshToken }` -> `200` same shape as above with a NEW `accessToken` and a NEW `refreshToken` (expiry slides to now + 180 days). `401 "Nieprawidłowy lub wygasły token odświeżania"` for unknown / expired / revoked tokens or a deleted user. `400` without a token. Not rate limited.
- `POST /api/auth/mobile/logout` `{ refreshToken }` -> `200 { success: true, data: null }`; revokes the whole token family of that login. Idempotent (unknown token is `200`).

Refresh token storage: only the SHA-256 hash is kept (`refresh_tokens`). Tokens of one login form a family (`familyId`). Rotation tolerates a lost response: the previous token stays valid until its successor has been presented for the first time (retrying the old token issues another successor). Presenting a token whose successor was already used (i.e. anything older than the previous token) revokes the whole family (all `refreshToken`s of that login; other devices are unaffected). The existing `authMiddleware` is unchanged: the access token is a normal JWT.

## DELETE /api/auth/account

Auth: Bearer. Body `{ password }` (`400` without it). Deletes the user and all their data in one statement (FK cascades): private exercises, workouts with items and sets, stats, pending notes, plans (including public ones; other users' favorites of them disappear with the plan and their workouts lose `workoutPlanId`), favorites, sync operations, refresh tokens. Global exercises and built-in plans stay.

Responses: `200 { success: true, data: null }`; `403 "Nieprawidłowe hasło"` (403, not 401, so clients do not treat it as an expired session); `403 "Tego konta nie można usunąć"` for the legacy global-catalogue owner (id `"1"`); `401` for a missing/invalid token or an already deleted user; `429` shares the login rate limit. An access token issued before deletion still verifies as a JWT, but every user-bound call fails afterwards (`/me` returns `404`).
