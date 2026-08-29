'use client';
import type { ReactNode } from 'react';
import { Box, Paper, Typography } from '@mui/material';

/**
 * The reading column: how wide the conversation itself is allowed to get,
 * whatever the card around it is doing.
 *
 * 760px is where the major chat surfaces have converged (Claude, ChatGPT,
 * Perplexity all cap their stream between roughly 720 and 768), and it is the
 * same number readability research keeps landing on from the other direction —
 * about 65–75 characters at body size, the widest measure the eye can sweep
 * back across without losing its line.
 */
export const THREAD_COLUMN_PX = 760;

/** Card padding, in px, doubled — the card is the column plus its own gutters. */
const CARD_PAD_PX = 32;

/** Height bounds for an embedded thread. See the note on geometry below. */
export const THREAD_MIN_HEIGHT_PX = 420;
export const THREAD_MAX_HEIGHT_PX = 620;

export type EmbeddedThreadSurfaceProps = {
  /** Usually a `<ThreadPanel />`, or the empty state standing in for one. */
  children: ReactNode;
  /**
   * A sentence above the surface saying what this thread is. Worth spending a
   * line on: a thread rendered on a quotation page reads as *that quote's*
   * thread, and it is not one — see the note below.
   */
  caption?: ReactNode;
  /**
   * Vertical space the page chrome above this already takes. The surface sizes
   * itself against the viewport rather than its content, so the composer stays
   * put; this is how it knows where the viewport effectively starts.
   */
  offsetPx?: { xs: number; md: number };
  /** Escape hatch for a host that genuinely wants the full card width. */
  columnPx?: number | false;
};

/**
 * A conversation rendered inside a page that is about something else.
 *
 * `ThreadPanel` is built for `InboxLayout`'s detail column: it fills its parent
 * (`height: 100%`) and pins its composer, which needs the parent to have an
 * actual height. Dropped into a tab panel that grows with its content, it
 * collapses to nothing. This is the bounded box it needs, extracted rather than
 * written twice — the client and vendor quotation pages both embed a thread,
 * and a composer that scrolls away on one of them is the bug this prevents.
 *
 * WHY IT IS SIZED AGAINST THE VIEWPORT, AND WHY THAT IS NOW CLAMPED
 * A chat pane with `height: auto` grows until the page scrolls, at which point
 * there are two scrollers — the page and the message list — and the reader gets
 * whichever one their thumb happens to be over. Fixing the height to the
 * viewport gives the thread one scroller and keeps the composer where the
 * reader left it, which is what a chat surface has to do.
 *
 * Unclamped, though, that same rule hands a 1440p monitor a 1000px pane holding
 * three messages, and the reader spends the tab staring at emptiness with the
 * composer stranded at the bottom of it. `clamp()` keeps the single-scroller
 * behaviour while bounding both ends: the floor stops it degenerating on a
 * short landscape phone, the ceiling stops it turning into a void on a tall
 * desktop.
 *
 * WHY THE CARD ITSELF IS CAPPED, NOT JUST ITS CONTENTS
 * Untouched, the card is as wide as the page column it sits in — on a desktop
 * detail page that can be 1900px. A thread poured into that width anchors one
 * speaker to the far left and the other to the far right, so following a
 * two-line exchange means sweeping the eye across the whole monitor and back,
 * and every bubble runs to a line length no one can track.
 *
 * Capping only the *contents* fixes the sweep but produces its own problem: an
 * outlined card three times wider than anything inside it, with the
 * conversation apparently floating in the middle of an empty box. The border is
 * a frame, and a frame has to touch what it frames. So the cap goes on the card
 * — column plus its own gutters — and the flanking whitespace becomes page,
 * where whitespace costs nothing. The header, the messages and the composer all
 * inherit the same axis because they are all inside it.
 */
export function EmbeddedThreadSurface({
  children,
  caption,
  offsetPx = { xs: 300, md: 320 },
  columnPx = THREAD_COLUMN_PX,
}: EmbeddedThreadSurfaceProps) {
  const cardMaxWidth = columnPx ? columnPx + CARD_PAD_PX : 'none';

  return (
    // Deliberately a block, not a Stack. Stack lays out its own gaps by
    // emitting `margin: 0` on every child after the first, which silently ate
    // the `mx: auto` this needs and left the whole surface stuck to the left
    // of the page. Centring with `alignSelf` instead works, but only by
    // un-stretching the item, which then leaves its `width: 100%` resolving
    // against a container with no definite width — a footgun to leave behind
    // in a component three portals embed. Block layout needs neither trick:
    // `width: auto` fills the parent, `max-width` caps it, and
    // `margin-inline: auto` centres what is left.
    <Box sx={{ minWidth: 0 }}>
      {caption && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: 'block',
            px: 0.5,
            mb: 1.5,
            // Tracks the card so the caption reads as this thread's label
            // rather than the page's.
            maxWidth: cardMaxWidth,
            mx: 'auto',
          }}
        >
          {caption}
        </Typography>
      )}

      <Paper
        variant="outlined"
        sx={{
          borderRadius: 3,
          p: { xs: 1.5, sm: 2 },
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          maxWidth: cardMaxWidth,
          mx: 'auto',
          height: {
            xs: `clamp(${THREAD_MIN_HEIGHT_PX}px, calc(100vh - ${offsetPx.xs}px), ${THREAD_MAX_HEIGHT_PX}px)`,
            md: `clamp(${THREAD_MIN_HEIGHT_PX}px, calc(100vh - ${offsetPx.md}px), ${THREAD_MAX_HEIGHT_PX}px)`,
          },
          // Long words and pasted URLs in a bubble must wrap rather than push
          // the card past the viewport — this panel sits in a page column, not
          // in the inbox's own overflow-hidden track.
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', width: '100%' }}
        >
          {children}
        </Box>
      </Paper>
    </Box>
  );
}
