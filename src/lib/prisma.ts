import { PrismaClient } from "@prisma/client";
import { applyServerlessPrismaParams } from "@/lib/prisma-url";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const url = process.env.DATABASE_URL
    ? applyServerlessPrismaParams(process.env.DATABASE_URL)
    : undefined;
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(url ? { datasources: { db: { url } } } : {}),
  });
}

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

function revivePrismaClient() {
  globalForPrisma.prisma = createPrismaClient();
  return globalForPrisma.prisma;
}

function isEngineDisconnected(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("not yet connected") || message.includes("Engine is not yet connected");
}

/**
 * Always resolve to the current Prisma client. The previous singleton could stay
 * dead after a disconnect, which Next.js then surfaces as "Engine is not yet connected".
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getClient();
    const value = Reflect.get(client, property, client) as unknown;
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

export async function connectPrisma() {
  try {
    await getClient().$queryRaw`SELECT 1`;
  } catch (error) {
    if (!isEngineDisconnected(error)) throw error;
    const client = revivePrismaClient();
    await client.$queryRaw`SELECT 1`;
  }
}
