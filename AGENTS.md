<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

YCMS is a single Next.js 16 (App Router, Turbopack) + Prisma + PostgreSQL app. Standard commands live in `package.json` and the `README.md`; prefer those. Notes below are the non-obvious bits for this cloud environment.

### Services and how to run them

- **PostgreSQL 16** is installed locally (via apt, not Docker) and is the system of record. It does not always come up automatically on a fresh boot — start it with `sudo pg_ctlcluster 16 main start` (check with `pg_isready -h 127.0.0.1 -p 5432`). The `ycms` role/database and all migrated + seeded data live in the cluster data dir, so they persist across snapshots; you normally do not need to re-migrate or re-seed.
- **Next.js dev server**: `npm run dev` (serves on `http://localhost:3000`). This is the app itself; there is no separate backend/API service.
- **SMTP is optional.** Member OTP login works without it: `DEV_SHOW_OTP="true"` is set in `.env.local`, so the code appears on `/member-login`, and codes are also printed to the server console as `[YCMS email:console]`.

### Environment files

- `.env` and `.env.local` are gitignored and already created in this environment (copied from `.env.example` with a generated `AUTH_SECRET`; `DEV_SHOW_OTP="true"` added to `.env.local`). `DATABASE_URL` points at the local Postgres (`postgresql://ycms:ycms_dev_password@localhost:5432/ycms?schema=public`). If they are ever missing, recreate them from `.env.example` and generate `AUTH_SECRET` with `openssl rand -base64 32`.

### Lint / test / build (standard, from package.json)

- `npm run lint` — ESLint. Note: the repo currently has 2 pre-existing lint errors (`src/components/assistance/AssistanceRequestForm.tsx`, `src/services/assistance.ts`) unrelated to environment setup; do not treat them as environment breakage.
- `npm test` — Vitest business-logic tests (all pass).
- `npm run build` — `prisma generate && next build` (needs `DATABASE_URL`, but does not need Postgres running).

### Database helpers

- Migrations/seed only need to be re-run after schema changes or a DB reset: `npx prisma migrate deploy` then `npx prisma db seed` (or `npm run db:setup`). `npm run db:reset` drops and reseeds. Demo staff login: `admin@ycms.local` / `YcmsDemo123!` at `/login`. Member OTP: e.g. `hetvi.patel@example.test` at `/member-login`.

### Known caveat

- The multi-step **new-member registration form** (`/members/new`, `src/components/members/MemberForm.tsx`) renders only the active step's inputs and uses uncontrolled `defaultValue` fields, so values from earlier steps unmount and are lost on submit — creating a member through the UI currently fails with `Invalid input: expected string, received null`. This is a pre-existing app bug, not an environment issue. Seeded members are created directly via Prisma. Use attendance/other single-page flows for UI smoke tests.
