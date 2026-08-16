import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { sendEmail } from "@/lib/email";
import {
  OTP_GENERIC_INVALID_MESSAGE,
  OTP_GENERIC_REQUEST_MESSAGE,
  OTP_REQUEST_WINDOW_MS_VALUE,
  generateOtpCode,
  hashOtp,
  otpHashesMatch,
  tooManyOtpRequests,
  tooManyVerifyAttempts,
} from "@/lib/otp";
import { AppError } from "@/lib/errors";
import { fullName } from "@/utils/format";
import {
  countRecentOtps,
  ensureMemberAuthSchema,
  findActiveMemberUser,
  findLatestOpenOtp,
  insertOtp,
  updateOtp,
  upsertMemberLoginUser,
} from "@/lib/member-auth-schema";

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
  await ensureMemberAuthSchema();
  const result = await upsertMemberLoginUser({
    id: member.id,
    name: fullName(member),
    email: member.email.toLowerCase(),
    active: member.active,
  });
  if (result.blocked) {
    throw new AppError(
      "This email is already used by a staff account.",
      409,
      "DUPLICATE",
    );
  }
  return { id: result.id, active: result.active };
}

export async function requestMemberOtp(emailRaw: string) {
  await ensureMemberAuthSchema();
  const email = emailRaw.trim().toLowerCase();
  const since = new Date(Date.now() - OTP_REQUEST_WINDOW_MS_VALUE);
  const recent = await countRecentOtps(email, since);
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
  await insertOtp({
    email,
    codeHash: hashOtp(code, otpSecret()),
    userId: user.id,
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

  const showDev = process.env.NODE_ENV !== "production";
  return {
    ok: true as const,
    message: OTP_GENERIC_REQUEST_MESSAGE,
    devOtp: showDev ? code : undefined,
  };
}

export async function consumeMemberOtp(emailRaw: string, codeRaw: string) {
  await ensureMemberAuthSchema();
  const email = emailRaw.trim().toLowerCase();
  const code = codeRaw.trim();
  const otp = await findLatestOpenOtp(email);
  if (!otp || tooManyVerifyAttempts(otp.attempts)) {
    throw new AppError(OTP_GENERIC_INVALID_MESSAGE, 401, "OTP_INVALID");
  }

  const matches = otpHashesMatch(String(otp.codeHash).trim(), hashOtp(code, otpSecret()));
  if (!matches) {
    const attempts = otp.attempts + 1;
    await updateOtp(otp.id, {
      attempts,
      consumedAt: tooManyVerifyAttempts(attempts) ? new Date() : null,
    });
    throw new AppError(OTP_GENERIC_INVALID_MESSAGE, 401, "OTP_INVALID");
  }

  const user = await findActiveMemberUser(email);
  if (!user) {
    throw new AppError(OTP_GENERIC_INVALID_MESSAGE, 401, "OTP_INVALID");
  }

  await updateOtp(otp.id, { attempts: otp.attempts, consumedAt: new Date() });
  return user;
}
