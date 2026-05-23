# ADR-002 – JWT Bearer Instead of Session Cookies

**Status:** Accepted  
**Date:** 2024

## Context

The application requires an authentication mechanism for a React SPA communicating with a REST API. Key requirements are offline support (the token must be available locally) and no need for server-side session state management.

## Decision

**JWT** (JSON Web Token) is used, transmitted in the `Authorization: Bearer <token>` header. The token is stored in `localStorage` under the key `gymgate_token`. Lifetime: **7 days**.

## Rationale

- **Stateless** – the server does not store sessions; token validation is independent of the database.
- **Offline support** – the token in `localStorage` remains available without a network connection; `AuthContext` restores user state from cache even when `GET /api/auth/me` is unavailable.
- **Cross-origin** – this approach does not require special CORS handling for cookies (`SameSite`, `Secure`); simplifies configuration for Railway + Vercel.
- **Simplicity** – no need to implement a refresh token flow at the current project stage.

## Consequences

- The token **is not automatically invalidated** server-side (no blacklist) – changing a password does not invalidate existing tokens.
- `localStorage` is vulnerable to XSS; CSP and input sanitization are required.
- `authFetch` (`frontend/src/utils/auth.ts`) intercepts `401` responses, removes the token from `localStorage`, and reloads the page.

## Alternatives Considered

- **httpOnly cookie** – provides better XSS protection but complicates CORS handling and offline mode. Note: the old `backend/docs/ARCHITECTURE.md` incorrectly described "httpOnly cookie" – Bearer header is actually used.
- **Refresh token** – skipped as unnecessary for the current project scale.
- **Server sessions** – excluded due to the requirement for server statelessness and offline support.
