'use client';
import { Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { checkoutProcessorLabel, type CheckoutRail } from '../rails';
import { PesapalLogo } from '../atoms/PesapalLogo';
import { ProviderLogo } from '../atoms/ProviderLogo';

export type SecureCheckoutNoteProps = {
  rail: CheckoutRail;
};

/**
 * Where the payer finishes, and what that protects.
 *
 * Placed beside the Pay button because that is where the anxiety spikes: the
 * next tap leaves Sinnapi for someone else's page. Naming that page — with
 * its owner's logo — turns an unexpected redirect into the one they were
 * told about. The sentence underneath is the substance: credentials are
 * entered on the processor's page and never reach Sinnapi, which is also
 * what keeps Sinnapi in PCI SAQ A scope.
 */
export function SecureCheckoutNote({ rail }: SecureCheckoutNoteProps) {
  const processor = checkoutProcessorLabel(rail);

  return (
    <Stack
      spacing={1}
      sx={{
        p: 1.5,
        borderRadius: 3,
        bgcolor: (t) => alpha(t.palette.success.main, 0.06),
        border: (t) => `1px solid ${alpha(t.palette.success.main, 0.2)}`,
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <LockOutlinedIcon sx={{ fontSize: 18, color: 'success.main' }} />
        <Typography variant="caption" fontWeight={700} sx={{ flex: 1 }}>
          Secure checkout by {processor}
        </Typography>
        <Box aria-hidden sx={{ display: 'flex' }}>
          {rail.provider === 'paypal' ? (
            <ProviderLogo id="paypal" size="sm" decorative />
          ) : (
            <PesapalLogo height={24} />
          )}
        </Box>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        You finish on {processor}&rsquo;s own page. Your card or wallet details are entered there
        and never reach Sinnapi.
      </Typography>
    </Stack>
  );
}
