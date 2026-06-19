# @sinnapi/ui

Shared design system for all four Sinnapi apps (`web-public`, `client-portal`, `vendor-portal`, `admin-portal`). Wraps `@mui/material` with project defaults and a single theme, organised by **atomic design**.

```
src/
  theme/      lightTheme, darkTheme, design tokens   →  @sinnapi/ui/theme, @sinnapi/ui/tokens
  atoms/      Button, TextField, Chip, Typography…   →  @sinnapi/ui/atoms
  molecules/  Card, FormField, Tabs, List, Menu…     →  @sinnapi/ui/molecules
  organisms/  DataTable, Dialog, ConfirmDialog…      →  @sinnapi/ui/organisms
  icons.ts    re-export of @mui/icons-material        →  @sinnapi/ui/icons
```

Import from the root barrel or a tier subpath:

```tsx
import { Button, Card, DataTable, lightTheme } from '@sinnapi/ui';
// or, narrower:
import { DataTable } from '@sinnapi/ui/organisms';
```

## Why a wrapper (not raw `@mui/material`)

- **One theme, four apps** — `lightTheme`/`darkTheme` live here, killing the previous 4 duplicated `theme.ts` files.
- **Project defaults baked in** — e.g. `Button` defaults to `variant="contained"`, `Card` to `outlined`.
- **Single import surface** — easier to migrate the ~160 existing `@mui/material` import sites.

## Consuming the package

This package ships **TypeScript source** (no build step); each app's bundler compiles it.

**Next.js (`web-public`)** — `next.config.mjs`:

```js
const nextConfig = { transpilePackages: ['@sinnapi/ui'] /* …existing */ };
```

**Vite apps** — `vite.config.ts` (dedupe keeps a single React/Emotion/MUI instance):

```ts
resolve: {
  alias: { "@": path.resolve(__dirname, "./src") },
  dedupe: ["react", "react-dom", "@emotion/react", "@emotion/styled", "@mui/material"],
},
```

Add `"@sinnapi/ui": "*"` to each app's `dependencies`, then `yarn install`.

> Every component file starts with `"use client"`. This is required because every MUI component is a Client Component under the Next.js App Router; Vite ignores the directive.

## Theme provider

```tsx
import { ThemeProvider, CssBaseline } from '@mui/material';
import { lightTheme } from '@sinnapi/ui/theme';

<ThemeProvider theme={lightTheme}>
  <CssBaseline />
  {children}
</ThemeProvider>;
```

(web-public additionally wraps this in `AppRouterCacheProvider` from `@mui/material-nextjs`.)

## DataTable — server-side pagination

`DataTable` is **controlled and presentation-only**: it never fetches. The parent owns `page`, `pageSize`, `sortModel` and feeds back the current page's `rows` + total `rowCount`. Wire it to Supabase via react-query:

```tsx
'use client';
import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { DataTable, type DataTableColumn, type SortModel } from '@sinnapi/ui/organisms';
import { supabase } from '@/lib/supabase';

type EventRow = { id: string; name: string; status: string; starts_at: string };

const columns: DataTableColumn<EventRow>[] = [
  { field: 'name', headerName: 'Event', sortable: true },
  { field: 'status', headerName: 'Status', sortable: true },
  {
    field: 'starts_at',
    headerName: 'Starts',
    sortable: true,
    render: (r) => new Date(r.starts_at).toLocaleDateString(),
  },
];

export function EventsTable() {
  const [page, setPage] = useState(0); // zero-based
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<SortModel>({ field: 'starts_at', direction: 'desc' });

  const { data, isFetching } = useQuery({
    queryKey: ['events', page, pageSize, sort],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      let q = supabase.from('events').select('*', { count: 'exact' }).range(from, to);
      if (sort) q = q.order(sort.field, { ascending: sort.direction === 'asc' });
      const { data, count, error } = await q;
      if (error) throw error;
      return { rows: data as EventRow[], total: count ?? 0 };
    },
  });

  return (
    <DataTable<EventRow>
      columns={columns}
      rows={data?.rows ?? []}
      rowCount={data?.total ?? 0}
      getRowId={(r) => r.id}
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={(s) => {
        setPageSize(s);
        setPage(0);
      }}
      sortModel={sort}
      onSortChange={(s) => {
        setSort(s);
        setPage(0);
      }}
      loading={isFetching}
      onRowClick={(r) => {
        /* navigate to r.id */
      }}
    />
  );
}
```

Key contract:

- `page` is **zero-based** (matches MUI `TablePagination` and Supabase `range`).
- A column sorts only when `sortable: true` **and** `onSortChange` is provided.
- `loading` with no rows shows skeleton rows; `loading` with rows shows a top progress bar (keeps the old page visible during refetch — pair with `keepPreviousData`).

## Adding a component

1. Create `src/<tier>/MyThing.tsx`, starting with `"use client";`.
2. Wrap the MUI component (`forwardRef` for interactive elements; plain re-export for polymorphic/generic ones like `Box`, `Select`, `Autocomplete`).
3. Add `export * from "./MyThing";` to that tier's `index.ts`.
4. Avoid exporting the same identifier from two files — barrels merge and duplicates are a compile error.
