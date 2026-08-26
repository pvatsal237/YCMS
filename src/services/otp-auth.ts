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
  normalizeEmail,
  normalizeOtp,
  otpExpiryDate,
  otpHashesMatch,
  resolveOtpPepper,
  tooManyOtpRequests,
  tooManyVerifyAttempts,
} from "@/lib/otp";

function dbFingerprint() {
  const raw = process.env.DATABASE_URL ?? "";
  try {
    const normalized = raw.replace(/^postgres(ql)?:/i, "http:");
    const url = new URL(normalized);
    return `${url.hostname}${url.pathname}`;
  } catch {
    return "unparsed";
  }
}

function prismaErrorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

function otpLog(
  failingStage: string,
  detail: Record<string, unknown> = {},
) {
  logSafe(failingStage, {
    emailMatches: null,
    recordCreated: false,
    recordFound: false,
    expired: false,
    consumed: false,
    attempts: 0,
    hashMatch: false,
    failingStage,
    prismaErrorCode: undefined,
    db: dbFingerprint(),
    pepperSource: resolveOtpPepper().source,
    ...detail,
  });
}

export async function isCoordinatorEmail(email: string) {
  return prisma.coordinatorAllowlist.findFirst({
    where: { email: normalizeEmail(email), active: true },
  });
}

function nameFromEmail(email: string) {
  const local = email.split("@")[0] ?? "Member";
  const parts = local.split(/[._-]+/).filter(Boolean);
  const first = parts[0] ? parts[0][0].toUpperCase() + parts[0].slice(1) : "Member";
  const last = parts[1] ? parts[1][0].toUpperCase() + parts[1].slice(1) : "Guest";
  return { first, last, name: `${first} ${last}` };
}

export async function requestOtp(emailRaw: string) {
  const email = normalizeEmail(emailRaw);
  const since = new Date(Date.now() - OTP_REQUEST_WINDOW_MS_VALUE);
  const recent = await prisma.emailOtp.count({ where: { email, createdAt: { gte: since } } });
  if (tooManyOtpRequests(recent)) {
    otpLog("otp.request.rate_limited", { emailMatches: true });
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
  const { pepper, source: pepperSource } = resolveOtpPepper();

  let created;
  try {
    created = await prisma.emailOtp.create({
      data: {
        email,
        codeHash: hashOtp(code, pepper),
        expiresAt,
      },
    });
    await prisma.emailOtp.updateMany({
      where: { email, consumedAt: null, id: { not: created.id } },
      data: { consumedAt: now },
    });
  } catch (error) {
    otpLog("otp.request.create_failed", {
      recordCreated: false,
      prismaErrorCode: prismaErrorCode(error),
      pepperSource,
    });
    throw error;
  }

  otpLog("otp.created", {
    emailMatches: true,
    recordCreated: true,
    recordFound: true,
    expired: false,
    consumed: Boolean(created.consumedAt),
    attempts: created.attempts,
    hashMatch: false,
    pepperSource,
    expiresAt: created.expiresAt.toISOString(),
    nowUtc: now.toISOString(),
    recordId: created.id,
  });

  const sent = await sendEmail({
    to: email,
    subject: "Your IYCM sign-in code",
    text: `Your International Youth Community Meetup sign-in code is ${code}. It expires in 10 minutes and can be used once.`,
  });
  if (!sent.ok) {
    throw new AppError(sent.error ?? "Email could not be sent. Please try again later.", 503, "EMAIL_FAILED");
  }

  return {
    ok: true as const,
    message: OTP_GENERIC_REQUEST_MESSAGE,
    devOtp: canShowDevOtp() ? code : undefined,
  };
}

export type OtpAssertResult = {
  recordId: string;
  email: string;
  emailMatches: boolean;
  expired: boolean;
  consumed: boolean;
  attempts: number;
  hashMatch: boolean;
};

export async function assertOtp(emailRaw: string, codeRaw: unknown): Promise<OtpAssertResult> {
  const email = normalizeEmail(emailRaw);
  const code = normalizeOtp(codeRaw);
  const now = new Date();
  const { pepper, source: pepperSource } = resolveOtpPepper();

  let record;
  try {
    record = await prisma.emailOtp.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    otpLog("verify_prisma_error", {
      emailMatches: false,
      recordFound: false,
      prismaErrorCode: prismaErrorCode(error),
      pepperSource,
    });
    throw new AppError(OTP_GENERIC_INVALID_MESSAGE, 401, "OTP_INVALID");
  }

  if (!record) {
    otpLog("verify_not_found", {
      emailMatches: false,
      recordFound: false,
      pepperSource,
      nowUtc: now.toISOString(),
    });
    throw new AppError(OTP_GENERIC_INVALID_MESSAGE, 401, "OTP_INVALID");
  }

  const emailMatches = record.email === email;
  const expired = isOtpExpired(record.expiresAt, now);
  const consumed = Boolean(record.consumedAt);
  const hashMatch = otpHashesMatch(record.codeHash, hashOtp(code, pepper));
  const result: OtpAssertResult = {
    recordId: record.id,
    email,
    emailMatches,
    expired,
    consumed,
    attempts: record.attempts,
    hashMatch,
  };

  otpLog("otp.verify", {
    ...result,
    recordCreated: true,
    recordFound: true,
    pepperSource,
    expiresAt: record.expiresAt.toISOString(),
    nowUtc: now.toISOString(),
    codeLength: code.length,
  });

  if (tooManyVerifyAttempts(record.attempts)) {
    otpLog("verify_too_many_attempts", { ...result, recordFound: true, recordCreated: true });
    throw new AppError(OTP_GENERIC_INVALID_MESSAGE, 401, "OTP_INVALID");
  }
  if (expired) {
    otpLog("verify_expired", { ...result, recordFound: true, recordCreated: true });
    throw new AppError(OTP_GENERIC_INVALID_MESSAGE, 401, "OTP_INVALID");
  }
  if (consumed) {
    otpLog("verify_consumed", { ...result, recordFound: true, recordCreated: true });
    throw new AppError(OTP_GENERIC_INVALID_MESSAGE, 401, "OTP_INVALID");
  }
  if (!hashMatch) {
    const attempts = record.attempts + 1;
    await prisma.emailOtp.update({
      where: { id: record.id },
      data: { attempts, consumedAt: tooManyVerifyAttempts(attempts) ? now : undefined },
    });
    otpLog("verify_hash_mismatch", {
      ...result,
      recordFound: true,
      recordCreated: true,
      attempts,
      consumed: tooManyVerifyAttempts(attempts),
    });
    throw new AppError(OTP_GENERIC_INVALID_MESSAGE, 401, "OTP_INVALID");
  }

  otpLog("verify_ok", { ...result, recordFound: true, recordCreated: true, failingStage: "verify_ok" });
  return result;
}

export async function markOtpConsumed(recordId: string) {
  await prisma.emailOtp.update({
    where: { id: recordId },
    data: { consumedAt: new Date() },
  });
}

export async function consumeOtp(emailRaw: string, codeRaw: unknown) {
  const asserted = await assertOtp(emailRaw, codeRaw);
  const user = await resolveUserAfterOtp(asserted.email);
  return user;
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
        },
      });
    }
    return existing;
  }

  if (allow) {
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
