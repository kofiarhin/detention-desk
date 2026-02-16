# DetentionDesk

DetentionDesk is a multi-tenant MERN application designed for schools to manage student behaviour, rewards, and automated detentions with strict tenant isolation and full auditability.

**Core Value Proposition**  
Track behaviour. Enforce accountability. Reward improvement.

---

## Product Overview

DetentionDesk enables schools to manage:

- Student behaviour incidents  
- Student rewards  
- Automated detentions  
- Detention lifecycle & resolution  
- Teacher/admin notes & commentary  
- Parent visibility & accountability  

Each school operates inside a fully isolated tenant environment.

---

## Architecture

### Stack

- **Frontend:** React (Vite), SCSS, React Router, React Query  
- **Backend:** Node.js, Express, MongoDB (Mongoose)  
- **Deployment:** Vercel + Render/Heroku + MongoDB Atlas  

---

### Multi-Tenant Model

**Tenant = School**

Isolation rules:

- Every tenant-owned record includes `schoolId`
- JWT contains `userId`, `schoolId`, `role`
- `schoolId` is never accepted from the client
- All queries are scoped by `schoolId`
- All lookups by ID use `{ _id, schoolId }`

This prevents cross-school data leakage.

---

## Identity & Authentication

Users authenticate with:

- School Code  
- Email  
- Password  

Resolution flow:

1. Resolve school via `schoolCode`
2. Resolve user via `{ email + schoolId }`
3. Issue JWT:

```json
{
  "userId": "...",
  "schoolId": "...",
  "role": "schoolAdmin | teacher | parent | owner"
}
