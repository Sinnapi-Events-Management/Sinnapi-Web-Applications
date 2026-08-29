'use client';
import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import EditNoteIcon from '@mui/icons-material/EditNote';
import BlockIcon from '@mui/icons-material/Block';
import { IconBadge, type AccentColor } from '../molecules/IconBadge';
import { quotationFeedbackCopy, type QuotationFeedback } from '../molecules/quotationFeedback';

export type QuotationFeedbackCalloutProps = {
  feedback: QuotationFeedback;
  /** Which side is reading — decides between "you asked" and "the client asked". */
  viewer: 'client' | 'vendor';
  /** How this portal renders a timestamp. Same injection `StatusTimeline` uses. */
  formatTimestamp: (value: string) => string;
  /**
   * Buttons for what to do about it — reply, rework, whatever the portal
   * offers. Rendered under the quote, full-width on a phone.
   */
  actions?: ReactNode;
};

const ICONS: Record<QuotationFeedback['kind'], ReactNode> = {
  'changes-requested': <EditNoteIcon />,
  declined: <BlockIcon />,
  ended: <BlockIcon />,
};

/**
 * What the other side said, said loudly.
 *
 * The one screen element on the quotation page that exists purely because
 * something was previously unfindable. The client's revision note lived only in
 * `quotation_status_history.reason`, rendered only by `StatusTimeline`, which
 * sits in the last tab — so a vendor opening a quote that says `revised` saw
 * the word and not one syllable of the sentence explaining it. The fix is not a
 * better trail; it is putting the sentence where the question is asked, which
 * is the top of the page.
 *
 * IT IS NOT AN `<Alert>`, and that is a considered choice. An Alert is a strip
 * of severity colour with a line of system copy in it, and this is neither: it
 * is a quotation of something a person wrote, which wants the visual grammar of
 * a quote — an attributed heading, the words themselves set apart, a timestamp.
 * Wrapping someone's sentence in an error bar also mis-tones it: a client
 * asking for catering to be itemised has not raised an incident.
 *
 * BOTH MODES, ONE DEFINITION. Every colour here is a palette token composited
 * with `alpha()`, so the tint is computed against whichever canvas the card
 * lands on — the pale gold light one and the warm dark one — rather than being
 * a hex value that happens to work on one of them. Nothing is defined only
 * inside a mode branch.
 *
 * Presentational only: `latestQuotationFeedback` decides whether there is
 * anything to say and `quotationFeedbackCopy` decides how to word it, both
 * shared, so the two portals cannot describe one event two ways.
 */
export function QuotationFeedbackCallout({
  feedback,
  viewer,
  formatTimestamp,
  actions,
}: QuotationFeedbackCalloutProps) {
  const copy = quotationFeedbackCopy(feedback, viewer);
  const accent = copy.severity as AccentColor;

  return (
    <Box
      // A region rather than an alert role: it is present on load and is not an
      // interruption, so it should be reachable by landmark navigation without
      // being announced over whatever the reader is doing.
      role="region"
      aria-label={copy.title}
      sx={{
        mb: 3,
        p: { xs: 2, sm: 2.5 },
        borderRadius: 3,
        border: 1,
        borderColor: (t) => alpha(t.palette[accent].main, 0.35),
        bgcolor: (t) => alpha(t.palette[accent].main, 0.07),
      }}
    >
      <Stack direction="row" spacing={{ xs: 1.5, sm: 2 }} alignItems="flex-start">
        <IconBadge accent={accent}>{ICONS[feedback.kind]}</IconBadge>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Wraps rather than truncates: on a narrow phone the timestamp drops
              under the heading instead of squeezing it to an ellipsis. */}
          <Stack
            direction="row"
            spacing={1}
            alignItems="baseline"
            useFlexGap
            flexWrap="wrap"
            sx={{ mb: 1 }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
              {copy.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatTimestamp(feedback.occurredAt)}
            </Typography>
          </Stack>

          {/* The words themselves, set as a quotation. The rule down the left
              is the only thing separating them from the copy around them, so a
              reader can tell what the client wrote from what we wrote. */}
          <Box
            component="blockquote"
            sx={{
              m: 0,
              pl: { xs: 1.5, sm: 2 },
              borderLeft: 3,
              borderColor: (t) => alpha(t.palette[accent].main, 0.5),
            }}
          >
            <Typography
              variant="body2"
              sx={{
                // Their line breaks are theirs; a note listing three changes on
                // three lines must not arrive as one paragraph.
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
                color: 'text.primary',
              }}
            >
              {feedback.reason}
            </Typography>
          </Box>

          {copy.hint && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 1.25 }}
            >
              {copy.hint}
            </Typography>
          )}

          {actions && (
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              useFlexGap
              flexWrap="wrap"
              sx={{ mt: 2, '& > *': { width: { xs: '100%', sm: 'auto' } } }}
            >
              {actions}
            </Stack>
          )}
        </Box>
      </Stack>
    </Box>
  );
}
