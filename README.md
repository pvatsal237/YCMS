# International Youth Community Meetup

Community meetups for international youth: event registration, waitlist, check-in, walk-ins, guidance requests, and coordinator reports.

Members and coordinators sign in with **Google**. Coordinator access is limited to emails on the coordinator allowlist.

## Stack

Next.js (App Router), TypeScript, PostgreSQL, Prisma, Auth.js (Google), Zod, Vitest.

## Setup

```bash
npm install
cp .env.example .env
cp .env.example .env.local
# set DATABASE_URL, AUTH_SECRET, AUTH_URL, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Google Cloud Console: create an OAuth client. Authorized redirect URI:

`{AUTH_URL}/api/auth/callback/google`

Add real coordinator Gmail addresses to `CoordinatorAllowlist` (seed currently uses `@iycm.demo` placeholders for database testing).

## Scripts

`npm run dev` · `npm test` · `npm run lint` · `npm run build` · `npm run db:setup`

## Production

Set `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` on Vercel. Run `npx prisma migrate deploy` against production Postgres after this release.
