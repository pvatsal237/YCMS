# Youth Community Management System (YCMS)

YCMS is a database-driven web application for a community organization that runs weekly youth meetups and supports international students, workers, permanent residents, newcomers, and other youth members.

It replaces spreadsheets, paper forms, and chat threads with one secure system for membership, attendance, immigration document expiry tracking, follow-ups, reporting, and user administration.

This is a real Next.js application backed by PostgreSQL. It is not a static website or a frontend mockup.

## Quick start on your machine

From a clone of this repository:

```bash
git clone https://github.com/pvatsal237/YCMS.git
cd YCMS
npm run setup:local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in as `admin@ycms.local` with password `YcmsDemo123!`.

`npm run setup:local` installs Node packages, starts PostgreSQL (Docker Compose when Docker is running, otherwise a local Postgres server), writes `.env` and `.env.local`, applies migrations, and seeds demo data.

If you are continuing from a Cloud Agent branch, check that branch out before running setup:

```bash
git fetch origin
git checkout <branch-from-the-cloud-agent>
npm run setup:local
npm run dev
```

## Technology stack

- Next.js (App Router) and TypeScript
- React and Tailwind CSS
- PostgreSQL
- Prisma ORM
- Auth.js (`next-auth` v5) for session authentication
- Zod for validation
- bcryptjs for password hashing
- Server Actions and Route Handlers
- Recharts for attendance charts
- Lucide React for icons
- Vitest for business-logic tests
- ESLint

PostgreSQL is the system of record. The app does not use Firebase or Supabase as the application architecture. If you already have hosted Postgres (including a Supabase Postgres database), you can point `DATABASE_URL` at that connection string. Do not put publishable API keys in this app; Prisma talks to Postgres directly.

## Prerequisites

- Node.js 22+
- npm
- PostgreSQL 16+ (local install or Docker)

## Installation

Prefer `npm run setup:local` (see Quick start). The manual steps below are the same work, split out.

```bash
git clone https://github.com/pvatsal237/YCMS.git
cd YCMS
npm install
```

`npm install` also runs `prisma generate`.

## Database configuration

### Option A — Docker

```bash
docker compose up -d
```

This starts PostgreSQL 16 on port `5432` with:

- database: `ycms`
- user: `ycms`
- password: `ycms_dev_password` (development only)

### Option B — Local PostgreSQL

```sql
CREATE USER ycms WITH PASSWORD 'ycms_dev_password' CREATEDB;
CREATE DATABASE ycms OWNER ycms;
```

## Environment variables

Copy the example file and generate an Auth.js secret:

```bash
cp .env.example .env
openssl rand -base64 32
```

Set the values in `.env` (Prisma) and `.env.local` (Next.js):

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma |
| `AUTH_SECRET` | Auth.js session signing secret |
| `AUTH_URL` | Application URL, e.g. `http://localhost:3000` |

Never commit real secrets. `.env` and `.env.local` are gitignored. `.env.example` is safe to commit.

Example:

```
DATABASE_URL="postgresql://ycms:ycms_dev_password@127.0.0.1:5432/ycms?schema=public"
AUTH_SECRET="replace-with-a-long-random-string"
AUTH_URL="http://localhost:3000"
```

## Prisma migration and seed

The initial migration is already in `prisma/migrations`. On a fresh local database:

```bash
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
```

To create a new migration after schema changes:

```bash
npx prisma migrate dev --name describe_the_change
```

Useful extras:

```bash
npm run db:studio
npm run db:reset   # drops data, reapplies migrations, seeds
```

## Development startup

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Unauthenticated users are sent to `/login`.

Production-style local run:

```bash
npm run build
npm start
```

## Demo accounts (development only)

