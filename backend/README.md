# Code Review Backend (Gemini)


## Setup
1. `cp .env.example .env` and add your `GEMINI_API_KEY`.
2. `npm install`
3. `npm run start` (or `npm run dev`)


## Endpoints
- `GET /api/health` → `{ status: 'ok' }`
- `POST /api/review` → multipart/form-data with `files`[]


## Deploy Notes
- Set env vars: `GEMINI_API_KEY`, `PORT`, `CORS_ORIGIN`.
- Ensure the platform build uses Node 18+.