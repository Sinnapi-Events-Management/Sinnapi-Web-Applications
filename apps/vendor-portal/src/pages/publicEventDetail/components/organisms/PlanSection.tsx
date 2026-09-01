import { Alert, SectionCard, Skeleton, Stack, Typography } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import ChecklistOutlinedIcon from '@mui/icons-material/ChecklistOutlined';
import type { VendorEventQuotationModel } from '@/lib/types';
import type { PlanLine } from '../../hooks/useEventPlan';
import { quoteStanding } from '../../schema';
import RequirementCard from '../molecules/RequirementCard';

type Props = {
  eventId: string;
  plan: {
    open: PlanLine[];
    filled: PlanLine[];
    isEmpty: boolean;
    isLoading: boolean;
    error: unknown;
  };
  /** This vendor's quotes, bucketed by the line each answers. */
  quotesByRequirement: Map<string, VendorEventQuotationModel[]>;
  actionable: boolean;
};

/**
 * What the client actually needs, line by line.
 *
 * Two groups, open first, because a vendor reading a plan is looking for work
 * they can take and a list that leads with taken lines buries the one they could
 * have quoted for. The taken ones stay rather than being filtered away: they are
 * what makes a two-line brief legible as part of a ten-line event, and a vendor
 * who cannot see them reads the plan as smaller than it is.
 *
 * Lines outside the vendor's trade are shown too, and for the same reason —
 * they are part of the event — but `useEventPlan` sorts them below the ones
 * that are theirs, and each carries a note instead of a button. Hiding them
 * would leave a photographer reading a wedding as a one-line job.
 *
 * Each line asks about ITS OWN standing — `quoteStanding` over just that line's
 * quotes — so a vendor holding an accepted quote for Decor still sees a live
 * "Quote for this" on Catering. Scoping it to the event instead would let one
 * quote silence every remaining opportunity on the page.
 *
 * A plan with no lines is not a broken event. A client may post a brief and
 * never break it down, and the whole event is then the ask — so the empty state
 * points back at the brief rather than reading as an error.
 */
export default function PlanSection({ eventId, plan, quotesByRequirement, actionable }: Props) {
  if (plan.error) {
    return (
      <Alert severity="error">
        {plan.error instanceof Error ? plan.error.message : 'Could not load this plan.'}
      </Alert>
    );
  }

  if (plan.isLoading) {
    return (
      <SectionCard title="What the client needs" icon={<ChecklistOutlinedIcon />}>
        <Stack spacing={2}>
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} variant="rounded" height={96} />
          ))}
        </Stack>
      </SectionCard>
    );
  }

  if (plan.isEmpty) {
    return (
      <EmptyState
        title="No itemised plan"
        description="The client has not broken this event into lines. Quote against the brief on the Overview tab."
      />
    );
  }

  return (
    <Stack spacing={3}>
      <SectionCard
        title="Still open"
        icon={<ChecklistOutlinedIcon />}
        subtitle="Lines nobody has been booked for yet"
      >
        {plan.open.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Every line on this plan has been booked. Nothing here is open to quote for.
          </Typography>
        ) : (
          <Stack spacing={2}>
            {plan.open.map((requirement) => (
              <RequirementCard
                key={requirement.id}
                requirement={requirement}
                eventId={eventId}
                standing={quoteStanding(quotesByRequirement.get(requirement.id) ?? [])}
                actionable={actionable}
              />
            ))}
          </Stack>
        )}
      </SectionCard>

      {plan.filled.length > 0 && (
        <SectionCard
          title="Already covered"
          icon={<ChecklistOutlinedIcon />}
          accent="primary"
          subtitle="Booked with another vendor — shown so you can see the whole event"
        >
          <Stack spacing={2}>
            {plan.filled.map((requirement) => (
              <RequirementCard
                key={requirement.id}
                requirement={requirement}
                eventId={eventId}
                standing={quoteStanding(quotesByRequirement.get(requirement.id) ?? [])}
                actionable={actionable}
              />
            ))}
          </Stack>
        </SectionCard>
      )}
    </Stack>
  );
}
