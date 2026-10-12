# Prevost Tracking Platform

Next.js App Router project for the Prevost tracking platform. Stack so far:

- **Next.js 16** + **React 19** + **TypeScript** (strict)
- **IBM Carbon** (`@carbon/react`, Prévost theme) + **Tailwind CSS v4** for layout utilities
- **Prisma ORM 7** + **PostgreSQL 18** (Docker Compose)
- **better-auth** (email/password, Prisma adapter)
- **TanStack Query v5** + **TanStack Table v9** + **TanStack Store**
- **Zod** + **react-hook-form** (client forms)
- **ESLint 9** (flat config) + **Prettier 3**

Package manager: **pnpm**.

## Prerequisites

- Node.js 20+
- pnpm (`packageManager` is pinned in `package.json`)
- Docker (for local Postgres)

## Setup

```bash
pnpm install
```

Create a `.env` in the project root with at least:

```bash
DATABASE_URL="postgresql://prevost:prevost@localhost:5432/prevost_tracking"
BETTER_AUTH_SECRET="at-least-32-random-characters"
BETTER_AUTH_URL="http://localhost:3000"
# Password of the seeded demo user (demo@prevost.example)
DEMO_USER_PASSWORD="choose-a-password"
```

Start Postgres, generate the Prisma client, apply migrations and load the demo data:

```bash
pnpm db:up
pnpm prisma:generate
pnpm prisma:migrate
pnpm db:seed
```

`pnpm db:seed` replaces all shipment data with a fresh, deterministic demo set (times are relative to the run) and creates the demo user if it is missing. Prisma 7 does not run it automatically after migrations.

Run the app:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm dev` | Next.js dev server |
| `pnpm build` / `pnpm start` | Production build & serve |
| `pnpm lint` / `pnpm lint:fix` | ESLint |
| `pnpm format` / `pnpm format:check` | Prettier |
| `pnpm test` | Vitest (pure domain modules) |
| `pnpm db:up` / `pnpm db:down` | Start/stop Postgres via Docker Compose |
| `pnpm prisma:generate` | Generate Prisma Client → `src/generated/prisma` |
| `pnpm prisma:migrate` | Run `prisma migrate dev` |
| `pnpm db:seed` | Replace shipment data with the demo set (`prisma/seed.ts`) |
| `pnpm prisma:studio` | Prisma Studio |
| `pnpm auth:generate` | Sync better-auth models into `prisma/schema.prisma` |

## Project layout

```text
src/
  actions/             # Server Actions ("use server"): authenticate, parse, delegate
    helpers/           # Shared action helpers (e.g. Zod parse)
  app/
    (auth)/login/      # Sign-in page
    (app)/             # Signed-in shell: Fuvarok (shipments/), Kollégák (dispatchers/)
    api/auth/          # better-auth catch-all handler
    carbon.scss        # Carbon theme (Gray 10 + Prévost orange)
    _carbon-components.scss  # The Carbon component styles the app renders
  components/
    auth/              # Login form
    data-table/        # Carbon pagination, column fitting and resizing for TanStack Table
    dispatchers/       # Kollégák board
    providers/         # QueryProvider
    shell/             # Carbon UI Shell: header, side nav, sync status, user menu
    shipments/         # Kanban, table, cards, tags, shipment detail
  lib/
    auth.ts
    auth-client.ts
    data-table.ts      # Shared TanStack Table v9 features and column rules
    format.ts          # The only place that decides locale and time zone
    pagination.ts      # Zod list/pagination schemas + PaginatedResult
    prisma.ts
    query-keys.ts      # TanStack Query key factory
    shipments/         # Pure domain rules: statuses, alerts, grouping, schemas, sources
  server/              # Server-only read models and identity (Prisma lives here)
  proxy.ts             # Redirects signed-out requests to /login
