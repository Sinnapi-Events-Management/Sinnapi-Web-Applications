// Active-navigation matching, shared by the public navbar and footer so both
// derive "is this menu item the current page?" from a single rule.

/**
 * Whether `href` should render as the active nav item for the current `pathname`.
 *
 * - Section roots match by **prefix** so nested detail pages keep their parent
 *   menu lit — e.g. `/vendors/acme-events` and `/vendors/category` both light
 *   up `/vendors`. The `${target}/` boundary stops `/vendor` matching `/vendors`.
 * - The home link (`/`) matches **exactly**, otherwise it would be active on
 *   every page (every path starts with `/`).
 * - **Anchor links** (e.g. `/about#mission`) never own the active state — the
 *   plain section link (`/about`) does — so one page can't light up several
 *   links at once. `usePathname()` omits the hash, so these could never match a
 *   specific section reliably anyway.
 */
export function isActiveHref(pathname: string, href: string): boolean {
  if (href.includes('#')) return false;
  const target = href.split('?')[0];
  if (target === '/') return pathname === '/';
  return pathname === target || pathname.startsWith(`${target}/`);
}
