import { PrismaClient } from "@prisma/client";

// Allow BigInt (money cents) to serialize in JSON API responses without throwing.
// Server Components format via fmtUSD at the UI edge; this covers route handlers.
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

const g = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  g.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") g.prisma = prisma;
