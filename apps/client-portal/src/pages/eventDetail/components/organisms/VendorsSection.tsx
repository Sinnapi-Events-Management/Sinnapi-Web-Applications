import { useState } from 'react';
import {
  Alert,
  Button,
  ConfirmDialog,
  QueryState,
  SectionCard,
  Skeleton,
  Stack,
  StatusTabs,
} from '@sinnapi/ui';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import { useEventVendorMutations } from '@/hooks/queries';
import type { EventRequirementModel, EventVendorModel } from '@/lib/types';
import EventVendorCard from '../molecules/EventVendorCard';
import CompareSelectionBar from '../molecules/CompareSelectionBar';
import AcceptQuoteDialog from './AcceptQuoteDialog';
import InviteVendorDialog from './InviteVendorDialog';
import QuoteCompareDialog from './QuoteCompareDialog';
import {
  useEventVendorBoard,
  VENDOR_FILTERS,
  type VendorFilter,
} from '../../hooks/useEventVendorBoard';
import { useAcceptQuote } from '../../hooks/useAcceptQuote';
import { hasComparableQuotes, useQuoteCompare } from '../../hooks/useQuoteCompare';

type Props = {
  eventId: string;
  requirements: EventRequirementModel[];
};

const FILTER_LABELS: Record<VendorFilter, string> = {
  all: 'Everyone',
  shortlisted: 'Shortlisted',
  quoted: 'Quoted',
  waiting: 'Waiting on them',
  passed: 'Passed on',
};

/**
 * Who is in the running for this event, and the decisions the client makes
 * about them.
 *
 * Owns every dialog the cards trigger — accept, decline, invite — so they live
 * at one level rather than one per card. A board with twenty vendors would
 * otherwise mount twenty dialogs.
 *
 * Comparison selection lives here too, because the tick boxes are on the cards
 * and the tray that acts on them is not. Accepting from the comparison is
 * routed back through the same accept dialog the cards use — a second path to
 * `respond_quotation` that skipped the budget guard would defeat the feature.
 *
 * The trimmable figures are computed here and handed to the accept dialog. They
 * are what turns "you will be over by 3.2m" into something the client can act
 * on: their own nice-to-have lines, which they marked themselves, and which the
 * platform can therefore point at without presuming to know what matters to
 * them.
 */
