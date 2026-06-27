# Phase 1 Backend Setup

This checkpoint adds the portable Postgres schema and the first protected API. It does not require a paid service: Neon Free and Cloudflare Pages Free are sufficient for the two-user pilot.

Use Node.js 22 or newer. The current Wrangler release and this project's declared runtime do not support Node.js 21.

## 1. Provision Neon

1. Create or select the Seine Studio Neon project.
2. Enable Neon Auth and create only the owner and developer accounts. Keep public registration disabled.
3. Copy the pooled Postgres connection string for server use.
4. Copy the branch-specific Neon Auth URL.

The Postgres connection string is a secret. It must never use a `VITE_` prefix or enter browser code. The browser sends a short-lived Neon JWT to the Pages API; the API verifies its signature against the branch Auth endpoint's `/.well-known/jwks.json` route before applying the email allowlist.

## 2. Configure Local Development

Copy `.dev.vars.example` to `.dev.vars` and enter the four private server values. Copy `.env.example` to `.env.local` and enter only the public Neon Auth URL.

```sh
export DATABASE_URL='postgresql://...'
npm run db:migrate
npm run build
npm run dev:full
```

`npm run dev` remains the fixture-only frontend workflow. `npm run dev:full` serves the built PWA and Pages Functions together.

## 3. Configure Cloudflare Pages

Set these encrypted secrets or environment variables for Preview and Production:

- `DATABASE_URL`
- `NEON_AUTH_URL`
- `OWNER_EMAIL`
- `DEVELOPER_EMAIL`

Set `VITE_NEON_AUTH_URL` as a build-time public environment variable. **The client URL must point to the Neon Auth root domain WITHOUT the `/neondb/auth` subpath.** The REST API endpoints (sign-in, sign-up, sign-out) live at the root level (`/api/auth/sign-in/email`). The server-side `NEON_AUTH_URL` secret keeps the `/neondb/auth` subpath for JWKS verification. The owner and developer emails are checked by every protected API route even after Neon Auth has accepted the session.

## 4. Verify

1. Request `/api/health`; it should return `ready` without disclosing secret values.
2. Request `/api/me` without a bearer token; it should return `401`.
3. Sign in as an address outside the allowlist; `/api/me` should return `403`.
4. Sign in as each allowed user; `/api/me` should return the expected role.
5. Create a client with `POST /api/clients`, then confirm both the client and `client.created` activity event exist.

## Rationale

- Neon HTTP works well for short serverless requests and avoids keeping idle database connections open.
- Drizzle migrations keep the schema ordinary PostgreSQL, so moving from Neon Free to the existing paid Neon account requires only a connection-string change.
- Pages Functions protect database credentials and provide the enforcement point for the two-email allowlist.
- The existing fixture UI remains available until real credentials and account emails are supplied; screens should migrate one workflow at a time.
