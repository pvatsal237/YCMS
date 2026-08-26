# International Youth Community Meetup (IYCM)

Passwordless email OTP for Members and Coordinators. Coordinators come from `CoordinatorAllowlist`.

## Setup

```bash
npm install
cp .env.example .env
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Set `DEV_SHOW_OTP=true` locally to see the sign-in code on `/login`.

Production: set `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, and SMTP variables. Never set `DEV_SHOW_OTP` in production.
