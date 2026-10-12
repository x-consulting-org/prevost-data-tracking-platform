import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    // Every signed-in user reads every shipment (ADR 0004), so accounts are provisioned, not self-registered.
    disableSignUp: true,
    minPasswordLength: 12,
  },
  plugins: [nextCookies()],
});
