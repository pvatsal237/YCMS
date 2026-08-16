import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { sendEmail } from "@/lib/email";
import {
  OTP_GENERIC_INVALID_MESSAGE,
  OTP_GENERIC_REQUEST_MESSAGE,
  OTP_REQUEST_WINDOW_MS_VALUE,
  generateOtpCode,
  hashOtp,
  isOtpExpired,
  otpHashesMatch,
  otpExpiryDate,
  tooManyOtpRequests,
  tooManyVerifyAttempts,
} from "@/lib/otp";
import { AppError } from "@/lib/errors";
import { fullName } from "@/utils/format";

const SCHEMA_MESSAGE =
  "Stop the running app (Ctrl+C), then run: npm install && npm run db:setup && npm run dev";

function rethrowIfSchemaMissing(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  const missingTable =
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2010");
  if (
    error instanceof TypeError ||
    missingTable ||
    message.includes("EmailOtp") ||
    message.includes("emailOtp")
  ) {
    throw new AppError(SCHEMA_MESSAGE, 503, "SCHEMA");
  }
  throw error;
}

function otpDelegate() {
  try {
    const model = prisma.emailOtp;
    if (!model) {
      throw new AppError(SCHEMA_MESSAGE, 503, "SCHEMA");
    }
    return model;
  } catch (error) {
    rethrowIfSchemaMissing(error);
  }
}

function otpSecret() {
  return process.env.AUTH_SECRET ?? "ycms-dev-otp-secret";
}

export async function ensureMemberLoginUser(member: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  active: boolean;
}) {
  const email = member.email.toLowerCase();
  const linked = await prisma.user.findFirst({
    where: { memberId: member.id, role: "MEMBER" },
  });
  if (linked) {
    return prisma.user.update({
      where: { id: linked.id },
      data: {
        name: fullName(member),
        email,
        active: member.active,
        passwordHash: null,
      },
    });
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== "MEMBER") {
      throw new AppError(
        "This email is already used by a staff account.",
        409,
        "DUPLICATE",
      );
    }
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        name: fullName(member),
        role: "MEMBER",
        active: member.active,
        memberId: member.id,
        passwordHash: null,
      },
    });
  }
  return prisma.user.create({
    data: {
      name: fullName(member),
      email,
      role: "MEMBER",
      active: member.active,
      memberId: member.id,
    },
  });
}

export async function requestMemberOtp(emailRaw: string) {
  const email = emailRaw.trim().toLowerCase();
  const since = new Date(Date.now() - OTP_REQUEST_WINDOW_MS_VALUE);
  const recent = await otpDelegate().count({
    where: { email, createdAt: { gte: since } },
  });
  if (tooManyOtpRequests(recent)) {
    return {
      ok: true as const,
      message: OTP_GENERIC_REQUEST_MESSAGE,
      devOtp: undefined as string | undefined,
    };
  }

  const member = await prisma.member.findUnique({ where: { email } });
  if (!member?.active) {
    await logActivity({
      action: "MEMBER_OTP_REQUEST",
      message: "Member OTP requested",
      metadata: { email, result: "ignored" },
    });
    return {
      ok: true as const,
      message: OTP_GENERIC_REQUEST_MESSAGE,
      devOtp: undefined as string | undefined,
    };
  }

  const user = await ensureMemberLoginUser(member);
  if (!user.active) {
    return {
      ok: true as const,
      message: OTP_GENERIC_REQUEST_MESSAGE,
      devOtp: undefined as string | undefined,
    };
  }

  const code = generateOtpCode();
  await otpDelegate().create({
    data: {
      email,
      codeHash: hashOtp(code, otpSecret()),
      expiresAt: otpExpiryDate(),
      userId: user.id,
    },
  });

  await sendEmail({
    to: email,
    subject: "Your YCMS sign-in code",
    text: `Your YCMS sign-in code is ${code}. It expires in 10 minutes and can be used once.`,
  });
  await logActivity({
    userId: user.id,
    action: "MEMBER_OTP_REQUEST",
    entityType: "User",
    entityId: user.id,
    message: "Member OTP sent",
  });

  const showDev =
    process.env.NODE_ENV !== "production" && process.env.DEV_SHOW_OTP === "true";
  return {
    ok: true as const,
    message: OTP_GENERIC_REQUEST_MESSAGE,
    devOtp: showDev ? code : undefined,
  };
}

export async function consumeMemberOtp(emailRaw: string, codeRaw: string) {
  const email = emailRaw.trim().toLowerCase();
  const code = codeRaw.trim();
  const otp = await otpDelegate().findFirst({
    where: { email, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!otp || isOtpExpired(otp.expiresAt) || tooManyVerifyAttempts(otp.attempts)) {
    if (otp && !otp.consumedAt) {
      await otpDelegate().update({
        where: { id: otp.id },
        data: {
          attempts: { increment: 1 },
          consumedAt: tooManyVerifyAttempts(otp.attempts + 1) ? new Date() : otp.consumedAt,
        },
      });
    }
    throw new AppError(OTP_GENERIC_INVALID_MESSAGE, 401, "OTP_INVALID");
  }

  const matches = otpHashesMatch(otp.codeHash, hashOtp(code, otpSecret()));
  if (!matches) {
    const attempts = otp.attempts + 1;
    await otpDelegate().update({
      where: { id: otp.id },
      data: {
        attempts,
        consumedAt: tooManyVerifyAttempts(attempts) ? new Date() : null,
      },
    });
    throw new AppError(OTP_GENERIC_INVALID_MESSAGE, 401, "OTP_INVALID");
  }

  await otpDelegate().update({
    where: { id: otp.id },
    data: { consumedAt: new Date() },
  });

  const user = await prisma.user.findFirst({
    where: { email, role: "MEMBER", active: true },
    include: { member: true },
  });
  if (!user?.member?.active) {
    throw new AppError(OTP_GENERIC_INVALID_MESSAGE, 401, "OTP_INVALID");
  }
  return user;
}
