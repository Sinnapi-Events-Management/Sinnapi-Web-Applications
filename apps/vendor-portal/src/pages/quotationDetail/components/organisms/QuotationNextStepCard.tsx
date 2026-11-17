import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  QuotationActionDialog,
  Stack,
  Typography,
  alpha,
  type QuotationFeedback,
} from '@sinnapi/ui';
import ChatIcon from '@mui/icons-material/Chat';
import { FEATURES } from '@sinnapi/utils/constants';
import QuotationBuilder from '@/components/quotation/QuotationBuilder';
import { quotationToFormValues } from '@/components/quotation/schema';
import ProgressSteps from '@/components/progress/ProgressSteps';
import StickyPhoneAction from '@/components/progress/StickyPhoneAction';
import { useAnchorVisible } from '@/components/progress/useAnchorVisible';
import { formatDate } from '@/lib/config';
import { daysFromToday } from '@/lib/bookingCopy';
import { isQuoteExpired } from '@/lib/quoteCopy';
import type { DirectoryProfile, QuotationDetailModel, QuotationItemModel } from '@/lib/types';
import { useQuotationActions } from '../../hooks/useQuotationActions';
import { useQuotationBooking } from '../../hooks/useQuotationBooking';
import { quoteNextStep, type QuoteNextStep } from '../../utils/quoteNextStep';

type Props = {
  quotation: QuotationDetailModel;
  items: QuotationItemModel[];
  client: DirectoryProfile | null;
  feedback: QuotationFeedback | null;
  onOpenQuote: () => void;
  onMessageClient: () => void;
  isMessaging: boolean;
};

const TONE: Record<QuoteNextStep['tone'], 'secondary' | 'info' | 'success' | 'error'> = {
  todo: 'secondary',
  waiting: 'info',
  ok: 'success',
  stopped: 'error',
};

/**
 * "What to do now" for a quote: where it is (Request → Price sent → Accepted →
 * Booked), one sentence, and one main button — usually the builder. Replaces
 * the feedback banner and the "Manage quote" panel, and brings the builder out
 * of the Quote tab where a new request's main job used to be hidden.
 */
export default function QuotationNextStepCard({
  quotation: q,
  items,
  client,
  feedback,
  onOpenQuote,
  onMessageClient,
  isMessaging,
}: Props) {
  const actions = useQuotationActions(q);
  const { booking, stage } = useQuotationBooking(q);
  const [building, setBuilding] = useState(false);

  const step = quoteNextStep({
    status: q.status,
    quoteOrigin: q.quote_origin,
    isLapsed: isQuoteExpired(q.status, q.valid_until),
    validUntilLabel: q.valid_until ? formatDate(q.valid_until) : null,
    daysLeft: daysFromToday(q.valid_until),
    clientNote: feedback?.reason ?? null,
    bookingStage: stage,
    bookingId: booking?.id ?? null,
    canWithdraw: actions.actions.some((a) => a.action === 'withdraw'),
  });
  const color = TONE[step.tone];
  const primary = step.primary;
  const { ref: anchor, visible } = useAnchorVisible<HTMLDivElement>(primary);

  const prefill = useMemo(
    () =>
      primary?.kind === 'build' && primary.prefill ? quotationToFormValues(q, items) : undefined,
    [primary, q, items],
  );

  const primaryButton = (sticky: boolean) =>
    primary &&
    (primary.kind === 'link' ? (
      <Button
        component={RouterLink}
        to={primary.to}
        variant="contained"
        color="secondary"
        size="large"
        fullWidth
        sx={{ minHeight: 48, px: 3 }}
      >
        {primary.label}
      </Button>
    ) : (
      <Button
        variant="contained"
        color="secondary"
        size="large"
        fullWidth
        onClick={() => (primary.kind === 'build' ? setBuilding(true) : onOpenQuote())}
        sx={{ minHeight: 48, px: sticky ? 0 : 3 }}
      >
        {primary.label}
      </Button>
    ));

  const showRequest = (q.status === 'requested' || q.status === 'draft') && !!q.request_details;
  const canMessage = FEATURES.clientVendorMessaging && !!q.client_id;

  return (
    <>
      <Card
        variant="outlined"
        sx={{
          mb: 3,
          borderRadius: 3,
          borderColor: (t) => alpha(t.palette[color].main, 0.5),
          borderTopWidth: 4,
          borderTopColor: `${color}.main`,
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 3 }, '&:last-child': { pb: { xs: 2, sm: 3 } } }}>
          <ProgressSteps steps={step.steps} current={step.current} ariaLabel="Quote progress" />

          <Typography variant="overline" color={`${color}.dark`} sx={{ lineHeight: 1.4 }}>
            {step.tone === 'todo' ? 'What to do now' : 'Where things stand'}
          </Typography>
          <Typography
            variant="h6"
            component="h2"
            fontWeight={700}
            sx={{ lineHeight: 1.3, fontSize: { xs: '1.3rem', sm: '1.45rem' } }}
          >
            {step.title}
          </Typography>
          {step.body && (
            <Typography variant="body1" color="text.secondary" sx={{ mt: 0.75, mb: 2 }}>
              {step.body}
            </Typography>
          )}

          {(showRequest || step.quote) && (
            <Box
              sx={{
                mb: 2,
                p: 1.75,
                borderRadius: 2,
                bgcolor: 'action.hover',
                borderLeft: 4,
                borderColor: `${color}.main`,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {showRequest ? 'The client asked for' : `${client?.full_name ?? 'The client'} said`}
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                {showRequest ? q.request_details : step.quote}
              </Typography>
            </Box>
          )}

          <Stack spacing={1} direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }}>
            {primary && (
              <Box ref={anchor} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                {primaryButton(false)}
              </Box>
            )}
            {step.showWithdraw && (
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => actions.request('withdraw')}
                disabled={actions.isBusy}
                sx={{ minHeight: 44 }}
              >
                Withdraw this quote
              </Button>
            )}
            {canMessage && (
              <Button
                variant="text"
                startIcon={<ChatIcon />}
                onClick={onMessageClient}
                disabled={isMessaging}
                sx={{ minHeight: 44, ml: { sm: 'auto' } }}
              >
                Message client
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>

      <StickyPhoneAction show={!!primary && !visible && !building}>
        {primaryButton(true)}
      </StickyPhoneAction>

      {primary?.kind === 'build' && building && (
        <QuotationBuilder
          open
          onClose={() => setBuilding(false)}
          quotationId={q.id}
          currency={q.currency ?? undefined}
          vendorId={q.vendor_id}
          requestedPackageId={q.template_id}
          requestedTierId={q.template_tier_id}
          initialValues={prefill}
          clientRequest={q.request_details}
          clientName={client?.full_name ?? 'the client'}
          title={primary.title}
        />
      )}

      <QuotationActionDialog
        action={actions.pending}
        reference={q.reference_no}
        reason={actions.reason}
        onReasonChange={actions.setReason}
        busy={actions.isBusy}
        error={actions.error}
        onConfirm={actions.confirm}
        onCancel={actions.cancel}
      />
    </>
  );
}
