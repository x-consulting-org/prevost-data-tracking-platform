import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";

/** The signed-in person as the app sees it. The better-auth session type stops here. */
export type Principal = {
  userId: string;
  name: string;
  email: string;
};

/**
 * Reads the session once per request and redirects to /login without one.
 * Every server action calls this first: actions are public POST endpoints.
 * In the pilot every principal may read every shipment (ADR 0004).
 */
export const requirePrincipal = cache(async (): Promise<Principal> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  return { userId: session.user.id, name: session.user.name, email: session.user.email };
});
