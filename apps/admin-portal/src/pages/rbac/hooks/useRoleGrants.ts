import { useCallback, useMemo, useState } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { RoleModel } from '@/lib/types';

/** Must match the key `useRoles()` registers in hooks/queries.ts. */
const ROLES_KEY = ['roles'] as const;

/** A single write against `role_permissions`, expressed as a set delta. */
export type GrantPatch = {
  /** Permission ids to add. */
  grant: string[];
  /** Permission ids to remove. */
  revoke: string[];
};

/**
 * Rewrite one role's permission ids inside the cached `['roles']` list. Returns
 * the untouched previous list so a failed write can restore it.
 */
function patchCache(qc: QueryClient, roleId: string, patch: GrantPatch) {
  const previous = qc.getQueryData<RoleModel[]>(ROLES_KEY);
  qc.setQueryData<RoleModel[]>(ROLES_KEY, (roles) =>
    (roles ?? []).map((role) => {
      if (role.id !== roleId) return role;
      const next = new Set((role.role_permissions ?? []).map((rp) => rp.permission_id));
      for (const id of patch.grant) next.add(id);
      for (const id of patch.revoke) next.delete(id);
      return { ...role, role_permissions: [...next].map((id) => ({ permission_id: id })) };
    }),
  );
  return previous;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'Could not save the permission change.';
}

/**
 * The write half of the RBAC editor: it owns every mutation against
 * `role_permissions` for the selected role, and the optimistic cache surgery
 * that makes a switch feel instant.
 *
 * Each write patches `['roles']` before the request leaves, then invalidates so
 * the server has the last word; a failure restores the snapshot taken at the
 * start, so a rejected toggle visibly snaps back rather than lying. In-flight
 * permission ids are tracked in `pending` so a row can disable just its own
 * switch instead of freezing the pane.
 *
 * Roles flagged `is_admin` are refused here, not merely disabled in the UI —
 * a guard in the component alone would still let a stray caller write.
 */
export function useRoleGrants(role: RoleModel | undefined) {
  const qc = useQueryClient();
  const [pending, setPending] = useState<ReadonlySet<string>>(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const granted = useMemo(
    () => new Set((role?.role_permissions ?? []).map((rp) => rp.permission_id)),
    [role?.role_permissions],
  );

  /** Admin roles are read-only by policy — see the pane's locked banner. */
  const locked = !!role?.is_admin;

  const write = useCallback(
    async (patch: GrantPatch): Promise<boolean> => {
      if (!role || locked) return false;
      if (patch.grant.length === 0 && patch.revoke.length === 0) return true;

      const roleId = role.id;
      setError(null);
      const previous = patchCache(qc, roleId, patch);

      try {
        if (patch.grant.length > 0) {
          // Upsert rather than insert: the optimistic cache and the server can
          // disagree for a moment, and re-granting a held permission should be
          // a no-op, not a unique-violation the admin has to interpret.
          const { error: grantError } = await supabase.from('role_permissions').upsert(
            patch.grant.map((id) => ({ role_id: roleId, permission_id: id })),
            { onConflict: 'role_id,permission_id', ignoreDuplicates: true },
          );
          if (grantError) throw grantError;
        }
        if (patch.revoke.length > 0) {
          const { error: revokeError } = await supabase
            .from('role_permissions')
            .delete()
            .eq('role_id', roleId)
            .in('permission_id', patch.revoke);
          if (revokeError) throw revokeError;
        }
        return true;
      } catch (e) {
        if (previous) qc.setQueryData(ROLES_KEY, previous);
        setError(message(e));
        return false;
      } finally {
        // Reconcile either way: after a success to pick up anything another
        // admin changed, after a rollback to replace the guess with the truth.
        void qc.invalidateQueries({ queryKey: ROLES_KEY });
      }
    },
    [qc, role, locked],
  );

  /** Flip one permission. Only that row shows as busy. */
  const toggle = useCallback(
    async (permissionId: string, on: boolean) => {
      setPending((prev) => new Set(prev).add(permissionId));
      try {
        await write(
          on ? { grant: [permissionId], revoke: [] } : { grant: [], revoke: [permissionId] },
        );
      } finally {
        setPending((prev) => {
          const next = new Set(prev);
          next.delete(permissionId);
          return next;
        });
      }
    },
    [write],
  );

  /** Grant or revoke a whole category in one round trip. */
  const setMany = useCallback(
    async (permissionIds: string[], on: boolean) => {
      // Send only the ids that would actually change, so the delete/upsert
      // touches the minimum and the optimistic patch matches what the server does.
      const changing = permissionIds.filter((id) => granted.has(id) !== on);
      if (changing.length === 0) return;
      setBulkBusy(true);
      try {
        await write(on ? { grant: changing, revoke: [] } : { grant: [], revoke: changing });
      } finally {
        setBulkBusy(false);
      }
    },
    [write, granted],
  );

  /** Make the role hold exactly `permissionIds` — used by "copy from role". */
  const replaceGrants = useCallback(
    async (permissionIds: string[]): Promise<boolean> => {
      const next = new Set(permissionIds);
      const patch: GrantPatch = {
        grant: [...next].filter((id) => !granted.has(id)),
        revoke: [...granted].filter((id) => !next.has(id)),
      };
      setBulkBusy(true);
      try {
        return await write(patch);
      } finally {
        setBulkBusy(false);
      }
    },
    [write, granted],
  );

  return {
    granted,
    locked,
    /** Permission ids with a toggle in flight. */
    pending,
    /** True while a category or copy write is running. */
    bulkBusy,
    error,
    dismissError: useCallback(() => setError(null), []),
    toggle,
    setMany,
    replaceGrants,
  };
}

export type RoleGrantsState = ReturnType<typeof useRoleGrants>;
