# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm run dev          # Full stack (backend :5000, frontend :4000)
npm run server       # Backend only
npm run client       # Frontend only (from repo root)
```

### Testing
```bash
npm test                    # All Jest backend tests
npm run test:server         # Backend tests only
npm run test:e2e            # Playwright E2E (headless)
npm run test:e2e:headed     # Playwright E2E (with browser)
npm run test:e2e:ui         # Playwright interactive UI
```

Run a single test file:
```bash
npx jest server/tests/path/to/file.test.js
```

### Frontend (from client/)
```bash
npm run build    # Production build
npm run lint     # ESLint
npm run preview  # Preview production build
```

### Seeding
```bash
npm run seed:demo       # Seed demo tenant with sample data
npm run seed:demo:api   # Seed via API
```

## Architecture

**Monorepo**: `/client` (React + Vite) and `/server` (Express + MongoDB). Root `package.json` orchestrates both.

### Backend (`server/`)

- **Entry**: `server.js` bootstraps config → DB → app → listen. App setup is in `app.js` (`buildApp()`).
- **Config**: `server/config/env.js` centralises all env vars via `getConfig()` / `validateStartupConfig()`. Production requires explicit `CORS_ORIGINS`, `APP_URL`, and email config if enabled.
- **Routes**: Dual-mounted on both `/resource` and `/api/resource` for Vercel rewrite compatibility. Route groups:
  - Public: `/signup`, `/auth`
  - Owner-only (no schoolId): `/owner`, `/policy`
  - Tenant-scoped (schoolId required): all others under `/api/`
- **Middleware order**: requestId → requestLogger → helmet → cors → json body parser → rate limiters → routes
- **Naming**: `resource.routes.js`, `resource.controller.js`, `Resource.js` models (PascalCase)

### Multi-Tenancy

Every tenant-scoped model has a `schoolId` field. `requireTenant` middleware blocks the `owner` role from tenant routes. All DB queries in controllers filter by `req.auth.schoolId`. This is the primary isolation mechanism — never query without it on tenant resources.

### Auth Flow

1. Client POSTs `{ schoolCode, email, password }` to `/api/auth/login`
2. JWT issued, stored in localStorage as `detentiondesk_token` + `detentiondesk_session`
3. All requests send `Authorization: Bearer <token>`
4. `requireAuth` middleware verifies JWT, attaches `req.auth = { userId, schoolId, role }`
5. `requireRole([...roles])` enforces RBAC

Roles: `owner` (platform admin, no schoolId), `schoolAdmin`, `teacher`, `parent`.

### Frontend (`client/src/`)

- **Entry**: `main.jsx` wraps app in `BrowserRouter → AuthProvider → CategoriesProvider`
- **Routing**: `App.jsx` uses React Router v7. Protected routes check role via `RequireAuth`. Role redirects are handled in `AuthContext` (`getHomeRoute(role)`).
- **API calls**: Use `apiRequest({ method, path, body })` from `client/src/services/api.js`. Paths must start with `/api/`. The function handles auth headers, error parsing, and normalises `payload.data ?? payload`. Do not use the older `client/src/lib/api.js` directly for new code.
- **State**: Auth state via `AuthContext`. Categories via `CategoriesContext`. No global state library — use React Context + local state.
- **Styles**: SCSS with BEM methodology in `client/src/styles/`.

### API Proxy / Production Routing

- **Dev**: Vite proxies `/api/*` → `http://localhost:5000` (see `client/vite.config.js`)
- **Production**: `client/vercel.json` rewrites `/api/(.*)` → Heroku backend at `https://detention-desk-api-fd5c9a3420b5.herokuapp.com/api/$1`; `/*` → `index.html`

### Testing Setup

- **Backend**: Jest + Supertest. Tests in `server/tests/`. Setup file `server/tests/setup.js` uses `mongodb-memory-server` — tests run against an in-memory MongoDB instance, not mocks.
- **E2E**: Playwright config in `playwright.config.js`. Tests in `e2e/`.
- **Jest config**: Matches `**/tests/**/*.test.js`, rootDir is `server/`.

### Key Conventions (from AGENTS.md)

- Validate inputs at the controller boundary, not in routes or models
- Services handle business logic; controllers are thin wrappers
- Never hardcode credentials — always use `getConfig()`
- API error responses: `{ message, code?, details? }`
- Common error codes: `RATE_LIMITED`, `INVALID_TOKEN`, `AUTH_REQUIRED`, `TENANT_REQUIRED`, `PASSWORD_RESET_REQUIRED`
- Avoid N+1 queries; use `.lean()` and field projection on Mongoose queries
- Parents must change their initial password — enforced via `PASSWORD_RESET_REQUIRED` code and a frontend redirect to `/parent/change-password`
