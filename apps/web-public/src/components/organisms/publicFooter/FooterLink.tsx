'use client';

import type { ReactNode } from 'react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { Link } from '@sinnapi/ui/atoms';
import type { Theme } from '@sinnapi/ui/theme';
import type { SxProps } from '@sinnapi/ui/system';
import { isActiveHref } from '@/lib/nav';

/**
 * A footer link that lights up when it points at the current route. This is the
 * only client-side island in the footer — the surrounding layout stays a Server
 * Component (see `PublicFooter`), so only these links subscribe to `usePathname`.
 *
 * On the dark footer surface the brand teal wouldn't read, so the active state is
 * the brightest white plus bold weight (the navbar uses teal on its light
 * surface); both are driven by the shared `isActiveHref` rule. Anchor links
 * (e.g. `/about#mission`) are never active, so a section can't light up its
 * plain link and its anchor variants at once.
 */
export default function FooterLink({
  href,
  sx,
  children,
}: {
  href: string;
  sx?: SxProps<Theme>;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const active = isActiveHref(pathname, href);

  return (
    <Link
      component={NextLink}
      href={href}
      underline="none"
      aria-current={active ? 'page' : undefined}
      sx={[
        ...(Array.isArray(sx) ? sx : [sx]),
        active && { color: 'common.white', fontWeight: 700 },
      ]}
    >
      {children}
    </Link>
  );
}
