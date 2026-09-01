import { useState } from 'react';
import {
  Alert,
  Button,
  ConfirmDialog,
  Divider,
  QueryState,
  SectionCard,
  Skeleton,
  Stack,
  Typography,
} from '@sinnapi/ui';
import AddIcon from '@mui/icons-material/Add';
import ChecklistOutlinedIcon from '@mui/icons-material/ChecklistOutlined';
import { useRequirementMutations } from '@/hooks/queries';
import type { EventBudgetSummaryModel, EventRequirementModel } from '@/lib/types';
import AllocationSummary from '../molecules/AllocationSummary';
import RequirementCard from '../molecules/RequirementCard';
import RequirementFormDialog from './RequirementFormDialog';
import { useRequirements } from '../../hooks/useRequirements';
import { useRequirementEditor } from '../../hooks/useRequirementEditor';

type Props = {
  eventId: string;
  budget: EventBudgetSummaryModel | null;
  currency: string;
};

/**
 * The plan: what this event still needs, priced line by line.
 *
 * Owns the dialog and the two confirmations the cards trigger, so they live at
 * one stable level rather than one per card — twenty lines would otherwise mean
 * twenty mounted dialogs.
 *
 * Cancelled lines sit below a divider rather than being hidden. They keep the
 * quotes and bookings made against them, and those still count against the
 * budget: withdrawing a plan does not withdraw money already promised. A client
 * looking at a total they cannot account for is the failure this avoids.
 */
export default function RequirementsSection({ eventId, budget, currency }: Props) {
  const { live, cancelled, isEmpty, isLoading, error, unallocatedCount } = useRequirements(eventId);
  const editor = useRequirementEditor();
  const { cancel, remove } = useRequirementMutations(eventId);

  const [confirming, setConfirming] = useState<EventRequirementModel | null>(null);
  const [deleting, setDeleting] = useState<EventRequirementModel | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const runAction = async (fn: () => Promise<unknown>, done: () => void) => {
    setActionError(null);
    try {
      await fn();
      done();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'That did not work. Please try again.');
      done();
    }
  };

  return (
    <>
      <SectionCard
        title="Your plan"
        icon={<ChecklistOutlinedIcon />}
        subtitle="What this event needs, and what you have set aside for each part of it."
        action={
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={editor.add}>
            Add a line
          </Button>
        }
      >
        {actionError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
            {actionError}
          </Alert>
        )}

        <QueryState
          isLoading={isLoading}
          error={error}
          loadingFallback={
            <Stack spacing={2}>
              <Skeleton variant="rounded" height={64} />
              <Skeleton variant="rounded" height={112} />
              <Skeleton variant="rounded" height={112} />
            </Stack>
          }
        >
          {isEmpty ? (
            // Not an EmptyState card — this is already inside one. It names the
            // thing the client gets by adding a line, rather than restating
            // that the list is empty, which they can see.
            <Alert severity="info">
              Break your event into the services you need — catering, photography, decor — and set
              aside what you expect each to cost. We will keep a running total as you book vendors,
              and suggest vendors for the parts you have not filled.
            </Alert>
          ) : (
            <Stack spacing={2}>
              <AllocationSummary budget={budget} unallocatedCount={unallocatedCount} />

              {live.map((row) => (
                <RequirementCard
                  key={row.id}
                  row={row}
                  onEdit={editor.edit}
                  onCancel={setConfirming}
                  onRestore={(r) =>
                    runAction(
                      () => cancel.mutateAsync({ requirementId: r.id, cancelled: false }),
                      () => {},
                    )
                  }
                  onDelete={setDeleting}
                />
              ))}

              {cancelled.length > 0 && (
                <>
                  <Divider sx={{ pt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      No longer needed
                    </Typography>
                  </Divider>
                  {cancelled.map((row) => (
                    <RequirementCard
                      key={row.id}
                      row={row}
                      onEdit={editor.edit}
                      onCancel={setConfirming}
                      onRestore={(r) =>
                        runAction(
                          () => cancel.mutateAsync({ requirementId: r.id, cancelled: false }),
                          () => {},
                        )
                      }
                      onDelete={setDeleting}
                    />
                  ))}
                </>
              )}
            </Stack>
          )}
        </QueryState>
      </SectionCard>

      <RequirementFormDialog
        eventId={eventId}
        editing={editor.editing}
        currency={currency}
        open={editor.isOpen}
        onClose={editor.close}
      />

      <ConfirmDialog
        open={Boolean(confirming)}
        title="Take this off your plan?"
        // Says what survives, because that is the part a client cannot guess and
        // is the reason this is reversible rather than destructive.
        description={
          confirming
            ? `“${confirming.title ?? confirming.category_name}” stops counting towards what you have set aside, and we will stop suggesting vendors for it. Any quotes or bookings already on it stay exactly as they are, and you can put it back at any time.`
            : ''
        }
        confirmLabel="Take it off"
        loading={cancel.isPending}
        onCancel={() => setConfirming(null)}
        onConfirm={() =>
          confirming &&
          runAction(
            () => cancel.mutateAsync({ requirementId: confirming.id, cancelled: true }),
            () => setConfirming(null),
          )
        }
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this line?"
        description={
          deleting
            ? `“${deleting.title ?? deleting.category_name}” will be removed from your plan for good. Nothing is attached to it, so nothing else changes.`
            : ''
        }
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          runAction(
            () => remove.mutateAsync(deleting.id),
            () => setDeleting(null),
          )
        }
      />
    </>
  );
}
