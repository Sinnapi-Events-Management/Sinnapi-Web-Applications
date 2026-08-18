'use client';
import { Box, Switch, Typography } from '@sinnapi/ui/atoms';
import type { TopicKey } from '../data/topics';

type Props = {
  topicKey: TopicKey;
  label: string;
  description: string;
  subscribed: boolean;
  busy?: boolean;
  disabled?: boolean;
  onChange: (topic: TopicKey, subscribed: boolean) => void;
};

/**
 * One topic, on or off.
 *
 * A switch rather than a checkbox because the change is applied immediately —
 * there is no Save button on this page. Nobody who came here to stop receiving
 * something should have to find and press a second control to make it take
 * effect, and a preference centre with an unsaved state is a preference centre
 * that silently does nothing when the tab is closed.
 */
export default function TopicSwitch({
  topicKey,
  label,
  description,
  subscribed,
  busy,
  disabled,
  onChange,
}: Props) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 2,
        p: 2.5,
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {label}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {description}
        </Typography>
      </Box>
      <Switch
        checked={subscribed}
        disabled={busy || disabled}
        onChange={(e) => onChange(topicKey, e.target.checked)}
        inputProps={{ 'aria-label': label }}
      />
    </Box>
  );
}