prisma/                # Schema, migrations, demo seed
docs/adr/              # Architecture decisions
GLOSSARY.md            # Domain terms
docker-compose.yml
prisma7.config.ts
eslint.config.mjs
prettier.config.mjs
```

## Conventions (required)

### Data access: server actions + TanStack Query

1. Put all server actions in `src/actions/` with `"use server"` at the top of the file.
2. Every action does three things in this order: `await requirePrincipal()` (authenticate), parse its input with **Zod** (`parseActionInput` in `src/actions/helpers/parse.ts`), then delegate. No queries or business logic in the action.
3. Prisma queries and read models live in server-only modules under `src/server/` (`import "server-only"`, explicit `select` and `orderBy` with an `id` tiebreaker). Pure domain rules live in `src/lib/<domain>/` so client code can use them too. ESLint stops `src/app` and `src/components` from importing `src/server/*` (types excepted), `@/lib/prisma` or the Prisma client.
4. **Server Components** call server actions **directly** with `await`.
5. **Client Components** load and mutate server data only through **TanStack Query**:
   - `useQuery` / `useSuspenseQuery` → server action as `queryFn`
   - `useMutation` → server action as `mutationFn`, then invalidate via query keys
6. Do **not** add Route Handlers for ordinary app CRUD when a server action exists.
7. Keep query keys in `src/lib/query-keys.ts` (hierarchical factory). Invalidate by prefix.
8. Put every server-owned table slice (`pagination`, `sorting`, filters) in the **query key**. Prefer `placeholderData: keepPreviousData` for page transitions.
9. Screen state a user would reload or share (view, filters, the focused dispatcher, the open shipment) lives in the URL. Pages parse their search params with a Zod schema (`src/lib/shipments/schemas.ts`) and answer 404 on invalid input. Client-only state such as `?shipment=<id>` is set through the history API (`src/components/shipments/shipment-detail-url.ts`), which updates `useSearchParams` without a server round trip.

```tsx
// Client — query
const pageInput = { pageIndex, pageSize, sorting, filter };
const { data } = useQuery({
  queryKey: queryKeys.shipments.page(pageInput),
  queryFn: () => listShipmentsPage(pageInput),
  placeholderData: keepPreviousData,
});

// Client — mutation (`assignShipment` stands for any mutating action; the demo has none yet)
const mutation = useMutation({
  mutationFn: assignShipment,
  onSuccess: () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.shipments.all });
  },
});

// Server Component — direct
const board = await getStatusBoard({ pickupWithin24h: false });
```

Optional: hydrate with `useQuery({ ..., initialData })` from an RSC.

### List / table pagination (TanStack Table v9 + Carbon)

Follow TanStack Table **v9** APIs (`useTable`, `tableFeatures`, feature plugins)—not the v8 `useReactTable` API.

1. Every table uses `@tanstack/react-table` with `manualPagination: true` (and `manualSorting: true` when sorting is server-side).
2. Register features via `dataTableFeatures` in `src/lib/data-table.ts` (pagination + sorting), or extend that set.
3. Every table (and other long paged lists) must render **Carbon Pagination** through `DataTablePagination` (`src/components/data-table/data-table-pagination.tsx`). Its page sizes come from `pageSizeOptions` in `src/lib/pagination.ts`, which also caps `pageSize` on the server.
4. List server actions accept TanStack-aligned input and return `PaginatedResult<T>`:

| Field | Meaning |
| --- | --- |
| `pageIndex` | 0-based page (`PaginationState`) |
| `pageSize` | rows per page (max 100) |
| `sorting` | TanStack `SortingState` (`{ id, desc }[]`) |
| `items` | current page rows → table `data` |
| `rowCount` | total rows → table `rowCount` |
| `pageCount` | derived page count |

Helpers: `src/lib/pagination.ts` (`listQueryInputSchema`, `toSkipTake`, `toPaginatedResult`).  
Reference: `listShipmentsPage` in `src/actions/shipments.ts`, rendered by `ShipmentsTable` in `src/components/shipments/shipments-table.tsx`.

5. Every column has a plain text `header` and a `minSize` and `maxSize` (`columnLabel` / `columnSizeLimits` in `src/lib/data-table.ts` throw otherwise). Its default width is fitted to the header and the current page's content with `useFittedColumnSizes`; users resize it with `ColumnResizeHandles` (drag, arrow keys, double-click to fit again), always within the limits. Render a `<colgroup>` from `header.getSize()` on a `table-fixed` Carbon `Table`, and truncate cells with a `title`.
6. Sortable headers pass `translateWithId={() => sortActionLabel(label, column.getNextSortingOrder())}` so Carbon's sort description is Hungarian.

Do **not** copy query rows into a separate `useState`—feed `data?.items ?? emptyRows` (stable empty fallback) straight into `useTable`.

### Forms (client): Zod + react-hook-form

1. Always define a **Zod** schema for form values.
2. Always use **react-hook-form** with `@hookform/resolvers/zod` (`zodResolver`).
3. Use Carbon form components (`TextInput`, `Select`, `Form`, …) from `@carbon/react`; pass `invalid` / `invalidText` from the react-hook-form field state.
4. Submit through `useMutation` → server action (do not bypass TanStack Query for writes).
5. Re-validate the same shape on the server action with Zod before touching the DB.

```tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

export function ExampleForm() {
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  });

  const mutation = useMutation({
    mutationFn: createCustomer, // a mutating server action (illustrative)
    onSuccess: async () => {
      form.reset();
      await queryClient.invalidateQueries({ queryKey: queryKeys.shipments.all });
    },
  });

  return (
    <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      {/* Field + Input bound via form.register / Controller */}
    </form>
  );
}
```

### Providers

- `QueryProvider` wraps the app in `src/app/layout.tsx` (`@tanstack/react-query` + React Query Devtools in development).

## Stack notes

### Database (Prisma + Postgres)

- Prisma 7 config lives in `prisma7.config.ts` (loads `DATABASE_URL` via `dotenv`).
- Client is generated to `src/generated/prisma` and used through `src/lib/prisma.ts` with `@prisma/adapter-pg`.
- Local DB defaults (from `docker-compose.yml`): user/password `prevost`, database `prevost_tracking`, port `5432`.
- Prefer Prisma inside server actions (or shared server-only modules), not from Client Components.

### Auth (better-auth)

- Server: `src/lib/auth.ts` (Prisma adapter, email/password, `nextCookies`). Sign-up is disabled: users are provisioned (the seed creates the demo user).
- Client: `src/lib/auth-client.ts`; the login page is `src/app/(auth)/login`.
- Identity boundary: `src/server/principal.ts`. `requirePrincipal()` reads the session once per request, redirects to `/login` without one and returns a provider-independent `Principal`. Every server action calls it first, because actions are public POST endpoints.
- `src/proxy.ts` only does an optimistic session-cookie redirect to `/login`; it is not the security check.
- API route: `src/app/api/auth/[...all]/route.ts`.
- Auth tables (`user`, `session`, `account`, `verification`) are in the Prisma schema / migrations.

### UI (IBM Carbon + Tailwind v4)

- Components come from `@carbon/react`, imported directly in client components (Carbon files carry no `"use client"`, so Server Components cannot render them). There is no wrapper layer.
- Theme: `src/app/carbon.scss` (Carbon Gray 10 + Prévost orange `#FBB727` on primary buttons with Gray 100 text). It loads only the styles of components the app uses, so add `components/<name>` to `src/app/_carbon-components.scss` when you use a new Carbon component.
- Fonts: IBM Plex Sans / Mono through `next/font` in `src/app/layout.tsx`; Carbon reads them via `--font-plex-sans` / `--font-plex-mono`.
- Tailwind is the layout utility layer. `src/app/globals.css` maps its colours to Carbon tokens (`bg-layer`, `text-text-secondary`, `border-border-subtle`, …) and orders the cascade layers so utilities win over Carbon styles.
- Tables: Carbon `Table*` components + TanStack Table v9 + `DataTablePagination`, with content-fitted, resizable columns (see the table conventions above).
- `@carbon/react` depends on `@ibm/telemetry-js`. Its postinstall does not run here because pnpm only runs build scripts listed in `onlyBuiltDependencies`; keep it off that list, and set `IBM_TELEMETRY_DISABLED=true` in CI and container environments.

