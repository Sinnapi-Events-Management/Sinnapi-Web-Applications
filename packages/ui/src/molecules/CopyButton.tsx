'use client';
import { useEffect, useState } from 'react';
import { Button, IconButton, Tooltip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';

export type CopyButtonProps = {
  /** The text put on the clipboard, e.g. a booking code. */
  value: string;
  /** What is being copied, for the accessible name: "booking code". */
  label: string;
  /** `icon` is a 40px icon button; `text` shows "Copy" / "Copied". */
  variant?: 'icon' | 'text';
  size?: 'small' | 'medium';
};

/**
 * Writes text to the clipboard, falling back to a hidden text area for older
 * Android browsers and non-secure pages where `navigator.clipboard` is absent.
 */
export async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const area = document.createElement('textarea');
    area.value = value;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/**
 * One-tap copy for a code a person reads out or pastes elsewhere — a booking
 * code into WhatsApp, a reference into a bank app. Shows a tick and "Copied"
 * for two seconds so the tap is visibly confirmed (added 2026-11-18).
 */
export function CopyButton({ value, label, variant = 'icon', size = 'small' }: CopyButtonProps) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    if (state === 'idle') return;
    const t = window.setTimeout(() => setState('idle'), 2000);
    return () => window.clearTimeout(t);
  }, [state]);

  const onCopy = async () => setState((await copyText(value)) ? 'copied' : 'failed');
  const tip =
    state === 'copied' ? 'Copied' : state === 'failed' ? 'Could not copy' : `Copy ${label}`;
  const icon =
    state === 'copied' ? (
      <CheckIcon fontSize="small" color="success" />
    ) : (
      <ContentCopyIcon fontSize="small" />
    );

  if (variant === 'text') {
    return (
      <Button
        size={size}
        startIcon={icon}
        onClick={() => void onCopy()}
        aria-label={`Copy ${label}`}
        sx={{ minHeight: 36, textTransform: 'none' }}
      >
        {state === 'copied' ? 'Copied' : 'Copy'}
      </Button>
    );
  }

  return (
    <Tooltip title={tip} open={state !== 'idle' ? true : undefined} arrow>
      <IconButton
        size={size}
        onClick={() => void onCopy()}
        aria-label={`Copy ${label}`}
        sx={{ width: 40, height: 40 }}
      >
        {icon}
      </IconButton>
    </Tooltip>
  );
}
