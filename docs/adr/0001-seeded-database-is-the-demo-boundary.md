# The seeded database is the demo boundary

The phase-0 demo has no real ingestion yet, so `prisma/seed.ts` writes demo data into the same tables the mailbox and T-Port import will write later. The UI calls real server actions that run real Prisma queries, with no fake services, fixtures or `if (DEMO)` branches. Going live replaces the seed with ingestion and leaves the web and UI layers untouched.
