import { Box, Chip, Stack, Tooltip, Typography } from '@sinnapi/ui';
import type { PlanLine } from '../../hooks/useEventPlan';
import RequirementOpenChip from '../atoms/RequirementOpenChip';
import NotYourCategoryNote from '../atoms/NotYourCategoryNote';
import QuoteActionButton from './QuoteActionButton';
import { priorityLabel, type QuoteStanding } from '../../schema';

type Props = {
  requirement: PlanLine;
  eventId: string;
  /** Where this vendor stands on THIS line specifically. */
  standing: QuoteStanding;
  /** Client-posted events accept an expression of interest; admin ones don't. */
  actionable: boolean;
};

/**
 * One line of the client's plan, as a vendor may read it.
 *
 * WHAT IS NOT HERE IS THE POINT. The client's version of this card carries the
 * money: what they set aside for the line and how much of it is spoken for.
 * None of that crosses to this side — `list_event_requirements_public` does not
 * return `allocated_amount`, and it is a separate function from the client's
 * read precisely because the rule is column-level and RLS filters rows. A
 * vendor who can see what a client set aside prices to it rather than to the
 * work.
 *
 * What is left is what a vendor can act on: the category, the client's words,
 * whether the line is still open, and a button that quotes for THAT line rather
 * than the event as a whole. That last part is the reason the line-scoped
 * button exists at all — `open_event_quotation` keys on the requirement, so a
 * caterer who also does the cake ends up with two quotes instead of one that
 * silently moves between lines.
 *
 * THE BUTTON IS WITHHELD ON A LINE OUTSIDE THE VENDOR'S TRADE. A photographer
 * could once open a real quotation against a Makeup Artist line, and the client
 * got it in their inbox. `express_event_interest` now refuses that outright
 * (migration 0901l); `requirement.serves` is the browser's copy of the same
 * rule, so the refusal is a note here rather than an error after a tap.
 */
export default function RequirementCard({ requirement, eventId, standing, actionable }: Props) {
  const priority = priorityLabel(requirement.priority);
  const heading = requirement.title ?? requirement.category_name;

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        // A taken line stays legible but visibly out of reach. Opacity rather
        // than a grey fill, which in dark mode reads as raised rather than as
        // unavailable.
        opacity: requirement.is_open ? 1 : 0.7,
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'flex-start' }}
      >
        <Stack spacing={0.75} sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="subtitle1" fontWeight={700} sx={{ minWidth: 0 }}>
              {heading}
            </Typography>
            <RequirementOpenChip isOpen={requirement.is_open} />
            {priority && (
              <Tooltip title="The client marked this one optional — it may be cut if the budget tightens">
                <Chip size="small" variant="outlined" label={priority} />
              </Tooltip>
            )}
          </Stack>

          {/* Only when the client gave the line their own label — otherwise
              this repeats the heading directly under itself. */}
          {requirement.title && (
            <Typography variant="caption" color="text.secondary">
              {requirement.category_name}
            </Typography>
          )}

          {requirement.brief && (
            // `pre-wrap`: a brief carries the paragraphs the client typed, and
            // collapsing them turns a structured spec into a wall.
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
              {requirement.brief}
            </Typography>
          )}
        </Stack>

        {/* Three conditions, three different reasons. An admin brief has no
            client to reach; a booked line is one the server would refuse; and a
            line outside the vendor's categories is the bug this gate closes.
            Only the last one is worth explaining — the other two are already
            said by the event's "Inspiration only" chip and the line's "Taken"
            chip respectively. */}
        {actionable &&
          requirement.is_open &&
          (requirement.serves ? (
            <Box sx={{ flexShrink: 0 }}>
              <QuoteActionButton
                eventId={eventId}
                standing={standing}
                requirementId={requirement.id}
                interested={false}
                startLabel="Quote for this"
              />
            </Box>
          ) : (
            <NotYourCategoryNote categoryName={requirement.category_name} />
          ))}
      </Stack>
    </Box>
  );
}
