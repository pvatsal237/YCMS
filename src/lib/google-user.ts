import { logAuthStageFailure } from "@/lib/auth-log";
import { prisma } from "@/lib/prisma";
import { splitDisplayName } from "@/lib/privacy";

type GoogleProfile = {
  email?: string | null;
  name?: string | null;
  given_name?: string | null;
  family_name?: string | null;
  picture?: string | null;
};

function prismaCode(error: unknown): string | undefined {
  if (typeof error === "object" && error && "code" in error && typeof error.code === "string" && /^P\d{4}$/.test(error.code)) {
    return error.code;
  }
  return undefined;
}

export async function syncGoogleUser(profile: GoogleProfile) {
  let stage = "read Google identity";
  try {
    const email = profile.email?.trim().toLowerCase();
    if (!email) {
      logAuthStageFailure("Google profile missing email", new Error("MissingEmail"));
      throw new Error("Google account is missing an email address.");
    }

    const firstName = profile.given_name?.trim() || splitDisplayName(profile.name, email).firstName;
    const lastName = profile.family_name?.trim() || splitDisplayName(profile.name, email).lastName;
    const name = [firstName, lastName].filter(Boolean).join(" ") || email;
    const image = profile.picture ?? null;

    stage = "coordinator allowlist lookup";
    const allow = await prisma.coordinatorAllowlist.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });

    if (allow) {
      stage = "coordinator user upsert";
      const user = await prisma.user.upsert({
        where: { email },
        update: { name, image, role: "COORDINATOR", active: true },
        create: { email, name, image, role: "COORDINATOR", active: true },
      });
      stage = "coordinator allowlist userId update";
      try {
        await prisma.coordinatorAllowlist.update({
          where: { id: allow.id },
          data: { userId: user.id, name: allow.name || name },
        });
      } catch (error) {
        if (prismaCode(error) === "P2002") {
          await prisma.coordinatorAllowlist.updateMany({
            where: { userId: user.id, NOT: { id: allow.id } },
            data: { userId: null },
          });
          await prisma.coordinatorAllowlist.update({
            where: { id: allow.id },
            data: { userId: user.id, name: allow.name || name },
          });
        } else {
          throw error;
        }
      }
      return user;
    }

    stage = "member upsert";
    const member = await prisma.member.upsert({
      where: { email },
      update: { firstName, lastName, image, active: true },
      create: { email, firstName, lastName, image, active: true },
    });

    stage = "member user upsert";
    return await prisma.user.upsert({
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
  } catch (error) {
    logAuthStageFailure(stage, error);
    throw error;
  }
}
