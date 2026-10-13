import { z } from "zod";

const serverEnvSchema = z
  .object({
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    NODE_ENV: z.enum(["development", "production", "test"]),
  })
  .refine((env) => env.NODE_ENV !== "production" || env.BETTER_AUTH_URL.startsWith("https://"), {
    message: "must be https in production",
    path: ["BETTER_AUTH_URL"],
  });

/** Runs once when the server starts: a missing or malformed setting stops it before any request. */
export function register() {
  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(`Invalid environment (see .env.example):\n${z.prettifyError(result.error)}`);
  }
}
