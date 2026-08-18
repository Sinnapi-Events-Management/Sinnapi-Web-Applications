'use client';
import { Box, Typography, alpha } from '@mui/material';
import { formatClockTime } from '../format';
import type { MessageView } from '../types';

export type SystemMessageProps = {
  message: MessageView;
};

/**
 * A platform announcement inside a thread — "Booking confirmed", "This
 * conversation was archived".
 *
 * Centred and unattributed on purpose: it is not a turn in the conversation and
 * must never be mistaken for one. That styling is also exactly why RLS had to
 * stop participants from setting `is_system` themselves (see the 0815d
 * migration) — anyone who could write in this voice could write in Sinnapi's.
 */
export function SystemMessage({ message }: SystemMessageProps) {
  return (
    <Box
      component="li"
      sx={{ listStyle: 'none', display: 'flex', justifyContent: 'center', my: 1.25 }}
    >
      <Box
        sx={{
          px: 1.5,
          py: 0.5,
          borderRadius: 10,
          maxWidth: '85%',
          bgcolor: (t) => alpha(t.palette.text.primary, 0.05),
        }}
      >
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', textAlign: 'center', display: 'block' }}
        >
          {message.body}
          {message.createdAt && (
            <Box component="span" sx={{ color: 'text.disabled', ml: 0.75 }}>
              {formatClockTime(message.createdAt)}
            </Box>
          )}
        </Typography>
      </Box>
    </Box>
  );
}
