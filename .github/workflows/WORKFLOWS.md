# CI/CD Workflows (GitHub Actions + Vercel + Railway)

## Overview

This repository uses two GitHub Actions quality-gate workflows:

- `backend-ci.yml` (`backend-checks`)
- `frontend-ci.yml` (`frontend-checks`)

Deployments remain managed by Git integrations:

- **Vercel** for frontend
- **Railway** for backend

GitHub Actions is used as CI gate before merge to `main` (not as a duplicate deploy pipeline).

## Trigger Strategy

Both workflows run on:

- `pull_request` to `main`
- `push` to `main`

To avoid required-checks staying pending when unrelated files change:

- workflows always trigger,
- inside each workflow `dorny/paths-filter@v3` detects whether relevant paths changed,
- heavy steps are conditionally executed only for matching changes.

This keeps `backend-checks` and `frontend-checks` reportable and usable as required branch checks.

## Workflow Details

### backend-ci.yml

Job: `backend-checks`

Changed paths gate:

- `backend/**`
- `.github/workflows/backend-ci.yml`

Executed steps when backend changes are detected:

1. `npm ci`
2. `npm run typecheck`
3. `npm test`
4. `npm run build`

### frontend-ci.yml

Job: `frontend-checks`

Changed paths gate:

- `frontend/**`
- `.github/workflows/frontend-ci.yml`

Executed steps when frontend changes are detected:

1. `npm ci`
2. `npm run typecheck`
3. `npm run build`

Note: frontend lint is currently excluded from blocking CI because the project has existing historical lint issues unrelated to current changes.

## Branch Protection (required)

For branch `main`, set:

1. **Require a pull request before merging**
2. **Require status checks to pass before merging**
3. Required checks:
   - `backend-checks`
   - `frontend-checks`

With this setup, CI must be green before merge, and only then Vercel/Railway deploy from `main`.

## Node Version Consistency

Current workflow Node runtime: `20`.

Use the same major runtime in deployment platforms:

- Vercel: `20.x`
- Railway: `20.x`

If migrating to Node 22, switch all environments together (CI + Vercel + Railway).

## Local Verification Commands

### Backend

```bash
cd backend
npm run typecheck
npm test
npm run build
```

### Frontend

```bash
cd frontend
npm run typecheck
npm run build
```

## Follow-up Improvement (next sprint)

For frontend lint visibility without hard-blocking all PRs, choose one:

1. Soft lint signal (non-blocking warning job), or
2. Lint only changed files (incremental cleanup strategy).
