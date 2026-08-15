import { Alert, Box, Snackbar, Stack, Tab, Tabs, Skeleton } from '@sinnapi/ui';
import { useProfile } from '@/hooks/queries';
import { useNewsletterCampaign } from './hooks/useNewsletterCampaign';
import { COMPOSER_STEPS } from './schema';
import { AUDIENCE_META } from '@/pages/newsletters/schema';
import CampaignHeader from './components/organisms/CampaignHeader';
import CampaignDetailsForm from './components/organisms/CampaignDetailsForm';
import CampaignComposer from './components/organisms/CampaignComposer';
import CampaignPreviewDialog from './components/organisms/CampaignPreviewDialog';
import AudienceCounts from './components/organisms/AudienceCounts';
import AudiencePicker from './components/organisms/AudiencePicker';
import AudienceExtras from './components/organisms/AudienceExtras';
import CampaignReview from './components/organisms/CampaignReview';
import CampaignStats from './components/organisms/CampaignStats';

/**
 * The campaign composer.
 *
 * A thin shell: every piece of state and every write belongs to
 * `useNewsletterCampaign`, and each step is one organism. That split is what
 * keeps a screen with a WYSIWYG, a paginated multi-select, a spreadsheet
 * importer and an irreversible send button from becoming a single unreadable
 * component.
 */
export default function NewsletterDetail() {
  const api = useNewsletterCampaign();
  const { data: me } = useProfile();

  if (api.isLoading) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={72} />
        <Skeleton variant="rounded" height={340} />
      </Stack>
    );
  }

  if (api.loadError || !api.campaign) {
    return <Alert severity="error">{api.loadError ?? 'Campaign not found.'}</Alert>;
  }

  const { campaign, editable } = api;
  // Everything past `draft` is a record of what was sent, so the whole composer
  // becomes read-only rather than each control deciding for itself.
  const locked = !editable;

  return (
    <>
      <CampaignHeader
        campaign={campaign}
        dirty={api.dirty}
        busy={api.busy}
        editable={editable}
        onBack={api.back}
        onSave={() => void api.save()}
        onPreview={() => void api.preview()}
        onCancelSchedule={() => void api.cancel()}
      />

      {locked && (
        <Alert severity="info" sx={{ mb: 2 }}>
          This campaign has been {campaign.status === 'scheduled' ? 'scheduled' : 'sent'}, so its
          content and audience are fixed.
          {campaign.status === 'scheduled' &&
            ' Cancel the schedule to return it to a draft and keep editing.'}
        </Alert>
      )}

      {api.actionError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {api.actionError}
        </Alert>
      )}

      {api.statsEnabled && (
        <Box sx={{ mb: 3 }}>
          <CampaignStats stats={api.stats} />
        </Box>
      )}

      <Tabs
        value={api.step}
        onChange={(_, next) => api.setStep(next)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        {COMPOSER_STEPS.map((step) => (
          <Tab key={step.key} value={step.key} label={step.label} />
        ))}
      </Tabs>

      {api.step === 'compose' && (
        <Stack spacing={3}>
          <CampaignDetailsForm details={api.details} disabled={locked} onChange={api.setDetail} />
          <CampaignComposer blocks={api.blocks} disabled={locked} />
        </Stack>
      )}

      {api.step === 'audience' && (
        <Stack spacing={3}>
          <AudienceCounts
            counts={api.audience.counts}
            loading={api.audience.countsLoading}
            audienceLabel={AUDIENCE_META[campaign.audience].label}
          />
          <AudiencePicker api={api.audience} disabled={locked} />
          <AudienceExtras api={api.audience} disabled={locked} />
        </Stack>
      )}

      {api.step === 'review' && (
        <CampaignReview
          issues={api.issues}
          audienceCount={api.audience.totalSelected}
          canQueue={api.audience.canQueue && !locked}
          needsAttestation={api.audience.needsAttestation}
          attested={api.audience.attested}
          queueResult={api.queueResult}
          busy={api.busy}
          myEmail={me?.email ?? undefined}
          onQueue={() => void api.queueRecipients()}
          onSendTest={(email) => void api.sendTest(email)}
          onSchedule={(when) => void api.schedule(when)}
        />
      )}

      <CampaignPreviewDialog html={api.previewHtml} onClose={api.closePreview} />

      <Snackbar
        open={Boolean(api.notice)}
        message={api.notice ?? ''}
        autoHideDuration={5000}
        onClose={api.dismissNotice}
      />
    </>
  );
}
