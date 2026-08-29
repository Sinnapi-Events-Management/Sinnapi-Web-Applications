'use client';
import { Stack, Typography } from '@mui/material';
import ForumIcon from '@mui/icons-material/Forum';

export type ThreadEmptyStateProps = {
  hint: string;
};

/**
 * A thread that has loaded and genuinely has nothing in it.
 *
 * Deliberately quiet: this is the state a vendor sees on the first message of a
 * relationship, and a loud empty state reads as an error rather than an
 * invitation. The measured width keeps the sentence from spanning a wide card.
 */
export function ThreadEmptyState({ hint }: ThreadEmptyStateProps) {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ flex: 1, py: 6 }}>
      <ForumIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ textAlign: 'center', maxWidth: '38ch' }}
      >
        {hint}
      </Typography>
    </Stack>
  );
}
