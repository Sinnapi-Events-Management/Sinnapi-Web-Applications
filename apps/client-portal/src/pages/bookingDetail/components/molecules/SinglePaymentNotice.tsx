import { Box, Stack, Typography } from '@sinnapi/ui';
import { alpha } from '@mui/material/styles';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { formatMoney } from '@/lib/config';

type Props = {
  /** The full charge — agreed amount plus commission plus the processing fee. */
  grossAmount: number | null;
  currency: string | null;
};

/**
 * That this is one payment, for the whole amount, now.
 *
 * Worth its own component because the page around it can be read the other way.
 * The booking carries an "advance" and a "balance", the schedule shows them as
 * separate amounts with separate dates, and a client scanning that has every
 * reason to conclude they are being offered a deposit now and the rest later.
 * They are not: the split describes when Sinnapi releases money *to the
 * vendor*, and the client pays all of it up front.
 *
 * Getting that wrong is not a cosmetic misunderstanding — it is a client who
 * budgeted for a third of the amount arriving at a hosted checkout asking for
 * all of it, which is where payments get abandoned. So the headline and the
 * "not separate payments" sentence are always visible; only the list of what
 * the figure covers sits behind a native disclosure, which needs no state.
 */
export default function SinglePaymentNotice({ grossAmount, currency }: Props) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      alignItems="flex-start"
      sx={{
        p: 1.5,
        borderRadius: 3,
        bgcolor: (t) => alpha(t.palette.info.main, 0.06),
        border: (t) => `1px solid ${alpha(t.palette.info.main, 0.22)}`,
      }}
    >
      <PaymentsOutlinedIcon sx={{ color: 'info.main', mt: 0.25 }} />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" fontWeight={700}>
          {grossAmount != null
            ? `One payment of ${formatMoney(grossAmount, currency)}`
            : 'One payment for the full amount'}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="p">
          No instalments. The advance and balance are when Sinnapi releases your money to your
          vendor, not separate payments from you.
        </Typography>

        <Box
          component="details"
          sx={{
            mt: 0.75,
            '& > summary': {
              listStyle: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.25,
              color: 'text.secondary',
              fontSize: '1rem',
              fontWeight: 600,
              '&::-webkit-details-marker': { display: 'none' },
              '&:hover': { color: 'text.primary' },
              '&:focus-visible': { outline: '2px solid', outlineColor: 'secondary.main' },
            },
            '&[open] > summary svg': { transform: 'rotate(180deg)' },
          }}
        >
          <summary>
            What does this cover?
            <ExpandMoreIcon sx={{ fontSize: 18, transition: 'transform .15s' }} />
          </summary>
          <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.5 }}>
            The amount agreed with your vendor, plus Sinnapi&rsquo;s service fee and the payment
            provider&rsquo;s processing fee.
          </Typography>
        </Box>
      </Box>
    </Stack>
  );
}
