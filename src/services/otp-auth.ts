import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { AppError } from "@/lib/errors";
import { logSafe } from "@/lib/log";
import {
  OTP_COOLDOWN_MESSAGE,
  OTP_GENERIC_INVALID_MESSAGE,
  OTP_GENERIC_REQUEST_MESSAGE,
  OTP_REQUEST_WINDOW_MS_VALUE,
  canShowDevOtp,
  generateOtpCode,
  hashOtp,
  isOtpExpired,
  isResendCoolingDown,
  normalizeOtp,
  otpExpiryDate,
  otpHashesMatch,
  tooManyOtpRequests,
  tooManyVerifyAttempts,
} from "@/lib/otp";

const RECENT_CONSUME_WINDOW_MS = 30_000;

function otpSecret() {
  return process.env.AUTH_SECRET ?? "iycm-dev-otp-secret";
}

function nameFromEmail(email: string) {
  const local = email.split("@")[0] ?? "Member";
  const parts = local.split(/[._-]+/).filter(Boolean);
  const first = parts[0] ? parts[0][0].toUpperCase() + parts[0].slice(1) : "Member";
  const last = parts[1] ? parts[1][0].toUpperCase() + parts[1].slice(1) : "Guest";
  return { first, last, name: `${first} ${last}` };
}

export async function isCoordinatorEmail(email: string) {
  const row = await prisma.coordinatorAllowlist.findFirst({
    where: { email: email.trim().toLowerCase(), active: true },
  });
  return row;
}

export async function requestOtp(emailRaw: string) {
  const email = emailRaw.trim().toLowerCase();
  const since = new Date(Date.now() - OTP_REQUEST_WINDOW_MS_VALUE);
  const recent = await prisma.emailOtp.count({ where: { email, createdAt: { gte: since } } });
  if (tooManyOtpRequests(recent)) {
    logSafe("otp.request.rate_limited", { emailDomain: email.split("@")[1] });
    return { ok: true as const, message: OTP_GENERIC_REQUEST_MESSAGE, devOtp: undefined as string | undefined };
  }

  const latest = await prisma.emailOtp.findFirst({
    where: { email, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (isResendCoolingDown(latest?.createdAt)) {
    throw new AppError(OTP_COOLDOWN_MESSAGE, 429, "OTP_COOLDOWN");
  }

  const now = new Date();
  const code = generateOtpCode();
  const expiresAt = otpExpiryDate(now);
  const [, created] = await prisma.$transaction([
    prisma.emailOtp.updateMany({
      where: { email, consumedAt: null },
      data: { consumedAt: now },
    }),
    prisma.emailOtp.create({
      data: {
        email,
        codeHash: hashOtp(code, otpSecret()),
        expiresAt,
      },
    }),
  ]);

  logSafe("otp.created", {
    recordId: created.id,
    emailDomain: email.split("@")[1],
    found: true,
    expired: false,
    hashMatch: false,
    used: Boolean(created.consumedAt),
    attempts: created.attempts,
    expiresAt: created.expiresAt.toISOString(),
    expiresAtMs: created.expiresAt.getTime(),
    nowMs: Date.now(),
  });

  const sent = await sendEmail({
    to: email,
    subject: "Your IYCM sign-in code",
    text: `Your International Youth Community Meetup sign-in code is ${code}. It expires in 10 minutes and can be used once.`,
  });
  if (!sent.ok) {
    throw new AppError(sent.error ?? "Email could not be sent. Please try again later.", 503, "EMAIL_FAILED");
  }

  logSafe("otp.request.sent", { emailDomain: email.split("@")[1], recordId: created.id });
  return {
    ok: true as const,
    message: OTP_GENERIC_REQUEST_MESSAGE,
    devOtp: canShowDevOtp() ? code : undefined,
  };
}

export async function consumeOtp(emailRaw: string, codeRaw: unknown) {
  const email = emailRaw.trim().toLowerCase();
  const code = normalizeOtp(codeRaw);
  const now = new Date();
  const record = await prisma.emailOtp.findFirst({
    where: { email },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    logSafe("otp.verify", {
      emailDomain: email.split("@")[1],
      found: false,
      expired: false,
      hashMatch: false,
      used: false,
      attempts: 0,
      nowMs: now.getTime(),
    });
    throw new AppError(OTP_GENERIC_INVALID_MESSAGE, 401, "OTP_INVALID");
  }

  const expired = isOtpExpired(record.expiresAt, now);
  const used = Boolean(record.consumedAt);
  const hashMatch = otpHashesMatch(record.codeHash, hashOtp(code, otpSecret()));
  const recentlyConsumed =
    used &&
    record.consumedAt != null &&
    now.getTime() - record.consumedAt.getTime() <= RECENT_CONSUME_WINDOW_MS;

  logSafe("otp.verify", {
    recordId: record.id,
    emailDomain: email.split("@")[1],
    found: true,
    expired,
    hashMatch,
    used,
    attempts: record.attempts,
    expiresAt: record.expiresAt.toISOString(),
    expiresAtMs: record.expiresAt.getTime(),
    nowMs: now.getTime(),
    recentlyConsumed,
  });

  if (tooManyVerifyAttempts(record.attempts) && !recentlyConsumed) {
    throw new AppError(OTP_GENERIC_INVALID_MESSAGE, 401, "OTP_INVALID");
  }

  if (expired) {
    throw new AppError(OTP_GENERIC_INVALID_MESSAGE, 401, "OTP_INVALID");
  }

  if (used) {
    if (recentlyConsumed && hashMatch) {
      return resolveUserAfterOtp(email);
    }
    throw new AppError(OTP_GENERIC_INVALID_MESSAGE, 401, "OTP_INVALID");
  }

  if (!hashMatch) {
    const attempts = record.attempts + 1;
    await prisma.emailOtp.update({
      where: { id: record.id },
      data: {
        attempts,
        consumedAt: tooManyVerifyAttempts(attempts) ? now : undefined,
      },
    });
    logSafe("otp.attempt_incremented", {
      recordId: record.id,
      emailDomain: email.split("@")[1],
      found: true,
      expired: false,
      hashMatch: false,
      used: tooManyVerifyAttempts(attempts),
      attempts,
    });
    throw new AppError(OTP_GENERIC_INVALID_MESSAGE, 401, "OTP_INVALID");
  }

  await prisma.emailOtp.update({
    where: { id: record.id },
    data: { consumedAt: now },
  });

  return resolveUserAfterOtp(email);
}

export async function resolveUserAfterOtp(email: string) {
  const allow = await isCoordinatorEmail(email);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const nextRole = allow ? "COORDINATOR" : "MEMBER";
    if (existing.role !== nextRole || (allow && existing.name !== allow.name)) {
      return prisma.user.update({
        where: { id: existing.id },
        data: {
          role: nextRole,
          name: allow?.name ?? existing.name,
          memberId: nextRole === "COORDINATOR" ? existing.memberId : existing.memberId,
        },
      });
    }
    return existing;
  }

  if (allow) {
    logSafe("auth.role.coordinator", { allowlist: true });
    return prisma.user.create({
      data: { email, name: allow.name, role: "COORDINATOR", active: true },
    });
  }

  const names = nameFromEmail(email);
  const member =
    (await prisma.member.findUnique({ where: { email } })) ??
    (await prisma.member.create({
      data: { email, firstName: names.first, lastName: names.last, active: true },
    }));
  logSafe("auth.role.member", { created: true });
  return prisma.user.create({
    data: {
      email,
      name: `${member.firstName} ${member.lastName}`.trim(),
      role: "MEMBER",
      active: member.active,
      memberId: member.id,
    },
  });
}
