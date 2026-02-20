# Production Readiness (Backend)

## Required backend environment variables

- `NODE_ENV=production`
- `PORT` (set by Render/Heroku at runtime)
- `MONGO_URI`
- `JWT_SECRET`
- `CORS_ORIGINS` (comma-separated origins, no wildcard in production)
- `APP_URL` or `FRONTEND_URL`
- `EMAIL_FROM` (required when `EMAIL_ENABLED=true`)
- Email credentials when `EMAIL_ENABLED=true` in production (`RESEND_API_KEY`, `SENDGRID_API_KEY`, or `SMTP_USER` + `SMTP_PASS`)

Example:

```bash
CORS_ORIGINS=https://app.detentiondesk.com,https://admin.detentiondesk.com
```

## Deployment notes

- Start command: `npm start`
- Health check path: `/health`
- Readiness path: `/ready`
- Backend must respect `PORT` from platform runtime.

## Frontend reminder (Vercel)

Set frontend env values in Vercel:

- `VITE_API_URL`
