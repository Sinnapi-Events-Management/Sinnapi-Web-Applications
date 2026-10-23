'use client';
import { Fab, Tooltip } from '@sinnapi/ui/atoms';
import { WhatsApp } from '@mui/icons-material';
import { brand, withAlpha } from '@sinnapi/ui/tokens';
import { CONTACT } from '@sinnapi/utils/constants';
import { SITE } from '@/lib/config/site';
import { STICKY_CTA_HEIGHT, STICKY_CTA_OPEN } from '@/lib/stickyCta';

// Default greeting pre-filled into the chat — edit to taste.
const GREETING = `Hi ${SITE.name}, I'd like to know more about your event services.`;

// Strip spaces / punctuation so the display string becomes a valid wa.me target.
const waNumber = CONTACT.whatsapp.replace(/[^\d]/g, '');
const WHATSAPP_URL = `https://wa.me/${waNumber}?text=${encodeURIComponent(GREETING)}`;

/**
 * Floating WhatsApp call-to-action, fixed bottom-right on every public page.
 * Opens a chat to the company number with a pre-filled greeting.
 *
 * Steps up out of the way when a page raises a fixed mobile action bar — the
 * vendor profile's, today — which occupies the same corner and would otherwise
 * bury it. Driven by an attribute on `<body>` rather than React state because
 * this is mounted in the root layout and the bar is mounted inside whichever
 * container needs one; see `@/lib/stickyCta`.
 */
export default function WhatsAppFab() {
  return (
    <Tooltip title="Chat with us" placement="left" arrow>
      <Fab
        component="a"
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        sx={{
          position: 'fixed',
          bottom: { xs: 16, md: 24 },
          right: { xs: 16, md: 24 },
          zIndex: (theme) => theme.zIndex.fab,
          bgcolor: brand.whatsapp.main,
          color: 'common.white',
          boxShadow: `0 6px 20px ${withAlpha(brand.whatsapp.main, 0.45)}`,
          transition:
            'transform .2s ease, bottom .24s ease, box-shadow .2s ease, background-color .2s ease',
          // `bottom` rather than a translate, so the lift survives the hover
          // `scale` below instead of being overwritten by it.
          [STICKY_CTA_OPEN]: { bottom: STICKY_CTA_HEIGHT + 16 },
          '&:hover': {
            bgcolor: brand.whatsapp.dark,
            transform: 'scale(1.06)',
            boxShadow: `0 8px 26px ${withAlpha(brand.whatsapp.main, 0.55)}`,
          },
        }}
      >
        <WhatsApp />
      </Fab>
    </Tooltip>
  );
}
