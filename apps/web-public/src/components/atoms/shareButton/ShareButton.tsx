'use client';

import { useState } from 'react';
import { Button, Tooltip } from '@sinnapi/ui/atoms';
import { type Theme } from '@sinnapi/ui/theme';
import { type SxProps } from '@sinnapi/ui/system';
import { Share, Check } from '@mui/icons-material';

type ShareButtonProps = {
  /** Title used by the native share sheet when available. */
  title: string;
  /** Visible button label (defaults to "Share"). */
  label?: string;
  /** Styling for the button — lets callers adapt it to dark/light surfaces. */
  sx?: SxProps<Theme>;
};

/**
 * Share control. Prefers the native Web Share sheet on supporting devices and
 * falls back to copying the current URL to the clipboard with brief "Copied"
 * feedback. Client-only by necessity (reads `window.location`, `navigator`),
 * but kept tiny so it can sit inside otherwise server-rendered headers.
 */
export default function ShareButton({ title, label = 'Share', sx }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // User dismissed the share sheet — nothing to do.
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — silently no-op.
    }
  }

  return (
    <Tooltip title={copied ? 'Link copied' : 'Share this event'}>
      <Button
        onClick={handleShare}
        startIcon={copied ? <Check /> : <Share />}
        variant="outlined"
        size="small"
        sx={sx}
      >
        {copied ? 'Copied' : label}
      </Button>
    </Tooltip>
  );
}
