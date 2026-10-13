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

- Node.js 20.19+ (Prisma 7's minimum)
- pnpm (`packageManager` is pinned in `package.json`)
- Docker (for local Postgres)

## Setup

```bash
pnpm install
```

Copy `.env.example` to `.env` and fill it in. `src/instrumentation.ts` checks these settings when the server starts and refuses to start with a missing or malformed one (in production `BETTER_AUTH_URL` must be https, or the session cookies lose `Secure`).

`pnpm install` also generates the Prisma client (`postinstall`).

Start Postgres, generate the Prisma client, apply migrations and load the demo data:

```bash
pnpm db:up
pnpm prisma:migrate
pnpm db:seed
```

`pnpm db:seed` replaces all shipment data with a fresh, deterministic demo set (times are relative to the run) and creates or updates the demo user with `DEMO_USER_PASSWORD`. Prisma 7 does not run it automatically after migrations. Never run it against a database that holds real shipments.

Run the app:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production

1. Set the variables from `.env.example` in the environment, plus `IBM_TELEMETRY_DISABLED=true`. `DATABASE_URL` is needed at build time too, because building loads the auth route; no connection is made then.
2. `pnpm install --frozen-lockfile && pnpm build`.
3. Before each start with new code: `pnpm db:deploy`. Then `pnpm start`.
4. For the demo data, run `pnpm db:seed` once against that database.

Every response carries security headers (CSP framing and form rules, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, HSTS; `next.config.ts`). better-auth limits sign-in attempts per client IP in production, in memory per instance; behind a proxy that rewrites `X-Forwarded-For`, set `advanced.ipAddress` in `src/lib/auth.ts` for that proxy, and use database storage for the limits with more than one instance.

## Scripts

| Script                              | Purpose                                                    |
| ----------------------------------- | ---------------------------------------------------------- |
| `pnpm dev`                          | Next.js dev server                                         |
| `pnpm build` / `pnpm start`         | Production build & serve                                   |
| `pnpm lint` / `pnpm lint:fix`       | ESLint                                                     |
| `pnpm format` / `pnpm format:check` | Prettier                                                   |
| `pnpm test`                         | Vitest (pure domain modules)                               |
| `pnpm db:up` / `pnpm db:down`       | Start/stop Postgres via Docker Compose                     |
| `pnpm prisma:generate`              | Generate Prisma Client → `src/generated/prisma`            |
| `pnpm prisma:migrate`               | Run `prisma migrate dev` (development only)                |
| `pnpm db:deploy`                    | Apply committed migrations (`prisma migrate deploy`)       |
| `pnpm db:seed`                      | Replace shipment data with the demo set (`prisma/seed.ts`) |
| `pnpm prisma:studio`                | Prisma Studio                                              |
| `pnpm auth:generate`                | Sync better-auth models into `prisma/schema.prisma`        |

## Project layout

```text
src/
  actions/             # Server Actions ("use server"): authenticate, parse, delegate
    helpers/           # Shared action helpers (e.g. Zod parse)
  app/
    (auth)/login/      # Sign-in page
    (app)/             # Signed-in shell: Fuvarok (shipments/), Kollégák (dispatchers/), error and not-found inside the shell
    error.tsx, not-found.tsx, global-error.tsx  # Failures outside the shell, unknown URLs, root layout failure
    api/auth/          # better-auth catch-all handler
    carbon.scss        # Carbon theme (Prévost palette roles, rounded controls)
    _carbon-components.scss  # The Carbon component styles the app renders
  components/
    auth/              # Login form
    data-table/        # Carbon pagination, column fitting and resizing for TanStack Table
    dispatchers/       # Kollégák: performance review cards
    feedback/          # Error and not-found messages shared by the boundaries
    providers/         # QueryProvider
    shell/             # Dark sidebar / top bar: nav, live refresh, sync status, user menu
    shipments/         # Kanban lanes, table, cards, status badges, shipment detail
  lib/
    auth.ts
    auth-client.ts
    data-table.ts      # Shared TanStack Table v9 features and column rules
    format.ts          # The only place that decides locale and time zone
    time.ts            # Millisecond durations (minute, hour, day)
    pagination.ts      # Zod list/pagination schemas + PaginatedResult
    prisma.ts
    query-keys.ts      # TanStack Query key factory
    performance/       # Pure performance review: metrics, team comparison, verdicts
    shipments/         # Pure domain rules: statuses, alerts, grouping, progress, schemas, sources
  server/              # Server-only read models and identity (Prisma lives here)
  instrumentation.ts   # Checks the environment once at server start
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
9. Screen state a user would reload or share (view, filters, the focused dispatcher, the open shipment) lives in the URL. Pages parse their search params with a Zod schema and links build them with the matching href function, side by side in `src/lib/shipments/schemas.ts`; invalid input, including an unknown dispatcher, shows the not-found screen (the page is already streaming, so the status stays 200 with a `noindex` tag). Client-only state such as `?shipment=<id>` is set through the history API (`src/components/shipments/shipment-detail-url.ts`), which updates `useSearchParams` without a server round trip.

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
2. Register features via `dataTableFeatures` in `src/lib/data-table.ts` (pagination, sorting, column sizing and resizing), or extend that set.
3. Every table (and other long paged lists) must render **Carbon Pagination** through `DataTablePagination` (`src/components/data-table/data-table-pagination.tsx`). Its page sizes come from `pageSizeOptions` in `src/lib/pagination.ts`, which also caps `pageSize` on the server.
4. List server actions accept TanStack-aligned input and return `PaginatedResult<T>`:

| Field       | Meaning                                    |
| ----------- | ------------------------------------------ |
| `pageIndex` | 0-based page (`PaginationState`)           |
| `pageSize`  | rows per page (max 100)                    |
| `sorting`   | TanStack `SortingState` (`{ id, desc }[]`) |
| `items`     | current page rows → table `data`           |
| `rowCount`  | total rows → table `rowCount`              |
| `pageCount` | derived page count                         |

Helpers: `src/lib/pagination.ts` (`paginationInputSchema`, `toSkipTake`, `toPaginatedResult`); each list schema adds its own typed `sorting` (see `shipmentPageInputSchema`).  
Reference: `listShipmentsPage` in `src/actions/shipments.ts`, rendered by `ShipmentsTable` in `src/components/shipments/shipments-table.tsx`.

5. Every column has a plain text `header` and a `minSize` and `maxSize` (`columnLabel` / `columnSizeLimits` in `src/lib/data-table.ts` throw otherwise). Its default width is fitted to the header and the current page's content with `useFittedColumns`; users resize it with `ColumnResizeHandles` (drag, arrow keys, double-click to fit again), always within the limits. Render a `<colgroup>` from `header.getSize()` on a `table-fixed` Carbon `Table`, and truncate cells with a `title`.
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
- Theme: `src/app/carbon.scss` (Carbon's Gray 10 with its colours replaced by roles in the Prévost palette: onyx neutrals, sunflower gold on primary buttons with ink text and as links and focus, and rounded controls). It loads only the styles of components the app uses, so add `components/<name>` to `src/app/_carbon-components.scss` when you use a new Carbon component.
- The palette (sunflower gold, forest moss, muted olive, onyx) is defined once, in `src/app/globals.css`, with what it means in the app: the dark onyx sidebar, the shipment statuses (`status-<name>`, `-tint`, `-ink`; mapped to classes in `components/shipments/status-badge.tsx`: onyx unhandled, olive organizing, gold on the road, moss completed) and the attention red (`#D33F22`, text `#A92C1C`) for errors and alerts. Gold means "on the road", so alerts are red, never gold.
- Fonts: IBM Plex Sans through `next/font` in `src/app/layout.tsx`; Carbon reads it via `--font-plex-sans`.
- Tailwind is the layout utility layer. `src/app/globals.css` maps its colours to Carbon tokens (`bg-layer`, `text-text-secondary`, `border-border-subtle`, …) and orders the cascade layers so utilities win over Carbon styles.
- Motion: one entrance per board (cards arrive lane by lane), hover lift on cards, and a single ping on the refresh dot each time the screen's data reloads (every minute while the tab is visible). There is no continuous "live" pulse: the dot only says when the data was last read. `prefers-reduced-motion` turns all of it off.
- Phones: the kanban shows one lane at a time, picked in a select above it, and the page never scrolls sideways; tables scroll inside their own container.
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
