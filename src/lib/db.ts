import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function makeClient() {
  // Serverless functions must go through the pooler. Vercel's Neon
  // integration injects the pooled URL as DATABASE_URL, but older Vercel
  // Postgres projects name it POSTGRES_URL — accept either.
  const connectionString =
    process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error(
      "No database connection string. Set DATABASE_URL (Vercel's Postgres integration provides it automatically)."
    );
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
