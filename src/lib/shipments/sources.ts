import { DataSource } from "@/generated/prisma/enums";

/** Sources the app loads data from. MANUAL is entered in the app, so it never syncs. */
export const externalSources = [DataSource.EMAIL, DataSource.TPORT] as const;

export const dataSourceLabel = {
  EMAIL: "E-mail",
  TPORT: "T-Port",
  MANUAL: "Kézi",
} as const satisfies Record<DataSource, string>;
