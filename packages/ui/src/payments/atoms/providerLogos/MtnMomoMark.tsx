'use client';
import { brand } from '../../../theme/tokens';

/**
 * MTN Mobile Money, as the yellow MTN oval.
 *
 * A recreation, not MTN's artwork: MTN publishes no public vector of the MoMo
 * mark (the file on its developer portal is a 186px PNG of the portal's own
 * app icon), and a raster would blur on every high-density phone this
 * checkout is actually used on. Drawn to MTN's geometry and colour so it reads
 * as MTN at a glance. When MTN supplies the official file through the Pesapal
 * merchant account, replace this component's body — `ProviderLogo` is the
 * only thing that imports it.
 */
export function MtnMomoMark({ title }: { title: string }) {
  return (
    <svg viewBox="0 0 48 32" role="img" aria-label={title} width="100%" height="100%">
      <rect width="48" height="32" rx="6" fill={brand.mtn.yellow} />
      <ellipse
        cx="24"
        cy="16"
        rx="18.5"
        ry="10.5"
        fill="none"
        stroke={brand.mtn.ink}
        strokeWidth="2"
      />
      <text
        x="24"
        y="20.25"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="11.5"
        fontWeight="900"
        letterSpacing="-0.2"
        fill={brand.mtn.ink}
      >
        MTN
      </text>
    </svg>
  );
}
