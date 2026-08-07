/** Expanded sidebar width. Matches the admin portal's established measure. */
export const DRAWER_WIDTH = 264;

/** Collapsed sidebar width — an icon rail wide enough for a 44px touch target. */
export const RAIL_WIDTH = 72;

/**
 * Cap on the reading column in `contained` mode. Wide enough for the densest
 * admin tables, narrow enough that a dashboard on a 27" monitor doesn't stretch
 * into unreadable line lengths.
 */
export const CONTENT_MAX_WIDTH = 1440;

/** Namespaced localStorage key for a portal's shell preference. */
export function shellStorageKey(portalId: string, name: string): string {
  return `sinnapi.${portalId}.shell.${name}`;
}
