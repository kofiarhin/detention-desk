# DetentionDesk

DetentionDesk is a multi-tenant MERN application for schools to manage behaviour incidents, rewards, and detention workflows with strict tenant isolation.

## Tech Stack

- Backend: Node.js + Express + MongoDB (Mongoose)
- Frontend: React (Vite) + React Router + SCSS

## Local Development

### 1) Install dependencies

```bash
npm install
npm install --prefix client
```

### 2) Configure environment variables

Create a root `.env` with your backend settings (Mongo URI, JWT secret, etc).

### 3) Run full stack in development

```bash
npm run dev
```

- Backend runs on `http://localhost:5000`
- Frontend runs on `http://localhost:4000`
- Vite proxy forwards `/api/*` requests to the backend in dev

### 4) Run backend only

```bash
npm run server
```

### 5) Run frontend only

```bash
npm run client
```

## Frontend Auth Flow

- Login page: `/login`
- Sends credentials (`schoolCode`, `email`, `password`) to `/api/auth/login`
- Stores JWT token and user payload in `localStorage`
- Protected routes redirect to `/login` if token is missing
- Dashboard route (`/dashboard`) is admin-only (teacher is blocked)
- Any API 401 clears session and redirects to `/login`
