import { Link as RouterLink } from 'react-router-dom';
import { Button, Stack } from '@sinnapi/ui';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

type Props = {
  conversationId: string;
};

/**
 * The way out of an embedded thread and into the full inbox.
 *
 * Kept quiet and to the trailing edge: it is an escape hatch, not the action
 * this tab is for. It stays available because the thread shown here is the same
 * `conversations` row the inbox shows, and someone who wants the wider view —
 * search, attachments, the other threads — should not have to work out for
 * themselves that it exists elsewhere.
 */
export default function OpenInInboxLink({ conversationId }: Props) {
  return (
    <Stack direction="row" justifyContent="flex-end">
      <Button
        size="small"
        variant="text"
        color="inherit"
        endIcon={<OpenInNewIcon />}
        component={RouterLink}
        to={`/messages/${conversationId}`}
      >
        Open in inbox
      </Button>
    </Stack>
  );
}