export default function VendorsSection({ eventId, requirements }: Props) {
  const board = useEventVendorBoard(eventId);
  const accept = useAcceptQuote(eventId);
  const compare = useQuoteCompare(eventId);
  const { setInterest } = useEventVendorMutations(eventId);

  // Selection is only offered once there are two priced quotes to put beside
  // each other. A compare checkbox on a board with one quote is a control that
  // can never do anything.
  const comparable = hasComparableQuotes(board.rows);

  /**
   * Accepting from inside the comparison routes through the SAME dialog as
   * accepting from a card — budget check, over-budget warning, acknowledgement.
   * A second accept path that skipped the guard is exactly the hole this
   * feature exists to close, so the comparison hands the board row back rather
   * than calling `respond_quotation` itself.
   */
  const acceptFromCompare = (quotationId: string) => {
    const row = board.rows.find((r) => r.quotation_id === quotationId);
    if (!row) return;
    compare.close();
    accept.request(row);
  };

  const acceptableIds = board.rows
    .filter((r) => !r.booking_id && ['sent', 'revised'].includes(r.quotation_status ?? ''))
    .map((r) => r.quotation_id as string);

  const [inviting, setInviting] = useState(false);
  const [declining, setDeclining] = useState<EventVendorModel | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const trimmable = requirements.filter(
    (r) => !r.cancelled_at && r.priority === 'nice_to_have' && r.allocated_amount != null,
  );
  const trimmableAmount = trimmable.reduce((sum, r) => sum + (r.allocated_amount ?? 0), 0);

  const run = async (fn: () => Promise<unknown>, done: () => void) => {
    setActionError(null);
    try {
      await fn();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'That did not work. Please try again.');
    } finally {
      done();
    }
  };

  return (
    <>
      <SectionCard
        title="Vendors"
        icon={<GroupsOutlinedIcon />}
        subtitle="Who has put their hand up, who you have asked, and what they are charging."
        action={
          <Button
            size="small"
            variant="contained"
            startIcon={<PersonAddAltOutlinedIcon />}
            onClick={() => setInviting(true)}
          >
            Invite a vendor
          </Button>
        }
      >
        {actionError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
            {actionError}
          </Alert>
        )}

        <QueryState
          isLoading={board.isLoading}
          error={board.error}
          loadingFallback={
            <Stack spacing={2}>
              <Skeleton variant="rounded" height={150} />
              <Skeleton variant="rounded" height={150} />
            </Stack>
          }
        >
          {board.isEmpty ? (
            <Alert severity="info">
              Nobody is in the running yet. Vendors browsing your event can put their hand up, or
              you can invite the ones you already have in mind — and we will suggest vendors for the
              parts of your plan you have not filled.
            </Alert>
          ) : (
            <>
              <StatusTabs
                options={VENDOR_FILTERS.map((f) => ({
                  value: f,
                  label: FILTER_LABELS[f],
                  count: board.counts[f],
                }))}
                value={board.filter}
                onChange={board.setFilter}
                ariaLabel="Filter vendors by where they stand"
              />

              <Stack spacing={2} sx={{ mt: 2 }}>
                {board.visible.length === 0 ? (
                  <Alert severity="info">Nobody is in this group right now.</Alert>
                ) : (
                  board.visible.map((row) => (
                    <EventVendorCard
                      key={row.engagement_key}
                      row={row}
                      compare={
                        comparable
                          ? {
                              selected: compare.isSelected(row.quotation_id),
                              disabled: compare.isFull && !compare.isSelected(row.quotation_id),
                              onToggle: compare.toggle,
                            }
                          : undefined
                      }
                      onAccept={accept.request}
                      onDecline={setDeclining}
                      onShortlist={(r) =>
                        run(
                          () =>
                            setInterest.mutateAsync({
                              vendorId: r.vendor_id,
                              status: 'shortlisted',
                            }),
                          () => {},
                        )
                      }
                    />
                  ))
                )}
              </Stack>

              <CompareSelectionBar
                count={compare.selected.length}
                canCompare={compare.canCompare}
                onCompare={compare.open}
                onClear={compare.clear}
              />
            </>
          )}
        </QueryState>
      </SectionCard>

      <AcceptQuoteDialog
        open={accept.isOpen}
        target={accept.target}
        impact={accept.impact}
        checking={accept.checking}
        busy={accept.busy}
        error={accept.error}
        trimmableAmount={trimmableAmount}
        trimmableCount={trimmable.length}
        onConfirm={accept.confirm}
        onClose={accept.close}
      />

      <QuoteCompareDialog
        open={compare.isOpen}
        rows={compare.rows}
        isLoading={compare.isLoading}
        error={compare.error}
        acceptableIds={acceptableIds}
        onAccept={acceptFromCompare}
        onClose={compare.close}
        onClear={compare.clear}
      />

      <InviteVendorDialog
        eventId={eventId}
        open={inviting}
        onClose={() => setInviting(false)}
        requirements={requirements}
        engaged={board.rows}
      />

      <ConfirmDialog
        open={Boolean(declining)}
        title="Pass on this vendor?"
        // Names the consequence the client cannot see: declining closes their
        // open quotes for this event, which is a real effect on the other side.
        description={
          declining
            ? `${declining.business_name} will be told you have gone another way, and any quote they have open for this event will be closed. Quotes you have already accepted are not affected.`
            : ''
        }
        confirmLabel="Pass on them"
        loading={setInterest.isPending}
        onCancel={() => setDeclining(null)}
        onConfirm={() =>
          declining &&
          run(
            () => setInterest.mutateAsync({ vendorId: declining.vendor_id, status: 'declined' }),
            () => setDeclining(null),
          )
        }
      />
    </>
  );
}
