import { Paper, Stack, Typography } from '@sinnapi/ui';

type Props = {
  total: number;
  /** Set while the consent confirmation is outstanding — the send is blocked. */
  blocked?: boolean;
};

/**
 * The one number the send is built from.
 *
 * ── Why it sits beside the source cards and not inside a panel ────────────
 * Each card says what its own source contributes; none of them can say what the
 * campaign will actually mail, and that total is the number the review step
 * asks the operator to confirm. Keeping it in the same sticky strip as the
 * cards means it is on screen while a table is being paged through — the moment
 * the count is being changed is the moment it is worth watching.
 */
export default function RecipientTotalBar({ total, blocked }: Props) {
  return (
    <Paper
      variant="outlined"
      sx={{
        px: 2,
        py: 1.25,
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        minWidth: { lg: 190 },
      }}
    >
      <Stack spacing={0.25} sx={{ minWidth: 0 }}>
        <Typography
          variant="h5"
          sx={{ lineHeight: 1.1 }}
          color={total > 0 ? 'text.primary' : 'text.secondary'}
        >
          {total.toLocaleString()}
        </Typography>
        <Typography variant="caption" color={blocked ? 'warning.main' : 'text.secondary'} noWrap>
          {blocked
            ? 'selected — confirm consent below'
            : `${total === 1 ? 'recipient' : 'recipients'} in total`}
        </Typography>
      </Stack>
    </Paper>
  );
}
