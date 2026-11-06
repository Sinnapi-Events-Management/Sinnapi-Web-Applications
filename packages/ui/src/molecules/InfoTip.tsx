'use client';
import { useState, type ReactNode } from 'react';
import { ClickAwayListener, IconButton, Tooltip } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

export type InfoTipProps = {
  /** The explanation, in a sentence or two of plain words. */
  title: ReactNode;
  /** Screen-reader name for the button, e.g. "What is escrow?". */
  label: string;
  size?: 'small' | 'medium';
};

/**
 * A small ⓘ that explains a word in place. Opens on tap, not only on hover —
 * a phone has no hover, and a hover-only tooltip is invisible to exactly the
 * people who most need the explanation. Tapping anywhere else closes it.
 */
export function InfoTip({ title, label, size = 'small' }: InfoTipProps) {
  const [open, setOpen] = useState(false);

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <span>
        <Tooltip
          title={title}
          arrow
          open={open}
          onOpen={() => setOpen(true)}
          onClose={() => setOpen(false)}
          disableTouchListener
          slotProps={{ tooltip: { sx: { fontSize: '0.8125rem', lineHeight: 1.5, p: 1.25 } } }}
        >
          <IconButton
            size={size}
            aria-label={label}
            onClick={() => setOpen((v) => !v)}
            sx={{ color: 'text.secondary', p: 0.75 }}
          >
            <InfoOutlinedIcon fontSize={size === 'small' ? 'small' : 'medium'} />
          </IconButton>
        </Tooltip>
      </span>
    </ClickAwayListener>
  );
}
