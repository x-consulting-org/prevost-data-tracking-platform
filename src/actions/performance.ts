"use server";

import { findPerformanceReview } from "@/server/performance";
import { requirePrincipal } from "@/server/principal";

// Every signed-in user may read the review for now (ADR 0004 says when this changes).

export async function getPerformanceReview() {
  await requirePrincipal();
  return findPerformanceReview(new Date());
}