These accounts are created by the seed script. **Do not use these passwords in production.**

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@ycms.local` | `YcmsDemo123!` |
| Youth Coordinator | `coordinator@ycms.local` | `YcmsDemo123!` |
| Attendance Volunteer | `volunteer@ycms.local` | `YcmsDemo123!` |

The seed also creates about 25 fictional members, 6 weekly meetups, attendance history, immigration documents with mixed expiry dates, and follow-ups for members with three consecutive absences.

## User roles

### Administrator

Full access: dashboard, members, attendance, immigration, follow-ups, reports, user management (including coordinators), activity logs, and system settings.

### Youth Coordinator

Dashboard, members, attendance, immigration, follow-ups, reports, and volunteer accounts they created. Cannot manage administrator accounts or system settings.

### Attendance Volunteer

Sign in, view the current meetup, search members by name, and mark Present / Absent / Excused. Volunteers cannot view immigration details, passport numbers, addresses, emergency contacts, employment information, or administration screens. Those restrictions are enforced in middleware, page-level `requireRole` checks, and server actions — not only by hiding buttons.

## Main routes

| Route | Purpose |
| --- | --- |
| `/login` | Sign in |
| `/dashboard` | Live statistics from PostgreSQL |
| `/members` | Searchable member directory |
| `/members/new` | Multi-section registration |
| `/members/[id]` | Member profile |
| `/members/[id]/edit` | Edit member |
| `/attendance` | Meetup list |
| `/attendance/new` | Create meetup |
| `/attendance/[meetupId]` | Take attendance |
| `/immigration` | Document expiry tracking |
| `/follow-ups` | Follow-up queue |
| `/follow-ups/[id]` | Update a follow-up |
| `/reports` | Attendance, member, and expiry reports + CSV |
| `/admin/users` | User accounts |
| `/admin/logs` | Activity logs |
| `/settings` | Administrator settings |

## Application architecture

```
src/
  app/            App Router pages, layouts, route handlers
  actions/        Server Actions (validated mutations)
  components/     UI and feature components
  lib/            Auth, Prisma, session, authorization, logging
  services/       Database and business logic
  validations/    Zod schemas
  utils/          Pure helpers (alerts, absences, CSV)
  types/          Shared types
prisma/
  schema.prisma
  seed.ts
docs/
```

- UI components do not talk to the database.
- Services own queries, transactions, and business rules.
- Server Actions validate input with Zod, check roles, then call services.
- Activity logging is application-level (not password or secret logging).
- Immigration alert colours/labels are calculated at read time from expiry dates.

## Important business rules

1. Only active users can sign in.
2. Only admins can create coordinator accounts.
3. Coordinators can create attendance volunteers.
4. Volunteers never receive sensitive member payloads from the server.
5. Attendance lists active members by default.
6. Members are deactivated, not hard-deleted, from the UI.
7. Immigration alert level is computed dynamically.
8. Three consecutive `ABSENT` records open a follow-up.
9. `EXCUSED` does not count as an absence.
10. Duplicate attendance for the same member and meetup is rejected (`@@unique([meetupId, memberId])`).
11. Duplicate open follow-ups for “3 consecutive meetup absences” are not created.

## Tests, lint, and build

```bash
npm test
npm run lint
npm run build
```

Tests cover immigration alert calculation, consecutive-absence detection, excused attendance, duplicate attendance pairs, follow-up duplicate prevention, and role authorization.

## Deployment notes

- Provision a PostgreSQL database and set `DATABASE_URL`.
- Set a strong unique `AUTH_SECRET`.
- Set `AUTH_URL` to the public application URL.
- Run `npx prisma migrate deploy` before starting the app.
- Do not run the demo seed against a production database.
- Change all demo passwords immediately if those users are kept.
- Prefer HTTPS in production.
- This application stores personal information; keep access least-privilege and backups encrypted.

## Troubleshooting

**Need a one-command reset of local setup**  
Delete `.env` and `.env.local` only if you want new secrets, then rerun `npm run setup:local`. Use `npm run db:reset` to drop and reseed the database.

**PostgreSQL is not running**  
Run `npm run setup:local`, or start Docker (`docker compose up -d`) / your local Postgres service. Confirm with `pg_isready -h 127.0.0.1 -p 5432`.

**`P1001: Can't reach database server`**  
Check `DATABASE_URL`, host, port, username, and password. On some hosts use `127.0.0.1` instead of `localhost`.

**`Prisma Client not generated`**  
Run `npx prisma generate`.

**Login fails with demo accounts**  
Run `npx prisma db seed`. Confirm you are using `YcmsDemo123!` and that the user is active.

**`AUTH_SECRET` missing**  
Auth.js requires `AUTH_SECRET` in production. Copy `.env.example` and generate a secret.

**Session expired after restart**  
JWT sessions survive process restarts if `AUTH_SECRET` is unchanged. If the secret changed, users must sign in again. Database data is stored in PostgreSQL and is not lost when the Next.js process restarts.

**Volunteer can see a page they should not**  
Sign out and sign back in. Role checks run on the server; a stale tab is not enough to bypass them, but you should land on `/unauthorized`.

**Port 3000 already in use**  
`npx next dev --port 3001` and update `AUTH_URL`.

## License

Private community software. All seed members and accounts are fictional.
