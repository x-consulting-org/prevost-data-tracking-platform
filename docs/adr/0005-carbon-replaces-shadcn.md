# IBM Carbon replaces shadcn/ui

The UI uses `@carbon/react` with a Prévost theme instead of shadcn/ui, and the two never live side by side. Carbon gives dense, data-heavy enterprise components (tables, UI Shell, pagination) and an accessible token system out of the box. Its `DataTable` cannot resize columns, so tables keep their state in TanStack Table and render with Carbon's presentational `Table*` components.
