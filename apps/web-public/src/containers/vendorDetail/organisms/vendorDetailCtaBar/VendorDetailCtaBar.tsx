'use client';
import NextLink from 'next/link';
import { Box, Button, Paper, Stack, Typography } from '@sinnapi/ui/atoms';
import { common, withAlpha } from '@sinnapi/ui/tokens';
import { NEW_TAB_LINK_PROPS, isExternalHref } from '@/lib/config/site';
import { VENDOR_CTA_ANCHOR_ID } from '../../utils/ctaAnchor';
import { useVendorDetailCtaBar } from './hooks/useVendorDetailCtaBar';

/**
 * Both buttons, sharing the row equally.
 *
 * 48px is the floor for a one-handed tap target and these sit above it: this
 * is the page's conversion moment, and the bar has no other job to spend its
 * height on. 56px from `sm` up, where there is room for it.
 *
 * Width is the constraint, not height. "View vendor profile" is the longest
 * label either action will ever carry and it has to clear a 360px screen on
 * one line — wrapping would make the bar two rows tall and truncating would
 * leave "View vendor pro…" — so the type and the inner padding both step down
 * on `xs`. At 14px that label measures ~150px against the ~164px each button
 * gets there, which is the margin the smaller horizontal padding buys back.
 */
const ACTION_SX = {
  flex: 1,
  minHeight: { xs: 52, sm: 56 },
  whiteSpace: 'nowrap',
  fontSize: { xs: 18, sm: 20 },
  fontWeight: 600,
  px: { xs: 1, sm: 2 },
} as const;

type Props = {
  vendorName: string;
  /**
   * Already formatted by the server container. A string rather than the raw
   * amount because `formatMoney` lives beside `clientPortalVendorUrl` in the
   * site config, and the money and the href are the same decision: both are
   * resolved once, on the server, and handed down.
   */
  price: string | null;
  /** This vendor's profile in the client portal — see `VendorDetailSidebar`. */
  portalProfileHref: string;
};

/**
 * The two conversion actions, fixed to the bottom of the screen on phones and
 * tablets once the sidebar card has scrolled away.
 *
 * The problem it solves is specific: a vendor with twenty-odd photos pushed
 * everything that converts — the quote button, the packages, the reviews — far
 * enough down that visitors gave up before reaching any of it. Moving the
 * gallery into a tab fixes the scroll depth; this fixes what happens *after*
 * the visitor has scrolled, which is that the actions they just decided they
 * wanted are now above them. Both are needed: the tab bar gets them around the
 * page, the bar keeps the decision one tap away wherever they stop.
 *
 * Hidden at `md` and up, where the same two buttons are already a sticky
 * right-hand column that never leaves the screen.
 *
 * It reveals rather than pinning itself from first paint — see the hook — and
 * it is the same pair of actions pointing at the same place, not a new offer.
 * A visitor who reads the band at the top and one who taps the bar at the
 * bottom land in the identical portal profile.
 */
export default function VendorDetailCtaBar({ vendorName, price, portalProfileHref }: Props) {
  const open = useVendorDetailCtaBar(VENDOR_CTA_ANCHOR_ID);
  // A new tab for the same reason the sidebar opens one: this is another app on
  // another origin, and a visitor mid-comparison should keep the profile they
  // are reading. Skipped when the href degraded to this site's own `/sign-in`.
  const newTab = isExternalHref(portalProfileHref) ? NEW_TAB_LINK_PROPS : {};

  return (
    <Paper
      elevation={0}
      square
      role="region"
      aria-label={`Actions for ${vendorName}`}
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        display: { xs: 'block', md: 'none' },
        zIndex: (theme) => theme.zIndex.appBar,
        borderTop: 1,
        borderColor: 'divider',
        // Opaque in both modes: the page scrolls underneath it.
        bgcolor: 'background.paper',
        backgroundImage: 'none',
        // Cast upward. Every elevation in the theme throws its shadow down,
        // which for a bar flush with the bottom of the viewport means a
        // shadow nobody can see and no separation from the content sliding
        // under it.
        boxShadow: `0 -4px 20px ${withAlpha(common.black, 0.12)}`,
        // A touch tighter on `xs` than the page's own gutter: the 16px it
        // gives back is what lets the longer label stay on one line.
        px: { xs: 1.5, sm: 2 },
        pt: 1.5,
        // Clears the iOS home indicator and Android's gesture bar, which
        // otherwise take a bite out of the bottom of the buttons.
        pb: 'calc(12px + env(safe-area-inset-bottom))',
        transform: open ? 'none' : 'translateY(110%)',
        // Takes the buttons out of the tab order while the bar is away —
        // `transform` alone would leave two focusable controls parked off
        // the bottom of every vendor profile.
        visibility: open ? 'visible' : 'hidden',
        // No local `prefers-reduced-motion` override: `globals.css` already
        // neutralises every transition on the page under that query.
        transition: 'transform .24s ease, visibility .24s',
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        {price && (
          /* From `sm` up only. On a 360px phone the price block and two
               legible buttons do not share one row, and between the two the
               buttons are what the bar exists for — the price is already in
               the band at the top of the page and on every package card. */
          <Box sx={{ display: { xs: 'none', sm: 'block' }, flexShrink: 0 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Starting from
            </Typography>
            <Typography variant="subtitle1" sx={{ lineHeight: 1.2, fontWeight: 700 }}>
              {price}
            </Typography>
          </Box>
        )}

        <Stack direction="row" spacing={1} sx={{ flex: 1, minWidth: 0 }}>
          <Button
            component={NextLink}
            href={portalProfileHref}
            {...newTab}
            variant="contained"
            sx={ACTION_SX}
          >
            Request a quote
          </Button>
          <Button
            component={NextLink}
            href={portalProfileHref}
            {...newTab}
            variant="outlined"
            sx={ACTION_SX}
          >
            View vendor profile
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
