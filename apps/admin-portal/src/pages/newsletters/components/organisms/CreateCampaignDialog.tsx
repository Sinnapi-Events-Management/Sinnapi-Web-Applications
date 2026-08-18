import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  TextField,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
} from '@sinnapi/ui';
import { AUDIENCE_META, NEWSLETTER_AUDIENCES } from '../../schema';
import type { NewsletterAudience } from '@/lib/types';

type Props = {
  open: boolean;
  saving: boolean;
  onCancel: () => void;
  onCreate: (next: { title: string; subject: string; audience: NewsletterAudience }) => void;
};

/**
 * The three decisions that have to exist before a campaign can exist at all.
 *
 * Audience is here rather than in the composer because it is the one field that
 * cannot be changed later without invalidating everything downstream — it
 * decides which consent topic the send is checked against, so an audience
 * switched after recipients were queued would mail people against the wrong
 * permission. Asking for it up front is what makes it safe to treat as fixed.
 */
export default function CreateCampaignDialog({ open, saving, onCancel, onCreate }: Props) {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [audience, setAudience] = useState<NewsletterAudience>('clients');

  const valid = title.trim().length >= 2 && subject.trim().length >= 2;

  const submit = () => {
    if (!valid || saving) return;
    onCreate({ title: title.trim(), subject: subject.trim(), audience });
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>New campaign</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField
            label="Campaign name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            helperText="Internal only — how you'll find this campaign later."
            autoFocus
            fullWidth
          />
          <TextField
            label="Subject line"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            helperText="What recipients see in their inbox. You can change this later."
            fullWidth
          />
          <div>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Audience
            </Typography>
            <ToggleButtonGroup
              exclusive
              fullWidth
              value={audience}
              onChange={(_, next) => next && setAudience(next as NewsletterAudience)}
            >
              {NEWSLETTER_AUDIENCES.map((key) => (
                <ToggleButton key={key} value={key}>
                  {AUDIENCE_META[key].label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {AUDIENCE_META[audience].description} This cannot be changed once the campaign is
              created — it decides which consent the send is checked against.
            </Typography>
          </div>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="text" color="inherit" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={!valid || saving}>
          {saving ? 'Creating…' : 'Create draft'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
