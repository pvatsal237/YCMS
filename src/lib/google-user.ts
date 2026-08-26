import { prisma } from "@/lib/prisma";
import { maskEmail, splitDisplayName } from "@/lib/privacy";

type GoogleProfile = {
  email?: string | null;
  name?: string | null;
  given_name?: string | null;
  family_name?: string | null;
  picture?: string | null;
};

function prismaCode(error: unknown): string | undefined {
  if (typeof error === "object" && error && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  return undefined;
}

function logPrismaFailure(stage: string, error: unknown) {
  const code = prismaCode(error);
  const message = error instanceof Error ? error.message : "unknown";
  if (code === "P2021" || code === "P2022" || message.includes("does not exist")) {
    console.error(`[IYCM auth] Prisma error during ${stage}: database schema/migration missing`, {
      code,
    });
    return;
  }
  console.error(`[IYCM auth] Prisma error during ${stage}`, { code });
}

export async function syncGoogleUser(profile: GoogleProfile) {
  const email = profile.email?.trim().toLowerCase();
  if (!email) {
    console.error("[IYCM auth] Google profile missing email");
    throw new Error("Google account is missing an email address.");
  }

  console.info("[IYCM auth] Google profile received", { email: maskEmail(email) });

  const firstName = profile.given_name?.trim() || splitDisplayName(profile.name, email).firstName;
  const lastName = profile.family_name?.trim() || splitDisplayName(profile.name, email).lastName;
  const name = [firstName, lastName].filter(Boolean).join(" ") || email;
  const image = profile.picture ?? null;

  console.info("[IYCM auth] Checking coordinator allowlist");
  let allow;
  try {
    allow = await prisma.coordinatorAllowlist.findUnique({ where: { email } });
  } catch (error) {
    logPrismaFailure("coordinator allowlist lookup", error);
    throw error;
  }
  console.info("[IYCM auth] Coordinator allowlist result", { matched: Boolean(allow) });

  if (allow) {
    console.info("[IYCM auth] Creating or updating coordinator user");
    try {
      const user = await prisma.user.upsert({
        where: { email },
        update: { name, image, role: "COORDINATOR", active: true },
        create: { email, name, image, role: "COORDINATOR", active: true },
      });
      await prisma.coordinatorAllowlist.update({
        where: { email },
        data: { userId: user.id, name: allow.name || name },
      });
      console.info("[IYCM auth] Coordinator user ready");
      return user;
    } catch (error) {
      logPrismaFailure("coordinator user upsert", error);
      throw error;
    }
  }

  console.info("[IYCM auth] Creating member");
  let member;
  try {
    member = await prisma.member.upsert({
      where: { email },
      update: { firstName, lastName, image, active: true },
      create: { email, firstName, lastName, image, active: true },
    });
  } catch (error) {
    console.error("[IYCM auth] Prisma error during member creation");
    logPrismaFailure("member creation", error);
    throw error;
  }
  console.info("[IYCM auth] Member record ready");

  console.info("[IYCM auth] Creating or updating member user");
  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name,
        image,
        role: "MEMBER",
        active: true,
        memberId: member.id,
      },
      create: {
        email,
        name,
        image,
        role: "MEMBER",
        active: true,
        memberId: member.id,
      },
    });
    console.info("[IYCM auth] Member user ready");
    return user;
  } catch (error) {
    logPrismaFailure("member user upsert", error);
    throw error;
  }
}
