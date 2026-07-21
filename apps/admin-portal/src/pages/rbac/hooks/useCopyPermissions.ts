import { useCallback, useMemo, useState } from 'react';
import type { PermissionModel, RoleModel } from '@/lib/types';

type Params = {
  /** The role being written to — the one selected in the editor. */
  target: RoleModel | undefined;
  roles: RoleModel[];
  /** Permission ids the target currently holds. */
  granted: ReadonlySet<string>;
  catalog: PermissionModel[];
  /** Makes the target hold exactly these ids; resolves false if the write failed. */
  replaceGrants: (permissionIds: string[]) => Promise<boolean>;
  /** True when the target may not be edited (an admin role). */
  locked: boolean;
};

/**
 * State for "copy permissions from another role": which role is being mirrored,
 * the diff that copying would apply, and the write itself.
 *
 * The diff is computed and surfaced *before* confirming because this is a
 * replace, not a merge — copying a narrow role onto a broad one revokes, and an
 * admin should see that number before pressing the button, not after.
 */
export function useCopyPermissions({
  target,
  roles,
  granted,
  catalog,
  replaceGrants,
  locked,
}: Params) {
  const [open, setOpen] = useState(false);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Any role may be a source — including the locked admin roles, whose grants
  // are exactly the templates worth cloning onto a new role.
  const options = useMemo(() => roles.filter((r) => r.id !== target?.id), [roles, target?.id]);

  const source = useMemo(() => options.find((r) => r.id === sourceId), [options, sourceId]);

  const diff = useMemo(() => {
    if (!source) return { grant: [], revoke: [], unchanged: 0, sourceIds: [] as string[] };
    // Restrict to the live catalog: a stale row pointing at a deleted permission
    // must not be copied forward into the target.
    const known = new Set(catalog.map((p) => p.id));
    const sourceIds = (source.role_permissions ?? [])
      .map((rp) => rp.permission_id)
      .filter((id) => known.has(id));
    const next = new Set(sourceIds);
    return {
      sourceIds,
      grant: sourceIds.filter((id) => !granted.has(id)),
      revoke: [...granted].filter((id) => !next.has(id)),
      unchanged: sourceIds.filter((id) => granted.has(id)).length,
    };
  }, [source, granted, catalog]);

  const start = useCallback(() => {
    setSourceId(null);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    if (busy) return;
    setOpen(false);
  }, [busy]);

  const confirm = useCallback(async () => {
    if (!source || locked) return;
    setBusy(true);
    try {
      const ok = await replaceGrants(diff.sourceIds);
      // Stay open on failure so the error banner behind the dialog isn't the
      // only clue that nothing was copied.
      if (ok) setOpen(false);
    } finally {
      setBusy(false);
    }
  }, [source, locked, replaceGrants, diff.sourceIds]);

  return {
    open,
    start,
    close,
    options,
    sourceId,
    setSourceId,
    source,
    diff,
    busy,
    confirm,
    /** Nothing to do when no source is picked or the sets already agree. */
    canConfirm: !!source && !locked && diff.grant.length + diff.revoke.length > 0,
    /** True once a source is chosen but it changes nothing. */
    isNoop: !!source && diff.grant.length + diff.revoke.length === 0,
  };
}

export type CopyPermissionsState = ReturnType<typeof useCopyPermissions>;
