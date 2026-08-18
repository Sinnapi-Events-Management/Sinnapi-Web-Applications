import { Alert, Box, Tab, Tabs, Toast } from '@sinnapi/ui';
import { useProfile } from '@/hooks/queries';
import { useNewsletterCampaign } from './hooks/useNewsletterCampaign';
import { COMPOSER_STEPS } from './schema';
import CampaignHeader from './components/organisms/CampaignHeader';
import CampaignStepPanel from './components/organisms/CampaignStepPanel';
import CampaignPreviewDialog from './components/organisms/CampaignPreviewDialog';
import CampaignStats from './components/organisms/CampaignStats';
import CampaignLockNotice from './components/molecules/CampaignLockNotice';
import CampaignSkeleton from './components/molecules/CampaignSkeleton';

/**
 * The campaign composer.
 *
 * A thin shell: every piece of state and every write belongs to
 * `useNewsletterCampaign`, and each step is one organism. That split is what
 * keeps a screen with a WYSIWYG, a paginated multi-select, a spreadsheet
 * importer and an irreversible send button from becoming a single unreadable
 * component.
 *
 * ── Two places the screen speaks ──────────────────────────────────────────
 * A failure is a banner: it sits above the tabs until the operator does
 * something about it. Everything else is a `Toast` — the same severity-coloured
 * bar the rest of the console uses, rather than MUI's default black slab.
 */
export default function NewsletterDetail() {
  const api = useNewsletterCampaign();
  const { data: me } = useProfile();

  if (api.isLoading) return <CampaignSkeleton />;

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

      <CampaignLockNotice status={campaign.status} />

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

      <CampaignStepPanel api={api} locked={locked} myEmail={me?.email ?? undefined} />

      <CampaignPreviewDialog html={api.previewHtml} onClose={api.closePreview} />

      <Toast toast={api.notice} onClose={api.dismissNotice} />
    </>
  );
}