### Lint & format

- **ESLint**: Next `core-web-vitals` + TypeScript, plus `typescript-eslint` strict and a small custom rule set. Formatting rules are disabled via `eslint-config-prettier`.
- **Prettier**: `prettier.config.mjs` with `prettier-plugin-tailwindcss` (stylesheet: `src/app/globals.css`).
- **EditorConfig**: `.editorconfig` aligns indent/EOL with Prettier.

```bash
pnpm lint
pnpm format:check
```

## What’s in place (git history)

1. Initial Next.js app (`create-next-app`)
2. Prisma 7 + Docker Postgres + base packages
3. better-auth wiring + auth schema migration
4. shadcn/ui component install
5. ESLint policy + Prettier setup
6. TanStack Query/Table, Zod, react-hook-form, server-action + pagination conventions
7. IBM Carbon replaces shadcn/ui
8. Phase-0 operations demo: domain model and seed, login, Fuvarok (kanban and resizable table), Kollégák, shipment detail

## Learn more

- [Next.js docs](https://nextjs.org/docs)
- [Prisma docs](https://www.prisma.io/docs)
- [better-auth docs](https://www.better-auth.com/docs)
- [TanStack Query](https://tanstack.com/query/latest)
- [TanStack Table](https://tanstack.com/table/latest) (v9: `useTable` / features)
- [Zod](https://zod.dev)
- [react-hook-form](https://react-hook-form.com)
- [Carbon Design System](https://carbondesignsystem.com) / [`@carbon/react`](https://react.carbondesignsystem.com)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
