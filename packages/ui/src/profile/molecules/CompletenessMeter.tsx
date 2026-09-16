'use client';
import { useState } from 'react';
import { Chip, LinearProgress, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddIcon from '@mui/icons-material/Add';
import type { CompletenessItem } from '../types';

export type CompletenessMeterProps = {
  items: CompletenessItem[];
  /** What is being completed, e.g. `Listing`. */
  subject: string;
  /** How many open items show before the rest fold behind a "+N more" chip. */
  collapsedCount?: number;
};

/**
 * A progress bar with the open items as one-tap shortcuts.
 *
 * The chips are the point: a bare percentage tells someone they are unfinished
 * without telling them what to do next. Each chip is phrased as the action and
 * jumps to the section where it's done. Only a few show at first so the meter
 * stays one line tall on a phone.
 */
export function CompletenessMeter({ items, subject, collapsedCount = 3 }: CompletenessMeterProps) {
  const [expanded, setExpanded] = useState(false);
  const done = items.filter((item) => item.done).length;
  const open = items.filter((item) => !item.done);
  const percent = items.length ? Math.round((done / items.length) * 100) : 100;
  const shown = expanded ? open : open.slice(0, collapsedCount);
  const hidden = open.length - shown.length;

  return (
    <Stack spacing={1.25}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, flexShrink: 0 }}>
          {subject} {percent}% complete
        </Typography>
        <LinearProgress
          variant="determinate"
          value={percent}
          color="secondary"
          aria-label={`${subject} completeness`}
          sx={{ flex: 1, height: 8, borderRadius: 4 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
          {done}/{items.length}
        </Typography>
      </Stack>

      {open.length === 0 ? (
        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ color: 'success.main' }}>
          <CheckCircleIcon fontSize="small" />
          <Typography variant="body2">Everything clients look for is filled in.</Typography>
        </Stack>
      ) : (
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          {shown.map((item) => (
            <Chip
              key={item.key}
              size="small"
              variant="outlined"
              icon={<AddIcon />}
              label={item.label}
              onClick={item.onSelect}
            />
          ))}
          {hidden > 0 && (
            <Chip size="small" label={`+${hidden} more`} onClick={() => setExpanded(true)} />
          )}
        </Stack>
      )}
    </Stack>
  );
}
