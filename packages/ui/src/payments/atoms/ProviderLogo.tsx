'use client';
import type { ComponentType } from 'react';
import { Box } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { common } from '../../theme/tokens';
import type { ProviderLogoId } from '../rails';
import { MtnMomoMark } from './providerLogos/MtnMomoMark';
import { AirtelMoneyMark } from './providerLogos/AirtelMoneyMark';
import { VisaMark } from './providerLogos/VisaMark';
import { MastercardMark } from './providerLogos/MastercardMark';
import { PayPalMark } from './providerLogos/PayPalMark';

const MARKS: Record<ProviderLogoId, { Mark: ComponentType<{ title: string }>; title: string }> = {
  mtn_momo: { Mark: MtnMomoMark, title: 'MTN Mobile Money' },
  airtel_money: { Mark: AirtelMoneyMark, title: 'Airtel Money' },
  visa: { Mark: VisaMark, title: 'Visa' },
  mastercard: { Mark: MastercardMark, title: 'Mastercard' },
  paypal: { Mark: PayPalMark, title: 'PayPal' },
};

const SIZES = {
  sm: { width: 34, height: 22 },
  md: { width: 44, height: 28 },
} as const;

export type ProviderLogoProps = {
  id: ProviderLogoId;
  size?: keyof typeof SIZES;
  /** Hide from assistive tech when a visible label already names the method. */
  decorative?: boolean;
};

/**
 * One payment brand's mark, on a white tile.
 *
 * The tile is the point, not decoration. Card networks and wallets require
 * their marks in their own colours and forbid re-tinting them, so a mark
 * cannot follow the warm dark canvas the way the rest of the portal does;
 * a fixed white tile lets every mark stay exactly as issued in both schemes.
 * Every tile is also the same size, which is the "parity" Visa and Mastercard
 * both ask for when their marks are shown side by side.
 *
 * This is the single place a mark is chosen. Replacing a recreated mark with
 * an official file means editing one file under `providerLogos/`, and nothing
 * that renders a rail changes.
 */
export function ProviderLogo({ id, size = 'md', decorative = false }: ProviderLogoProps) {
  const { Mark, title } = MARKS[id];
  const { width, height } = SIZES[size];

  return (
    <Box
      component="span"
      aria-hidden={decorative || undefined}
      sx={{
        display: 'inline-grid',
        placeItems: 'center',
        flexShrink: 0,
        width,
        height,
        p: '3px',
        borderRadius: '6px',
        bgcolor: common.white,
        border: (t) => `1px solid ${alpha(t.palette.text.primary, 0.12)}`,
        '& > svg': { display: 'block' },
      }}
    >
      <Mark title={title} />
    </Box>
  );
}
