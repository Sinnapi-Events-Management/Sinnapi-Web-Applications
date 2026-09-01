'use client';
import { Stack, Typography } from '@mui/material';

export type IdentityHeadlineProps = {
  /** The display name — a person's or a business's. */
  name: string;
  /** Secondary line: usually the email or the trading city. */
  subtitle?: string | null;
};

/**
 * Name and one secondary line, centred under the picture.
 *
 * The two `wordBreak` rules differ on purpose. A name breaks on word boundaries so
 * a long business name stays readable; the subtitle breaks anywhere because it is
 * usually an email address, and a single unbroken address is the one string that
 * reliably overflows a narrow side column.
 */
export function IdentityHeadline({ name, subtitle }: IdentityHeadlineProps) {
  return (
    <Stack spacing={0.5} alignItems="center" sx={{ mt: 2.5 }}>
      <Typography variant="h6" textAlign="center" sx={{ wordBreak: 'break-word' }}>
        {name}
      </Typography>
      {subtitle && (
        <Typography
          variant="body2"
          color="text.secondary"
          textAlign="center"
          sx={{ wordBreak: 'break-all' }}
        >
          {subtitle}
        </Typography>
      )}
    </Stack>
  );
}
