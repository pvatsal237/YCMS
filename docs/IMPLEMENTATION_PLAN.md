# IYCM Implementation Plan

International Youth Community Meetup (IYCM) — a database-driven Next.js application for community meetups, event registration, check-in, and guidance.

## Status

Implementation is in place: Next.js App Router, PostgreSQL/Prisma, Auth.js, RBAC, member CRUD, attendance, immigration alerts, automated follow-ups, reports, user management, activity logs, seed data, and unit tests.

Work stays local until you ask to push to GitHub.

## Stack decisions

- Next.js App Router + TypeScript + Tailwind CSS
- PostgreSQL via Prisma (Docker Compose or local Postgres)
- Auth.js (next-auth v5) Credentials provider, JWT sessions, bcryptjs password hashing
- Zod validation, Server Actions for mutations, Recharts for dashboard charts
- Vitest for business-logic unit tests
