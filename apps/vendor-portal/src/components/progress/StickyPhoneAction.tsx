import type { ReactNode } from 'react';
import { Paper } from '@sinnapi/ui';
import { aboveBottomNav } from '@sinnapi/ui/router';

/** Phones only: the page's main action, pinned just above the bottom bar. */
export default function StickyPhoneAction({
  show,
  children,
}: {
  show: boolean;
  children: ReactNode;
}) {
  if (!show) return null;
  return (
    <Paper
      elevation={8}
      sx={{
        display: { xs: 'block', md: 'none' },
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: aboveBottomNav(12),
        zIndex: (t) => t.zIndex.appBar - 1,
        p: 1,
        borderRadius: 3,
      }}
    >
      {children}
    </Paper>
  );
}
