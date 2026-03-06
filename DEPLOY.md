# Deploy backend to Vercel

Per [NestJS on Vercel](https://vercel.com/docs/frameworks/backend/nestjs): the app uses the default entrypoint `src/main.ts` and deploys as a single Vercel Function.

## 1. Deploy

- **From repo root (monorepo):** In Vercel, create a new project and set **Root Directory** to `backend`.
- **From backend folder:** Run `vercel` or `vc deploy` inside `backend/`, or connect the repo and set root to `backend`.

## 2. Environment variables

In the Vercel project → **Settings → Environment Variables**, add:

| Variable | Required | Description |
|----------|----------|-------------|
| `SENDGRID_API_KEY` | Yes (if email enabled) | SendGrid API key |
| `CONTACT_EMAIL` | Yes (if email enabled) | Owner email (verified in SendGrid) |
| `FRONTEND_URL` | Yes | Allowed CORS origin(s). Comma-separated for multiple (e.g. `https://your-site.vercel.app,https://www.yourdomain.com`) |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Optional | Google Sheet ID for contact rows |
| `GOOGLE_SHEETS_SHEET_NAME` | Optional | Sheet tab name (e.g. `Sheet1`) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Optional | Full service account JSON string (use this on Vercel; no key file) |

Do **not** commit `.env.local`. Use Vercel’s env UI or CLI.

## 3. Frontend

Set the marketing site’s `VITE_API_BASE_URL` to your Vercel backend URL, e.g. `https://your-backend.vercel.app`.

## 4. Local

```bash
cd backend
vercel dev
```

Requires [Vercel CLI](https://vercel.com/docs/cli) ≥ 48.4.0.
