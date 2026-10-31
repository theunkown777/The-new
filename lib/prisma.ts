import { PrismaClient } from "@prisma/client";
import { resolveDatabaseUrls } from "@/lib/databaseUrl";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Adresse auch dann finden, wenn Vercel sie nicht als DATABASE_URL anlegt (lib/databaseUrl.ts).
const db = resolveDatabaseUrls(process.env);

export const prisma = globalForPrisma.prisma ?? new PrismaClient(db ? { datasourceUrl: db.runtime } : undefined);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
