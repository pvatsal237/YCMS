import { prisma } from "@/lib/prisma";
import { splitDisplayName } from "@/lib/privacy";

type GoogleProfile = {
  email?: string | null;
  name?: string | null;
  given_name?: string | null;
  family_name?: string | null;
  picture?: string | null;
};

export async function syncGoogleUser(profile: GoogleProfile) {
  const email = profile.email?.trim().toLowerCase();
  if (!email) {
    throw new Error("Google account is missing an email address.");
  }

  const firstName = profile.given_name?.trim() || splitDisplayName(profile.name, email).firstName;
  const lastName = profile.family_name?.trim() || splitDisplayName(profile.name, email).lastName;
  const name = [firstName, lastName].filter(Boolean).join(" ") || email;
  const image = profile.picture ?? null;

  const allow = await prisma.coordinatorAllowlist.findUnique({ where: { email } });
  if (allow) {
    const user = await prisma.user.upsert({
      where: { email },
      update: { name, image, role: "COORDINATOR", active: true },
      create: { email, name, image, role: "COORDINATOR", active: true },
    });
    await prisma.coordinatorAllowlist.update({
      where: { email },
      data: { userId: user.id, name: allow.name || name },
    });
    return user;
  }

  const member = await prisma.member.upsert({
    where: { email },
    update: { firstName, lastName, image, active: true },
    create: { email, firstName, lastName, image, active: true },
  });

  return prisma.user.upsert({
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
}
