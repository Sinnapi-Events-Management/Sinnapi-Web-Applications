import { useCallback, useMemo, useState } from 'react';
import { usePackages as usePackagesQuery } from '@/hooks/queries';
import { isPackagePublished } from '@sinnapi/ui';
import type { PackageModel } from '@/lib/types';

/** Which slice of the catalogue the toolbar is showing. */
export type PackageFilter = 'all' | 'published' | 'drafts' | 'archived';

export const PACKAGE_FILTERS: { value: PackageFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'drafts', label: 'Drafts' },
  { value: 'archived', label: 'Archived' },
];

function matches(pkg: PackageModel, filter: PackageFilter): boolean {
  switch (filter) {
    case 'published':
      return isPackagePublished(pkg);
    case 'drafts':
      return !isPackagePublished(pkg) && pkg.is_active !== false;
    case 'archived':
      return pkg.is_active === false;
    default:
      return true;
  }
}

/**
 * The package catalogue and the editor state around it.
 *
 * The editor's own form state lives in `usePackageEditor`, mounted with the
 * dialog and torn down with it — a package is a tree of field arrays, and
 * keeping that alive behind a closed dialog is how a vendor ends up editing
 * one package's tiers into another's.
 *
 * `editing` holds the package rather than its id so the dialog can seed the
 * form synchronously from data the list already has. Fetching it again on open
 * would put a spinner in front of a form the browser could already draw.
 */
export function usePackages(vendorId: string) {
  const { data, isLoading, error } = usePackagesQuery(vendorId);
  const [filter, setFilter] = useState<PackageFilter>('all');
  const [editing, setEditing] = useState<PackageModel | null>(null);
  const [isEditorOpen, setEditorOpen] = useState(false);

  // Memoised rather than `data ?? []` inline: a fresh array identity on every
  // render would defeat both `useMemo`s below, which is the whole reason they
  // are there.
  const rows = useMemo(() => data ?? [], [data]);
  const visible = useMemo(() => rows.filter((pkg) => matches(pkg, filter)), [rows, filter]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      published: rows.filter((pkg) => isPackagePublished(pkg)).length,
      drafts: rows.filter((pkg) => !isPackagePublished(pkg) && pkg.is_active !== false).length,
      archived: rows.filter((pkg) => pkg.is_active === false).length,
    }),
    [rows],
  );

  const create = useCallback(() => {
    setEditing(null);
    setEditorOpen(true);
  }, []);

  const edit = useCallback((pkg: PackageModel) => {
    setEditing(pkg);
    setEditorOpen(true);
  }, []);

  // The package is cleared on close as well as on open, so a re-open before
  // the next render cannot flash the previous package's tiers.
  const closeEditor = useCallback(() => {
    setEditorOpen(false);
    setEditing(null);
  }, []);

  return {
    rows,
    visible,
    counts,
    filter,
    setFilter,
    isLoading,
    error,
    isEmpty: rows.length === 0,
    editing,
    isEditorOpen,
    create,
    edit,
    closeEditor,
  };
}
