# AGENTS.md --- Kofi's Coding Guidelines (DevKofi Standard)

This file defines the non-negotiable engineering conventions for all
DevKofi projects (MERN-first), including architecture, code style,
environment handling, testing, deployment, and AI-assistant behavior.

------------------------------------------------------------------------

## 0) Prime Directive

-   Ship real, working output. No placeholders unless explicitly
    requested.
-   Prefer clarity + maintainability over cleverness.
-   Default to MERN stack contexts (MongoDB, Express, React, Node).
-   Assume development in VS Code with integrated AI tools
    (Klein/Sonic).
-   Deploy targets: Vercel (frontend), Render / Heroku (backend).
-   All code should be copy-paste ready, runnable, and
    production-minded.

------------------------------------------------------------------------

## 1) Repository Standards

### 1.1 Structure (Default)

Recommended monorepo layout:

/client\
/server\
/shared\
/docs\
/README.md\
/AGENTS.md\
/.gitignore

-   Keep API and client logically separated.
-   Prefer explicit names (routes, controllers, models, services,
    tests).

### 1.2 Naming Conventions

-   React components: PascalCase
-   Routes: resource.routes.js
-   Controllers: resource.controller.js
-   Models: Resource.js

### 1.3 Imports & Exports

Import order:

1)  Node built-ins\
2)  External libs\
3)  Internal modules\
4)  Styles/assets

------------------------------------------------------------------------

## 2) Environment Variables & Secrets (Non-Negotiable)

### 2.1 .env Rules

-   Always use .env for secrets.
-   Never hard-code credentials or keys.

### 2.2 .gitignore Rules (Required)

node_modules\
.env\
notes.txt\
dist\
build

### 2.3 Runtime Config

-   Server → process.env\
-   Client → import.meta.env.VITE\_\*

------------------------------------------------------------------------

## 3) Backend Standards (Node + Express + MongoDB)

### 3.1 Express Setup

-   Separate server bootstrap from app config.
-   Keep route logic in controllers.

### 3.2 API Design

REST-first:

GET /api/resource\
GET /api/resource/:id\
POST /api/resource\
PUT /api/resource/:id\
DELETE /api/resource/:id

### 3.3 Validation

Validate at controller boundary.

### 3.4 Error Handling

Standard shape:

{ "message": "Readable error message", "code": "OPTIONAL", "details": {}
}

### 3.5 Auth & Security

-   JWT-based auth
-   bcrypt password hashing
-   No Morgan by default
-   Helmet optional, intentional

### 3.6 Database (Mongoose)

-   timestamps: true
-   Proper refs & indexes
-   Prefer lean() for reads

### 3.7 Pagination / Filtering

?page=1&limit=20\
?sort=-createdAt\
?q=term

------------------------------------------------------------------------

## 4) Frontend Standards (React + Vite)

### 4.1 Styling (Default)

-   SCSS
-   BEM-style global classes
-   component.styles.scss
-   import "./component.styles.scss"

### 4.2 State & Data Fetching

-   Local state for UI
-   React Query / Redux Toolkit used intentionally

### 4.3 Components

Small, composable, logic extracted to hooks.

### 4.4 Forms

-   Validate before submit
-   Proper loading & error states

------------------------------------------------------------------------

## 5) Testing Standards (Jest + Supertest)

Backend tests under /server/tests

jest.config.js baseline:

module.exports = { testEnvironment: 'node', roots:
\['`<rootDir>`{=html}/server'\], testMatch:
\['**/tests/**/\*.test.js'\], setupFilesAfterEnv:
\['`<rootDir>`{=html}/server/tests/setup.js'\], verbose: true }

------------------------------------------------------------------------

## 6) Scraping Standard (Non-Negotiable)

Use Crawlee only.

------------------------------------------------------------------------

## 7) Deployment Standards

### Frontend (Vercel)

-   npm run build
-   dist output
-   VITE\_\* env vars only

### Backend (Render / Heroku)

-   Respect PORT
-   Env vars via dashboard

------------------------------------------------------------------------

## 8) Performance Defaults

-   Avoid N+1 queries
-   Use projection & lean()
-   Paginate scalable datasets

------------------------------------------------------------------------

## 9) Accessibility & UX

-   Proper semantic elements
-   Loading / empty / error states required

------------------------------------------------------------------------

## 10) AI-Assistant Operating Rules

### Output Format

Return full files when generating/fixing code.

### No Fluff

Keep responses concise and execution-focused.

### Assumptions

Make reasonable defaults; do not stall progress.

------------------------------------------------------------------------

## 11) DevKofi Shortcut System (:create)

Format:

:create:\[type\]:\[name\]

Supported:

:create:server:\
:create:model:Name\
:create:crud:Resource\
:create:controller:Name\
:create:test:Name\
:create:component:ComponentName\
:create:style:Name\
:create:service:Name\
:create:route:Name

Shortcut retrieval → code only.

------------------------------------------------------------------------

## 12) Code Quality Standards

-   Avoid duplication
-   Keep functions readable
-   Deterministic error handling

------------------------------------------------------------------------

## 13) Security Minimums

-   Never log secrets
-   Validate inputs
-   Store hashes only

------------------------------------------------------------------------

## 14) "Done" Definition

A feature is done when:

-   Works end-to-end
-   Handles edge cases
-   Deployable
-   No secret leaks
