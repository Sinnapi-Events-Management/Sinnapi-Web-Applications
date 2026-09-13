'use client';
import { useId } from 'react';
import { brand } from '../../../theme/tokens';

/**
 * The Mastercard symbol: two interlocking circles, always in full colour.
 *
 * Mastercard's acceptance rules require the symbol in colour and at parity
 * with every other mark shown beside it, which is why this is drawn rather
 * than taken from a single-colour icon set. The overlap is a clipped copy of
 * the right circle, so the three colours meet exactly at any size.
 *
 * `useId` keeps the clip path unique: two card rails on one screen would
 * otherwise share an id, and the second would clip against the first.
 */
export function MastercardMark({ title }: { title: string }) {
  const clipId = `mc-left-${useId().replace(/:/g, '')}`;

  return (
    <svg viewBox="0 0 38 24" role="img" aria-label={title} width="100%" height="100%">
      <defs>
        <clipPath id={clipId}>
          <circle cx="14" cy="12" r="9" />
        </clipPath>
      </defs>
      <circle cx="14" cy="12" r="9" fill={brand.mastercard.red} />
      <circle cx="24" cy="12" r="9" fill={brand.mastercard.yellow} />
      <circle cx="24" cy="12" r="9" fill={brand.mastercard.orange} clipPath={`url(#${clipId})`} />
    </svg>
  );
}
