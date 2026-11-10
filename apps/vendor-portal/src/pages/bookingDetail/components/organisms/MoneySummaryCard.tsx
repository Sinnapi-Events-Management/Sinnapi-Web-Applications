import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Skeleton,
  Stack,
  StatusChip,
  Tooltip,
  Typography,
  alpha,
  paymentRailSpec,
  railLabelFor,
  useTheme,
} from '@sinnapi/ui';
import ShieldIcon from '@mui/icons-material/Shield';
import HandshakeIcon from '@mui/icons-material/Handshake';
import { formatMoney } from '@/lib/config';
import type { MoneySectionModel } from '../../hooks/useMoneySection';
import MoneyFigure from '../molecules/MoneyFigure';

type Props = { money: MoneySectionModel };

/**
 * The one place the Money tab states the money.
 *
 * Before this, the agreed amount appeared three times (the payment card's
 * headline, the terms card's breakdown, the escrow journey) and the
 * advance/balance split twice — yet nothing answered the vendor's actual
 * question in one look: how much of this is already mine, how much is waiting,
 * and how much the client still has to pay. This card answers exactly that,
 * and every card below it explains a part of it rather than restating it.
 *
 * On a direct booking there is no split to draw — Sinnapi never sees that
 * money — so the card carries the tab's single off-platform warning instead of
 * the three it used to have.
 */
export default function MoneySummaryCard({ money }: Props) {
  const theme = useTheme();
  const { rail, total, currency, split, isSplitLoading, escrowSection } = money;
  const { escrow } = escrowSection;

  const paidColor = theme.palette.success.main;
  const heldColor = theme.palette.secondary.main;
  const awaitingColor = alpha(theme.palette.text.primary, 0.14);

  const pct = (n: number) => (split?.total ? Math.min(100, (n / split.total) * 100) : 0);

  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent sx={{ p: { xs: 2.5, sm: 3 }, '&:last-child': { pb: { xs: 2.5, sm: 3 } } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 1.5, sm: 2 }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'flex-start' }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              Agreed with the client
            </Typography>
            <Typography
              component="p"
              sx={{
                fontWeight: 700,
                fontSize: { xs: '1.75rem', sm: '2.25rem' },
                lineHeight: 1.15,
                fontVariantNumeric: 'tabular-nums',
                overflowWrap: 'anywhere',
              }}
            >
              {formatMoney(total, currency)}
            </Typography>
            {rail === 'escrow' && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Yours in full — Sinnapi’s fee is added on top and paid by the client.
              </Typography>
            )}
          </Box>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
            <Chip
              size="small"
              variant="outlined"
              icon={
                rail === 'escrow' ? (
                  <ShieldIcon />
                ) : rail === 'direct' ? (
                  <HandshakeIcon />
                ) : undefined
              }
              label={rail ? railLabelFor(rail, 'vendor') : 'Payment method not chosen yet'}
            />
            {escrow && <StatusChip status={escrow.status} />}
          </Stack>
        </Stack>

        {isSplitLoading && (
          <Box sx={{ mt: 3 }}>
            <Skeleton variant="rounded" height={10} />
            <Skeleton width="60%" sx={{ mt: 1.5 }} />
          </Box>
        )}

        {split && (
          <Box sx={{ mt: 3 }}>
            <Box
              role="img"
              aria-label={
                `${formatMoney(split.paidToYou, currency)} paid to you, ` +
                `${formatMoney(split.held, currency)} held by Sinnapi, ` +
                `${formatMoney(split.awaitingClient, currency)} not yet paid by the client`
              }
              sx={{
                display: 'flex',
                height: 10,
                borderRadius: 5,
                overflow: 'hidden',
                bgcolor: awaitingColor,
              }}
            >
              <Tooltip title={`Paid to you: ${formatMoney(split.paidToYou, currency)}`} arrow>
                <Box sx={{ width: `${pct(split.paidToYou)}%`, bgcolor: paidColor }} />
              </Tooltip>
              <Tooltip title={`Held by Sinnapi: ${formatMoney(split.held, currency)}`} arrow>
                <Box sx={{ width: `${pct(split.held)}%`, bgcolor: heldColor }} />
              </Tooltip>
            </Box>

            <Box
              sx={{
                mt: 2,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
                gap: { xs: 1.25, sm: 2 },
              }}
            >
              <MoneyFigure
                label="Paid to you"
                value={formatMoney(split.paidToYou, currency)}
                swatch={paidColor}
                muted={split.paidToYou === 0}
              />
              <MoneyFigure
                label="Held by Sinnapi"
                value={formatMoney(split.held, currency)}
                swatch={heldColor}
                muted={split.held === 0}
              />
              <MoneyFigure
                label="Client yet to pay"
                value={formatMoney(split.awaitingClient, currency)}
                swatch={awaitingColor}
                muted={split.awaitingClient === 0}
              />
            </Box>
          </Box>
        )}

        {rail === 'direct' && (
          <Alert severity="warning" sx={{ mt: 2.5 }}>
            {paymentRailSpec('direct').vendorNote}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
