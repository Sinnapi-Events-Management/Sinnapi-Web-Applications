import { Grid, TextField, SectionCard } from '@sinnapi/ui';

type Props = {
  details: { title: string; subject: string; preheader: string };
  disabled?: boolean;
  onChange: (key: 'title' | 'subject' | 'preheader', value: string) => void;
};

/** Subject line, inbox preview text, and the internal name. */
export default function CampaignDetailsForm({ details, disabled, onChange }: Props) {
  return (
    <SectionCard title="Message details">
      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <TextField
            fullWidth
            size="small"
            label="Campaign name"
            value={details.title}
            disabled={disabled}
            onChange={(e) => onChange('title', e.target.value)}
            helperText="Internal only — never sent."
          />
        </Grid>
        <Grid item xs={12} md={7}>
          <TextField
            fullWidth
            size="small"
            label="Subject line"
            required
            value={details.subject}
            disabled={disabled}
            onChange={(e) => onChange('subject', e.target.value)}
            helperText={`${details.subject.length} characters — around 45 stay visible on mobile.`}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            size="small"
            label="Preview text"
            value={details.preheader}
            disabled={disabled}
            onChange={(e) => onChange('preheader', e.target.value)}
            // Left empty, mail clients pull the first words of the body into the
            // inbox preview instead. That is how "View in browser" ends up as
            // the summary line on so much bulk mail.
            helperText="The line shown beside the subject in the inbox. Leave it blank and the client picks its own."
          />
        </Grid>
      </Grid>
    </SectionCard>
  );
}
