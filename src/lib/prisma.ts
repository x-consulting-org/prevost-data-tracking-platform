import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/** A request waits this long for a connection, then fails instead of queueing without end. */
const connectTimeoutMs = 5_000;
/**
 * Postgres cancels a statement after this, so a runaway query cannot hold a connection and the
 * database's CPU without end. Far above what any read or the seed's inserts need.
 */
const statementTimeoutMs = 15_000;

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const adapter = new PrismaPg({
    connectionString: databaseUrl,
    connectionTimeoutMillis: connectTimeoutMs,
    statement_timeout: statementTimeoutMs,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
