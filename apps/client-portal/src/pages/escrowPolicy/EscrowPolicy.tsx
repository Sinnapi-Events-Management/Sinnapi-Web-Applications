import { escrowPolicy } from '@sinnapi/content';
import { LegalPageLayout } from '@sinnapi/ui';
import { BackButton } from '@sinnapi/ui/router';
import { APP } from '@/lib/config';

/**
 * Public (unauthenticated) legal route rendering the Escrow Payment Policy.
 *
 * The page is the document plus this portal's name — chrome, hero, table of
 * contents and body all belong to the shared `LegalPageLayout`, so every legal
 * page in both portals stays identical without seven copies of the shell.
 *
 * The route is public, so "back" cannot assume a portal to return to: a visitor
 * who followed a link here has no in-app history, and `BackButton` sends that
 * case to the sign-in screen instead of walking them out of the app. Someone who
 * arrived from the settings page lands back on it.
 */
export default function EscrowPolicy() {
  return (
    <LegalPageLayout
      document={escrowPolicy}
      brandName={APP.name}
      brandHref={APP.publicUrl}
      headerAction={<BackButton fallback="/sign-in" />}
    />
  );
}
