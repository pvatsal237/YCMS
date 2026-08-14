# YCMS Implementation Plan

Youth Community Management System — a database-driven Next.js application for a community organization that runs weekly youth meetups and supports newcomers.

## Status

Implementation is in place: Next.js App Router, PostgreSQL/Prisma, Auth.js, RBAC, member CRUD, attendance, immigration alerts, automated follow-ups, reports, user management, activity logs, seed data, and unit tests.

Run the app on a laptop with `npm run setup:local` then `npm run dev`.

## Stack decisions

- Next.js App Router + TypeScript + Tailwind CSS
- PostgreSQL via Prisma (Docker Compose or local Postgres)
- Auth.js (next-auth v5) Credentials provider, JWT sessions, bcryptjs password hashing
- Zod validation, Server Actions for mutations, Recharts for dashboard charts
- Vitest for business-logic unit tests
