"use server";

import { requirePrincipal, type Principal } from "@/server/principal";

export async function getCurrentPrincipal(): Promise<Principal> {
  return requirePrincipal();
}
