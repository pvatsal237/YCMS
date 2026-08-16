# Youth Community Management System (YCMS)

YCMS is a database-driven web application for a community organization that runs weekly youth meetups and supports international students, workers, permanent residents, newcomers, and other youth members.

It replaces spreadsheets, paper forms, and chat threads with one secure system for membership, attendance, immigration document expiry tracking, follow-ups, reporting, and user administration.

This is a real Next.js application backed by PostgreSQL. It is not a static website or a frontend mockup.

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

```bash
git clone <repository-url>
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
| `SMTP_HOST` | Optional SMTP host for member OTP email. If unset, codes are logged to the server console |
| `SMTP_PORT` | Optional SMTP port (default `587`) |
| `SMTP_SECURE` | Set `true` for TLS on port 465 |
| `SMTP_USER` / `SMTP_PASSWORD` | Optional SMTP credentials |
| `SMTP_FROM` | Optional From address |
| `DEV_SHOW_OTP` | Development only: show the OTP on `/member-login` after requesting a code |

Never commit real secrets. `.env` and `.env.local` are gitignored. `.env.example` is safe to commit.

Example:

```
DATABASE_URL="postgresql://ycms:ycms_dev_password@localhost:5432/ycms?schema=public"
AUTH_SECRET="replace-with-a-long-random-string"
AUTH_URL="http://localhost:3000"
```

## Prisma migration and seed

```bash
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
```

On a fresh environment that already has the migration committed:

```bash
npx prisma migrate deploy
npx prisma db seed
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

Open [http://localhost:3000](http://localhost:3000). Choose Member, Administrator, Youth Coordinator, or Attendance Volunteer.

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

### Member OTP login (no password)

Members cannot create their own profile. An Administrator or Youth Coordinator must register them first. Attendance Volunteers cannot create full member profiles.

1. Open [http://localhost:3000](http://localhost:3000) and choose **Member**, or go to [http://localhost:3000/member-login](http://localhost:3000/member-login).
2. Enter a registered member email, for example `hetvi.patel@example.test`.
3. Request a code. The same generic message is shown whether or not the email exists.
4. Enter the 6-digit code (expires in about 10 minutes, single use).
5. Optionally check **Trust this browser for 14 days**. If you do not, the session is shorter and a new code is needed next time.

**How to see the code in development**

- Add `DEV_SHOW_OTP=true` to `.env.local` and restart `npm run dev`. The code appears on the member login page after you request it.
- If SMTP is not configured, the code is also printed in the terminal as `[YCMS email:console]`.

Staff continue to sign in at `/login` with email and password. Member accounts have no password.

The seed also creates about 25 fictional members, 6 weekly meetups, attendance history, immigration documents with mixed expiry dates, follow-ups for members with three consecutive absences, and a `MEMBER` login user for each seeded member.

## User roles

### Administrator

Full access: dashboard, members, attendance, immigration, follow-ups, reports, user management (including coordinators), activity logs, and system settings.

### Youth Coordinator

Dashboard, members, attendance, immigration, follow-ups, reports, and volunteer accounts they created. Cannot manage administrator accounts or system settings.

### Attendance Volunteer

Sign in, view the current meetup, search members by name, and mark Present / Absent / Excused. Volunteers cannot view immigration details, passport numbers, addresses, emergency contacts, employment information, or administration screens. Those restrictions are enforced in middleware, page-level `requireRole` checks, and server actions — not only by hiding buttons.

### Member

Members sign in with an email one-time code only. They can open `/portal` and see their own contact details, attendance, immigration document type and expiry, upcoming meetup, and follow-up status. They cannot view other members, staff dashboards, user management, activity logs, or create users. They cannot overwrite their profile; they can submit a change request for a coordinator to review later.

## Main routes

| Route | Purpose |
| --- | --- |
| `/login` | Staff sign in |
| `/member-login` | Member OTP sign in |
| `/portal` | Member-only portal |
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
12. Members cannot self-register. Only Administrator and Youth Coordinator can create member profiles.
13. Member login uses hashed, single-use, short-lived email OTPs. Error messages do not reveal whether an email is registered.
14. A trusted member browser session lasts up to 14 days; otherwise a shorter session is used.

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

**PostgreSQL is not running**  
Start Docker (`docker compose up -d`) or your local Postgres service. Confirm with `pg_isready`.

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
