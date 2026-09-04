/**
 * A route or nav item may be open to holders of *any* of several permissions.
 *
 * The shell's `PortalNavItem.perm` and `RequirePerm.perm` are single strings,
 * and the shared shell resolves them through one `can(perm)` predicate. Rather
 * than widen that contract for the one admin case that needs it, the admin
 * portal reads a `|`-separated list as "any of these". `finance.read|finance.reconcile`
 * therefore admits both the read-only Finance viewer and the person working
 * the queue — which is exactly the predicate the `recon_read` RLS policy uses.
 */
export const ANY_OF = '|';

export function hasAnyPerm(has: (perm: string) => boolean, perm: string): boolean {
  return perm.split(ANY_OF).some((p) => has(p.trim()));
}
