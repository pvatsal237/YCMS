<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

International Youth Community Meetup is a single Next.js app with Prisma/PostgreSQL. Sign-in is Google OAuth only (`AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`). Without those secrets the app still starts; Google Sign-In will fail until they are set. Coordinator access comes from `CoordinatorAllowlist` emails.

Start Postgres if needed: `sudo pg_ctlcluster 16 main start`. Standard commands: `npm run dev`, `npm test`, `npm run lint`, `npm run build`. After schema changes: `npx prisma migrate deploy` then `npx prisma db seed`.

